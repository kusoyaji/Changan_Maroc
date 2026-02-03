/**
 * WhatsApp Message Webhook - Captures phone numbers from message events
 * 
 * This endpoint receives WhatsApp message events that contain user phone numbers.
 * It links them to existing Flow submissions using flow_token as the key.
 * 
 * Expected to be called by Chatwoot's webhook forwarding system.
 */

const { updatePhoneNumber } = require('./db/postgres');

module.exports = async (req, res) => {
  console.log('========================================');
  console.log('Message webhook received:', req.method);
  
  // Handle webhook verification (Meta requirement)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'changan_verify_token_2026';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  // Handle incoming webhook events
  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('Webhook body:', JSON.stringify(body, null, 2));

      // WhatsApp webhook structure:
      // body.entry[].changes[].value.messages[]
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            
            // Extract messages
            const messages = value.messages || [];
            for (const message of messages) {
              const phoneNumber = message.from; // User's phone number
              const messageText = message.text?.body || '';
              const messageType = message.type;
              
              console.log(`Message from: ${phoneNumber}`);
              console.log(`Message type: ${messageType}`);
              console.log(`Message text: ${messageText}`);
              
              // Look for flow_token in the message
              // Expected format: "FLOW_CONFIRMED:{flow_token}"
              if (messageText.startsWith('FLOW_CONFIRMED:')) {
                const flowToken = messageText.replace('FLOW_CONFIRMED:', '').trim();
                
                console.log(`Linking flow_token ${flowToken} to phone ${phoneNumber}`);
                
                try {
                  const result = await updatePhoneNumber(flowToken, phoneNumber);
                  
                  if (result.updated) {
                    console.log(`✅ Successfully linked phone number to flow submission`);
                  } else {
                    console.log(`⚠️  No matching flow submission found for token: ${flowToken}`);
                  }
                } catch (dbError) {
                  console.error('Database error:', dbError);
                }
              }
              
              // Alternative: Check for interactive messages (button responses)
              if (message.interactive?.type === 'button_reply') {
                const buttonId = message.interactive.button_reply.id;
                
                // If button ID contains flow_token (e.g., "confirm_ABCDEF123")
                if (buttonId.startsWith('confirm_')) {
                  const flowToken = buttonId.replace('confirm_', '');
                  
                  console.log(`Button response - linking flow_token ${flowToken} to phone ${phoneNumber}`);
                  
                  try {
                    const result = await updatePhoneNumber(flowToken, phoneNumber);
                    
                    if (result.updated) {
                      console.log(`✅ Successfully linked phone number via button response`);
                    }
                  } catch (dbError) {
                    console.error('Database error:', dbError);
                  }
                }
              }
            }
            
            // Extract statuses (optional - for tracking message delivery)
            const statuses = value.statuses || [];
            for (const status of statuses) {
              console.log(`Message status: ${status.status} for ${status.recipient_id}`);
            }
          }
        }
        
        return res.status(200).json({ status: 'received' });
      }
      
      // Non-WhatsApp webhook
      return res.status(400).json({ error: 'Not a WhatsApp webhook event' });
      
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
