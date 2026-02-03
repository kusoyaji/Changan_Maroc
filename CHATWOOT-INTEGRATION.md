# Chatwoot + WhatsApp Flow Integration
## Phone Number Capture Solution

## The Challenge

When sending WhatsApp Flows via **Chatwoot broadcasts**:
- ❌ WhatsApp doesn't include phone numbers in Flow webhooks
- ❌ Can't modify Chatwoot's webhook URL (it's already configured for Voom)
- ❌ Need phone numbers to identify survey respondents

## The Solution

**Fetch phone numbers from Chatwoot API when Flow responses arrive:**

```
1. User receives Flow via Chatwoot broadcast
2. User fills and submits Flow  
3. Flow webhook receives: flow_token + survey data (NO phone number)
4. Webhook queries Chatwoot API with flow_token
5. Chatwoot returns conversation → contact → phone number ✅
6. Save complete response with phone number
```

---

## Architecture

### Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Send Flow (Chatwoot Broadcast)                  │
├──────────────────────────────────────────────────────────┤
│ Chatwoot → WhatsApp API                                  │
│ - Sends Flow to customer                                 │
│ - Generates flow_token automatically                     │
│ - Associates with conversation/contact                   │
└──────────────────────────────────────────────────────────┘

                          ↓

┌──────────────────────────────────────────────────────────┐
│ STEP 2: User Fills Flow (WhatsApp)                      │
├──────────────────────────────────────────────────────────┤
│ Customer completes survey questions                      │
└──────────────────────────────────────────────────────────┘

                          ↓

┌──────────────────────────────────────────────────────────┐
│ STEP 3: Flow Webhook (Meta → Your Server)               │
├──────────────────────────────────────────────────────────┤
│ POST /api/flow                                           │
│ {                                                        │
│   flow_token: "abc123...",                               │
│   data: { q1_rating: "5_etoiles", ... }                  │
│ }                                                        │
│                                                          │
│ ⚠️  NO phone number included                             │
└──────────────────────────────────────────────────────────┘

                          ↓

┌──────────────────────────────────────────────────────────┐
│ STEP 4: Query Chatwoot API                              │
├──────────────────────────────────────────────────────────┤
│ GET /api/v1/accounts/14/conversations/search             │
│ ?q=abc123                                                │
│                                                          │
│ Response:                                                │
│ {                                                        │
│   payload: [{                                            │
│     meta: {                                              │
│       sender: {                                          │
│         id: 12345,                                       │
│         phone_number: "+212610059159" ✅                 │
│       }                                                  │
│     }                                                    │
│   }]                                                     │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

                          ↓

┌──────────────────────────────────────────────────────────┐
│ STEP 5: Save to Database                                │
├──────────────────────────────────────────────────────────┤
│ INSERT INTO survey_responses                             │
│ (flow_token, phone_number, q1_rating, ...)               │
│ VALUES ('abc123', '+212610059159', '5_etoiles', ...)     │
│                                                          │
│ ✅ Phone number captured!                                │
└──────────────────────────────────────────────────────────┘
```

---

## Code Components

### 1. Chatwoot API Helper ([api/chatwoot.js](api/chatwoot.js))

```javascript
const { getPhoneNumberFromChatwoot } = require('./chatwoot');

// Usage in webhook
const phoneNumber = await getPhoneNumberFromChatwoot(flow_token);
// Returns: "+212610059159" or null
```

**How it works:**
1. Searches Chatwoot conversations for `flow_token`
2. Gets contact ID from matching conversation
3. Fetches contact details to get phone number
4. Returns formatted phone number

### 2. Modified Flow Webhook ([api/flow.js](api/flow.js))

```javascript
if (action === 'data_exchange') {
  // Fetch phone from Chatwoot
  const phoneNumber = await getPhoneNumberFromChatwoot(flow_token);
  
  // Save with phone number
  await saveSurveyResponse(flow_token, data, phoneNumber);
}
```

### 3. Database Function ([api/db/postgres.js](api/db/postgres.js))

```javascript
async function saveSurveyResponse(flowToken, data, providedPhoneNumber) {
  // Use phone number from Chatwoot if provided
  const phoneNumber = providedPhoneNumber || await getPhoneFromToken(flowToken);
  
  await sql`INSERT INTO survey_responses (phone_number, ...) VALUES (${phoneNumber}, ...)`;
}
```

---

## Environment Variables

Add to Vercel (all 3 environments: production, preview, development):

```bash
# Chatwoot API
CHATWOOT_ACCESS_TOKEN=j4qE9vZUww2LgHHNxDVJdpPp

# WhatsApp (existing)
WHATSAPP_ACCESS_TOKEN=EAAWqkyU5JYY...
PHONE_NUMBER_ID=875940088939317
FLOW_ID=33540776948903461

# Database (existing)
DATABASE_URL=postgresql://...

# Encryption (existing)
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

### How to Add Environment Variables

```powershell
# Navigate to project
cd "C:\Users\Mehdi\OneDrive - Ecole Marocaine des Sciences de l'Ingénieur\Bureau\Changan_Maroc"

# Add Chatwoot token
vercel env add CHATWOOT_ACCESS_TOKEN production
# Paste: j4qE9vZUww2LgHHNxDVJdpPp

vercel env add CHATWOOT_ACCESS_TOKEN preview
vercel env add CHATWOOT_ACCESS_TOKEN development
```

---

## Deployment

```powershell
# Deploy to production
vercel --prod
```

After deployment, Vercel will show your URL:
```
https://changan-survey.vercel.app
```

---

## Testing

### 1. Send Flow via Chatwoot Broadcast

1. Go to Chatwoot: https://chat.voomdigital.net/app/accounts/14/dashboard
2. Create broadcast with WhatsApp Flow
3. Send to test contact

### 2. User Completes Flow

Customer receives and fills the Flow on WhatsApp

### 3. Check Webhook Logs

```powershell
vercel logs --follow
```

Look for:
```
🔍 Fetching phone number from Chatwoot...
✅ Phone number retrieved: +212610059159
📞 Using phone number from Chatwoot: +212610059159
✅ Saved to database: 123
```

### 4. Verify in Dashboard

Open: `https://your-app.vercel.app`

Check that phone numbers are displayed in the responses table.

---

## Chatwoot API Reference

### Search Conversations
```
GET /api/v1/accounts/{account_id}/conversations/search?q={search_term}
```

### Get Contact
```
GET /api/v1/accounts/{account_id}/contacts/{contact_id}
```

### Get Conversation Messages
```
GET /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
```

**Authentication:** Header `api_access_token: YOUR_TOKEN`

---

## Troubleshooting

### Phone number still NULL in database?

**Check:**
1. ✅ Is `CHATWOOT_ACCESS_TOKEN` set in Vercel?
   ```powershell
   vercel env ls
   ```

2. ✅ Does Chatwoot have the conversation?
   - Log into Chatwoot
   - Check recent conversations
   - Verify flow_token appears in messages

3. ✅ Check Vercel logs for errors:
   ```powershell
   vercel logs --follow
   ```

4. ✅ Test Chatwoot API manually:
   ```bash
   curl "https://chat.voomdigital.net/api/v1/accounts/14/conversations/search?q=test" \
     -H "api_access_token: j4qE9vZUww2LgHHNxDVJdpPp"
   ```

### "Chatwoot API error: 401 Unauthorized"

- Check access token is correct
- Verify token has necessary permissions
- Token format: No "Bearer" prefix, just the token

### "Phone number not found in Chatwoot"

**Possible reasons:**
1. flow_token not stored in Chatwoot conversation
2. Search timing issue (conversation not indexed yet)
3. Contact doesn't have phone number in Chatwoot

**Solutions:**
- Wait a few seconds between sending Flow and completion
- Ensure Chatwoot stores flow_token in conversation metadata
- Verify contact profile has phone number

---

## Fallback Strategy

If Chatwoot lookup fails, the system:
1. Still saves the survey response
2. Sets `phone_number` to NULL
3. Logs warning in Vercel logs

**Manual fix:**
- Export responses
- Match with Chatwoot contacts manually
- Update database

---

## Advantages of This Approach

✅ **No webhook URL changes** - Works with existing Voom/Chatwoot setup  
✅ **No Chatwoot modifications** - Uses standard API  
✅ **Automatic phone capture** - No manual work needed  
✅ **Works with broadcasts** - Scales to thousands of contacts  
✅ **Graceful degradation** - Saves data even if phone lookup fails  

---

## Summary

🎯 **Problem:** WhatsApp Flows don't provide phone numbers  
🔑 **Solution:** Fetch from Chatwoot API using flow_token  
✅ **Result:** Complete survey responses with phone numbers  

The system now works seamlessly with your existing Chatwoot broadcast workflow! 🚀
