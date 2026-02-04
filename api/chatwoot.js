/**
 * Chatwoot API Integration
 * 
 * Fetches phone numbers and contact information from Chatwoot
 * Used to link Flow responses with customer phone numbers
 */

const CHATWOOT_BASE_URL = 'https://chat.voomdigital.net';
const CHATWOOT_ACCOUNT_ID = '14';

/**
 * Get phone number from Chatwoot contact
 * 
 * Strategy:
 * 1. Search for conversations/messages containing the flow_token
 * 2. Get contact information from that conversation
 * 3. Extract phone number
 */
async function getPhoneNumberFromChatwoot(flowToken) {
  const accessToken = process.env.CHATWOOT_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('⚠️  CHATWOOT_ACCESS_TOKEN not configured');
    return null;
  }
  
  try {
    console.log(`🔍 Searching Chatwoot for flow_token: ${flowToken}`);
    
    // Strategy 1: Search conversations by flow_token
    const searchUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/search`;
    const searchParams = new URLSearchParams({
      q: flowToken,
      page: 1
    });
    
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'api_access_token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      console.error('Chatwoot search failed:', searchResponse.status);
      return null;
    }
    
    const searchData = await searchResponse.json();
    console.log(`Found ${searchData.payload?.length || 0} conversations`);
    
    if (searchData.payload && searchData.payload.length > 0) {
      const conversation = searchData.payload[0];
      const contactId = conversation.meta?.sender?.id;
      
      if (contactId) {
        // Get full contact details
        const contact = await getContactById(contactId, accessToken);
        if (contact?.phone_number) {
          console.log(`✅ Found phone number from Chatwoot: ${contact.phone_number}`);
          return contact.phone_number;
        }
      }
    }
    
    // Strategy 2: Get recent conversations and check messages
    console.log('🔍 Trying recent conversations...');
    const recentPhone = await searchRecentConversations(flowToken, accessToken);
    if (recentPhone) {
      return recentPhone;
    }
    
    console.log('⚠️  Phone number not found in Chatwoot');
    return null;
    
  } catch (error) {
    console.error('❌ Error fetching from Chatwoot:', error.message);
    return null;
  }
}

/**
 * Get contact details by ID
 */
async function getContactById(contactId, accessToken) {
  try {
    const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}`;
    
    const response = await fetch(url, {
      headers: {
        'api_access_token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.payload;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching contact:', error.message);
    return null;
  }
}

/**
 * Search recent conversations for flow_token
 */
async function searchRecentConversations(flowToken, accessToken) {
  try {
    const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`;
    const params = new URLSearchParams({
      status: 'all',
      page: 1
    });
    
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'api_access_token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const conversations = data.payload || [];
    
    // Check each conversation for flow_token
    for (const conv of conversations.slice(0, 20)) { // Check last 20 conversations
      const messages = await getConversationMessages(conv.id, accessToken);
      
      // Look for flow_token in messages
      const hasFlowToken = messages.some(msg => 
        msg.content?.includes(flowToken) || 
        msg.content_attributes?.flow_token === flowToken
      );
      
      if (hasFlowToken && conv.meta?.sender?.phone_number) {
        console.log(`✅ Found phone in conversation ${conv.id}: ${conv.meta.sender.phone_number}`);
        return conv.meta.sender.phone_number;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching recent conversations:', error.message);
    return null;
  }
}

/**
 * Get messages from a conversation
 */
async function getConversationMessages(conversationId, accessToken) {
  try {
    const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
    
    const response = await fetch(url, {
      headers: {
        'api_access_token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.payload || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    return [];
  }
}

/**
 * Alternative: Extract phone from WhatsApp ID format
 * WhatsApp IDs are often in format: phone_number@s.whatsapp.net
 */
function extractPhoneFromWhatsAppId(whatsappId) {
  if (!whatsappId) return null;
  
  // Format: 212610059159@s.whatsapp.net
  const match = whatsappId.match(/^(\d+)@/);
  if (match) {
    return '+' + match[1];
  }
  
  return null;
}

/**
 * Search for contact by phone number in Chatwoot
 * Returns contact object with name, phone, id
 */
async function searchChatwootContactByPhone(phoneNumber) {
  const accessToken = process.env.CHATWOOT_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('⚠️  CHATWOOT_ACCESS_TOKEN not configured');
    return null;
  }
  
  if (!phoneNumber) {
    return null;
  }
  
  try {
    // Clean phone number for search
    const cleanPhone = phoneNumber.replace(/[+\s-]/g, '');
    
    console.log(`🔍 Searching Chatwoot for contact: ${phoneNumber}`);
    
    const searchUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search`;
    const searchParams = new URLSearchParams({
      q: cleanPhone,
      page: 1
    });
    
    const response = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'api_access_token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Chatwoot contact search failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const contacts = data.payload || [];
    
    if (contacts.length > 0) {
      const contact = contacts[0];
      console.log(`✅ Found contact in Chatwoot: ${contact.name || 'No name'} (${contact.phone_number})`);
      
      return {
        name: contact.name,
        phone_number: contact.phone_number,
        id: contact.id,
        email: contact.email
      };
    }
    
    console.log('⚠️  No contact found in Chatwoot');
    return null;
    
  } catch (error) {
    console.error('❌ Error searching Chatwoot contact:', error.message);
    return null;
  }
}

module.exports = {
  getPhoneNumberFromChatwoot,
  getContactById,
  extractPhoneFromWhatsAppId,
  searchChatwootContactByPhone
};
