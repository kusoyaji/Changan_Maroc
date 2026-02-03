/**
 * Send Flow API - Sends WhatsApp Flow and stores phone number
 * 
 * This is the CORRECT way to capture phone numbers with WhatsApp Flows:
 * 1. When sending the Flow, store phone_number + flow_token mapping
 * 2. When receiving Flow response, link data to phone using flow_token
 * 
 * Usage: POST /api/send-flow
 * Body: { "phoneNumber": "+212XXXXXXXXX", "customerName": "Optional" }
 */

const { storeFlowToken } = require('./db/postgres');

module.exports = async (req, res) => {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  const FLOW_ID = process.env.FLOW_ID;
  
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !FLOW_ID) {
    return res.status(500).json({ 
      error: 'Missing configuration',
      details: 'Set WHATSAPP_ACCESS_TOKEN, PHONE_NUMBER_ID, and FLOW_ID in environment variables'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phoneNumber, customerName } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing phone number',
        example: { phoneNumber: '+212XXXXXXXXX', customerName: 'Ahmed' }
      });
    }
    
    // Generate unique flow_token
    const crypto = require('crypto');
    const flowToken = `flow_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Format phone number (remove + if present, Meta expects without +)
    const formattedPhone = phoneNumber.replace('+', '');
    
    // Store the flow_token -> phone_number mapping BEFORE sending
    await storeFlowToken(flowToken, phoneNumber);
    console.log(`✅ Stored flow token mapping: ${flowToken} -> ${phoneNumber}`);
    
    // Send WhatsApp Flow
    const messageUrl = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    
    const messagePayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: {
          type: 'text',
          text: 'Changan Maroc - Enquête de Satisfaction'
        },
        body: {
          text: customerName 
            ? `Bonjour ${customerName} ! Nous aimerions avoir votre avis sur votre expérience.`
            : 'Bonjour ! Nous aimerions avoir votre avis sur votre expérience.'
        },
        footer: {
          text: 'Prend 2 minutes'
        },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: flowToken,
            flow_id: FLOW_ID,
            flow_cta: "Commencer l'enquête",
            flow_action: 'navigate',
            flow_action_payload: {
              screen: 'QUESTION_ONE'
            }
          }
        }
      }
    };
    
    console.log(`Sending Flow to: ${phoneNumber}`);
    console.log(`Flow token: ${flowToken}`);
    
    const response = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Flow sent successfully');
      return res.status(200).json({ 
        success: true,
        messageId: result.messages?.[0]?.id,
        flowToken,
        phoneNumber,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Failed to send Flow:', result);
      return res.status(500).json({ 
        error: 'Failed to send Flow',
        details: result
      });
    }
    
  } catch (error) {
    console.error('Error sending Flow:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
};
