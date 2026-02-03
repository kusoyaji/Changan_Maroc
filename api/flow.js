const crypto = require('crypto');
const { initializeDatabase, saveSurveyResponse } = require('./db/postgres');
const { getPhoneNumberFromChatwoot } = require('./chatwoot');

let dbInitialized = false;

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
        
        // CRITICAL: Fetch phone number from Chatwoot using flow_token
        let phoneNumber = null;
        try {
          console.log('🔍 Fetching phone number from Chatwoot...');
          phoneNumber = await getPhoneNumberFromChatwoot(flow_token);
          
          if (phoneNumber) {
            console.log(`✅ Phone number retrieved: ${phoneNumber}`);
          } else {
            console.log('⚠️  Could not retrieve phone number from Chatwoot');
          }
        } catch (chatwootError) {
          console.error('❌ Chatwoot API error:', chatwootError.message);
        }
        
        // Save to database (with or without phone number)
        try {
          const savedResponse = await saveSurveyResponse(flow_token, data, phoneNumber);
          console.log('✅ Saved to database:', savedResponse);
          console.log('Database ID:', savedResponse.id);
          console.log('Phone Number:', savedResponse.phone_number || phoneNumber || 'NOT AVAILABLE');
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
