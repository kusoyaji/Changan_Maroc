/**
 * Send Confirmation Message API
 * 
 * This endpoint sends a WhatsApp message after Flow completion
 * The message includes the flow_token, allowing us to link phone number to the submission
 * 
 * Called by the Flow webhook after successful data_exchange
 */

module.exports = async (req, res) => {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return res.status(500).json({ 
      error: 'Missing WhatsApp credentials',
      details: 'Set WHATSAPP_ACCESS_TOKEN and PHONE_NUMBER_ID in environment variables'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phoneNumber, flowToken, customerName } = req.body;
    
    if (!phoneNumber || !flowToken) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['phoneNumber', 'flowToken']
      });
    }
    
    // Format phone number (remove + if present)
    const formattedPhone = phoneNumber.replace('+', '');
    
    // Send WhatsApp message
    const messageUrl = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    
    const messagePayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: `FLOW_CONFIRMED:${flowToken}`
      }
    };
    
    console.log('Sending confirmation message to:', formattedPhone);
    console.log('Flow token:', flowToken);
    
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
      console.log('✅ Confirmation message sent successfully');
      return res.status(200).json({ 
        success: true,
        messageId: result.messages?.[0]?.id,
        flowToken
      });
    } else {
      console.error('❌ Failed to send message:', result);
      return res.status(500).json({ 
        error: 'Failed to send message',
        details: result
      });
    }
    
  } catch (error) {
    console.error('Error sending confirmation:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
};
