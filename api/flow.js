const crypto = require('crypto');
const { initializeDatabase, saveSurveyResponse } = require('./db/postgres');
const { getPhoneNumberFromChatwoot, searchChatwootContactByPhone } = require('./chatwoot');

let dbInitialized = false;

/**
 * Get phone number and customer name from Chatwoot conversation mapping
 * This is populated by the Chatwoot webhook when messages are created
 * IMPROVED: Also fetches customer name from Chatwoot contact database
 */
async function getPhoneFromChatwootConversation(flowToken) {
  const { neon } = require('@neondatabase/serverless');
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  
  if (!sql) return null;
  
  try {
    // Look for recent conversations (last 5 minutes) with phone numbers
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const result = await sql`
      SELECT phone_number, customer_name, created_at
      FROM chatwoot_conversation_mapping
      WHERE created_at >= ${fiveMinutesAgo}
        AND used = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const phoneNumber = result[0].phone_number;
      let customerName = result[0].customer_name;
      
      // If no name in mapping, try fetching from Chatwoot contact database
      if (!customerName && phoneNumber) {
        console.log('🔍 No name in mapping, searching Chatwoot contacts...');
        const contact = await searchChatwootContactByPhone(phoneNumber);
        if (contact && contact.name) {
          console.log(`✅ Found name in Chatwoot contacts: ${contact.name}`);
          customerName = contact.name;
        }
      }
      
      // Mark as used
      await sql`
        UPDATE chatwoot_conversation_mapping
        SET used = TRUE
        WHERE phone_number = ${phoneNumber}
          AND created_at = ${result[0].created_at}
      `;
      
      return {
        phone_number: phoneNumber,
        customer_name: customerName
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting phone from Chatwoot conversation:', error);
    return null;
  }
}

function decryptRequest(encryptedBody, privateKey, passphrase = '') {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = encryptedBody;
  
  // Decrypt AES key using RSA private key
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      passphrase: passphrase,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  // Decrypt flow data using AES-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const initialVectorBuffer = Buffer.from(initial_vector, 'base64');
  const TAG_LENGTH = 16;
  
  const encryptedFlowDataBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encryptedFlowDataTag = flowDataBuffer.subarray(-TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(
    'aes-128-gcm',
    decryptedAesKey,
    initialVectorBuffer
  );
  decipher.setAuthTag(encryptedFlowDataTag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encryptedFlowDataBody),
    decipher.final(),
  ]).toString('utf-8');

  const decryptedData = JSON.parse(decryptedJSONString);
  
  // CRITICAL: Return tuple with aesKey and iv for response encryption
  return { decryptedData, aesKey: decryptedAesKey, iv: initialVectorBuffer };
}

function encryptResponse(response, aesKey, iv) {
  // CRITICAL: Flip IV bits using bitwise NOT operator
  const flippedIv = Buffer.from(iv).map(b => ~b);
  
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), 'utf-8'),
    cipher.final(),
  ]);
  return Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64');
}

module.exports = async (req, res) => {
  console.log('========================================');
  console.log('Incoming request:', req.method);
  
  // Initialize database on first request
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }

  if (req.method === 'GET') {
    return res.status(200).send('Webhook is running');
  }

  if (req.method === 'POST') {
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      console.error('PRIVATE_KEY not found in environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      const { decryptedData, aesKey, iv } = decryptRequest(req.body, privateKey, '');
      console.log('Decrypted request:', JSON.stringify(decryptedData, null, 2));

      const { action, flow_token, data, version } = decryptedData;

      if (action === 'ping') {
        console.log('Ping received');
        const response = { version, data: { status: 'active' } };
        const encryptedResponse = encryptResponse(response, aesKey, iv);
        
        // CRITICAL: Return raw Base64 string, NOT JSON-wrapped
        console.log('Encrypted response length:', encryptedResponse.length);
        return res.status(200).send(encryptedResponse);
      }

      if (action === 'data_exchange') {
        console.log('Data exchange - Survey data received');
        console.log('Flow Token:', flow_token);
        
        // MULTI-STRATEGY PHONE NUMBER AND NAME CAPTURE (Guaranteed!)
        let phoneNumber = null;
        let customerName = null;
        
        // Strategy 1: From flow_token mapping (when sent via /api/send-flow)
        try {
          const { getPhoneFromToken } = require('./db/postgres');
          const tokenData = await getPhoneFromToken(flow_token);
          if (tokenData) {
            phoneNumber = tokenData.phone_number;
            customerName = tokenData.customer_name;
            console.log(`✅ Strategy 1 - From flow_token: ${phoneNumber} (${customerName || 'No name'})`);
          }
        } catch (error) {
          console.log('⚠️  Strategy 1 failed:', error.message);
        }
        
        // Strategy 2: From Chatwoot conversation mapping (Chatwoot webhook)
        if (!phoneNumber) {
          try {
            const conversationData = await getPhoneFromChatwootConversation(flow_token);
            if (conversationData) {
              phoneNumber = conversationData.phone_number;
              customerName = customerName || conversationData.customer_name;
              console.log(`✅ Strategy 2 - From Chatwoot conversation: ${phoneNumber} (${customerName || 'No name'})`);
            }
          } catch (error) {
            console.log('⚠️  Strategy 2 failed:', error.message);
          }
        }
        
        // Strategy 3: From Chatwoot API search (fallback)
        if (!phoneNumber) {
          try {
            console.log('🔍 Strategy 3 - Searching Chatwoot API...');
            phoneNumber = await getPhoneNumberFromChatwoot(flow_token);
            if (phoneNumber) {
              console.log(`✅ Strategy 3 - From Chatwoot API: ${phoneNumber}`);
            } else {
              console.log('⚠️  Strategy 3 - Could not retrieve phone from Chatwoot');
            }
          } catch (chatwootError) {
            console.error('❌ Strategy 3 failed:', chatwootError.message);
          }
        }
        
        // CRITICAL: If we have phone but no name, search Chatwoot contacts
        if (phoneNumber && !customerName) {
          try {
            console.log('🔍 No name yet, searching Chatwoot contacts database...');
            const { searchChatwootContactByPhone } = require('./chatwoot');
            const contact = await searchChatwootContactByPhone(phoneNumber);
            if (contact && contact.name) {
              customerName = contact.name;
              console.log(`✅ Found name in Chatwoot: ${customerName}`);
            } else {
              console.log('⚠️  No name found in Chatwoot contacts');
            }
          } catch (error) {
            console.error('❌ Chatwoot contact search failed:', error.message);
          }
        }
        
        if (phoneNumber) {
          console.log(`📞 FINAL: ${phoneNumber} (${customerName || 'No name'})`);
        } else {
          console.log('⚠️  WARNING: No phone number captured! Check Chatwoot webhook.');
        }
        
        // Save to database (with or without phone number and customer name)
        try {
          const savedResponse = await saveSurveyResponse(flow_token, data, phoneNumber, customerName);
          console.log('✅ Saved to database:', savedResponse);
          console.log('Database ID:', savedResponse.id);
          console.log('Phone Number:', savedResponse.phone_number || 'NOT AVAILABLE');
          console.log('Customer Name:', savedResponse.customer_name || 'NOT AVAILABLE');
        } catch (dbError) {
          console.error('❌ Database save error:', dbError);
          // Continue to send response even if DB save fails
        }

        const response = {
          version,
          screen: 'SUCCESS_SCREEN',
          data: {
            confirmation_message: 'Merci pour votre retour ! Votre avis compte beaucoup pour nous.'
          }
        };

        const encryptedResponse = encryptResponse(response, aesKey, iv);
        
        // CRITICAL: Return raw Base64 string, NOT JSON-wrapped
        console.log('Data exchange encrypted response length:', encryptedResponse.length);
        return res.status(200).send(encryptedResponse);
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Error processing request:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
