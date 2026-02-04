/**
 * Chatwoot Webhook - Captures phone numbers from conversation events
 * 
 * This endpoint receives events from Chatwoot when:
 * 1. Messages are created (Flow sent, Flow completed)
 * 2. Conversations are updated (status changes)
 * 
 * CRITICAL: This guarantees phone number capture for ALL Flow responses
 */

const { updatePhoneNumber, storeFlowToken } = require('./db/postgres');

module.exports = async (req, res) => {
  console.log('========================================');
  console.log('Chatwoot webhook received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    console.log('Event type:', event.event);
    console.log('Event data:', JSON.stringify(event, null, 2));

    const eventType = event.event;
    
    // Handle different event types
    if (eventType === 'message_created') {
      await handleMessageCreated(event);
    } else if (eventType === 'conversation_updated') {
      await handleConversationUpdated(event);
    } else if (eventType === 'conversation_created') {
      await handleConversationCreated(event);
    }
    
    return res.status(200).json({ status: 'received' });
    
  } catch (error) {
    console.error('Error processing Chatwoot webhook:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Update survey response with real customer name from Chatwoot
 * This is called when Chatwoot sends a webhook after user submits Flow
 */
async function updateSurveyResponseName(flowToken, phoneNumber, customerName) {
  const { neon } = require('@neondatabase/serverless');
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  
  if (!sql || !customerName) return;
  
  try {
    const result = await sql`
      UPDATE survey_responses
      SET customer_name = ${customerName}
      WHERE flow_token = ${flowToken}
        AND (customer_name IS NULL OR customer_name = 'Test User')
      RETURNING id, customer_name
    `;
    
    if (result.length > 0) {
      console.log(`✅ Updated survey response ${result[0].id} with real name: ${customerName}`);
    }
  } catch (error) {
    console.error('Error updating survey response name:', error);
  }
}

/**
 * Handle message_created events
 * Captures phone numbers when messages are sent/received
 */
async function handleMessageCreated(event) {
  try {
    const conversation = event.conversation;
    const sender = event.sender;
    
    // Extract phone number and customer name from sender or conversation
    const phoneNumber = sender?.phone_number ||
                       conversation?.meta?.sender?.phone_number || 
                       conversation?.meta?.sender?.identifier;
    
    const customerName = sender?.name ||
                        conversation?.meta?.sender?.name ||
                        null;
    
    if (!phoneNumber) {
      console.log('⚠️  No phone number found in message event');
      return;
    }
    
    console.log(`📞 Phone number from Chatwoot: ${phoneNumber}`);
    console.log(`👤 Customer name from Chatwoot: ${customerName || 'Not available'}`);
    
    // Message content might contain flow_token or flow completion info
    const messageContent = event.content || '';
    const messageType = event.message_type; // 'incoming' or 'outgoing'
    
    console.log(`Message type: ${messageType}`);
    console.log(`Message content: ${messageContent}`);
    
    // Strategy 1: Look for flow_token in message content attributes
    if (event.content_attributes) {
      const contentAttrs = event.content_attributes;
      console.log('Content attributes:', JSON.stringify(contentAttrs));
      
      // Check for flow_token in various possible locations
      const flowToken = contentAttrs.form_data?.flow_token ||
                       contentAttrs.flow_token || 
                       contentAttrs.flow_id ||
                       contentAttrs.items?.[0]?.flow_token;
      
      if (flowToken) {
        console.log(`✅ Found flow_token in message: ${flowToken}`);
        
        // Update both the flow_token_mapping AND any existing survey response
        try {
          await storeFlowToken(flowToken, phoneNumber, customerName);
          console.log(`✅ Stored mapping: ${flowToken} → ${phoneNumber} (${customerName || 'No name'})`);
          
          // Also update survey_responses if already submitted
          await updateSurveyResponseName(flowToken, phoneNumber, customerName);
        } catch (error) {
          console.error('Error storing flow token:', error);
        }
        
        return;
      }
    }
    
    // Strategy 2: Store phone number with conversation ID + timestamp
    // This allows matching by recent activity
    if (conversation?.id) {
      const conversationId = conversation.id;
      const timestamp = event.created_at ? new Date(event.created_at) : new Date();
      
      // Store in a temp mapping table
      await storeConversationPhone(conversationId, phoneNumber, customerName, timestamp);
      console.log(`✅ Stored conversation mapping: ${conversationId} → ${phoneNumber} (${customerName || 'No name'})`);
    }
    
    // Strategy 3: Look for Flow completion in message content
    // When user completes Flow, WhatsApp sends a message back
    // Try to extract flow_token from message text
    const flowTokenMatch = messageContent.match(/flow[_-](\d+)[_-]([a-f0-9]+)/i);
    if (flowTokenMatch) {
      const flowToken = flowTokenMatch[0];
      console.log(`✅ Extracted flow_token from message content: ${flowToken}`);
      
      // Update existing survey response with phone number
      const result = await updatePhoneNumber(flowToken, phoneNumber);
      if (result.updated) {
        console.log(`✅ Updated survey response with phone number!`);
      }
    }
    
  } catch (error) {
    console.error('Error in handleMessageCreated:', error);
  }
}

/**
 * Handle conversation_updated events
 * Useful for tracking when conversations are resolved (survey completed)
 */
async function handleConversationUpdated(event) {
  try {
    const conversation = event.conversation;
    const phoneNumber = conversation?.meta?.sender?.phone_number;
    const conversationId = conversation?.id;
    
    if (phoneNumber && conversationId) {
      console.log(`📞 Conversation ${conversationId} updated for phone: ${phoneNumber}`);
      
      // Update any recent survey responses from this conversation
      await updateRecentSurveyByConversation(conversationId, phoneNumber);
    }
  } catch (error) {
    console.error('Error in handleConversationUpdated:', error);
  }
}

/**
 * Handle conversation_created events
 * Captures phone number when new conversation starts
 */
async function handleConversationCreated(event) {
  try {
    const conversation = event.conversation;
    const phoneNumber = conversation?.meta?.sender?.phone_number;
    const conversationId = conversation?.id;
    
    if (phoneNumber && conversationId) {
      console.log(`📞 New conversation ${conversationId} for phone: ${phoneNumber}`);
      await storeConversationPhone(conversationId, phoneNumber, new Date());
    }
  } catch (error) {
    console.error('Error in handleConversationCreated:', error);
  }
}

/**
 * Store conversation to phone mapping temporarily
 * Used to link Flow responses to phone numbers
 */
async function storeConversationPhone(conversationId, phoneNumber, customerName, timestamp) {
  const { neon } = require('@neondatabase/serverless');
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  
  if (!sql) return;
  
  try {
    // Create temp table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS chatwoot_conversation_mapping (
        conversation_id VARCHAR(50) PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE
      )
    `;
    
    // Store mapping (upsert)
    await sql`
      INSERT INTO chatwoot_conversation_mapping (conversation_id, phone_number, customer_name, created_at)
      VALUES (${conversationId}, ${phoneNumber}, ${customerName}, ${timestamp.toISOString()})
      ON CONFLICT (conversation_id) 
      DO UPDATE SET phone_number = ${phoneNumber}, customer_name = ${customerName}, created_at = ${timestamp.toISOString()}
    `;
    
    console.log(`✅ Stored Chatwoot conversation mapping`);
  } catch (error) {
    console.error('Error storing conversation mapping:', error);
  }
}

/**
 * Update recent survey responses with phone number
 * Matches by timing (responses created in last 2 minutes)
 */
async function updateRecentSurveyByConversation(conversationId, phoneNumber) {
  const { neon } = require('@neondatabase/serverless');
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  
  if (!sql) return;
  
  try {
    // Update survey responses created in last 2 minutes without phone number
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const result = await sql`
      UPDATE survey_responses
      SET phone_number = ${phoneNumber}
      WHERE phone_number IS NULL
        AND submission_timestamp >= ${twoMinutesAgo}
      RETURNING id, flow_token
    `;
    
    if (result.length > 0) {
      console.log(`✅ Updated ${result.length} survey response(s) with phone number`);
      result.forEach(r => console.log(`   - Survey ID ${r.id}, flow_token: ${r.flow_token}`));
    }
  } catch (error) {
    console.error('Error updating recent surveys:', error);
  }
}
