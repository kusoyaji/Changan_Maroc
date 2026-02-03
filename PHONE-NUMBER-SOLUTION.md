# WhatsApp Flow Phone Number Solution
## Complete Architecture Documentation

## The Problem

**WhatsApp Flows DO NOT provide user phone numbers in the webhook.**

When a user completes a WhatsApp Flow:
- ✅ You receive: `flow_token`, `flow_id`, form data
- ❌ You DON'T receive: `phone_number`, `wa_id`

This is a **Meta privacy restriction by design**, not a bug.

### Why the Standard Webhook Approach Fails

```
User fills Flow → Meta sends webhook → ❌ NO phone number included
```

Phone numbers are ONLY available when users send **messages**, not when they submit Flows.

---

## The Solution: Pre-Store Phone Numbers

The correct architecture is to **store the phone number BEFORE sending the Flow**:

```
1. Your API sends Flow  →  Store (flow_token → phone_number) mapping
2. User completes Flow  →  Webhook receives flow_token + data
3. Webhook looks up    →  phone_number from flow_token mapping
4. Save to database    →  Complete response with phone number
```

---

## Implementation Architecture

### 1. **Sending Flow with Phone Number** (`/api/send-flow`)

**Purpose:** Send WhatsApp Flow and pre-store phone number mapping

**Request:**
```json
POST /api/send-flow
{
  "phoneNumber": "+212610059159",
  "customerName": "Ahmed" // Optional
}
```

**What it does:**
1. Generates unique `flow_token`
2. Stores mapping: `flow_token → phone_number` in database
3. Sends WhatsApp Flow with this `flow_token`
4. Returns confirmation

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.xxxxx",
  "flowToken": "flow_1738612800000_a1b2c3d4e5f6g7h8",
  "phoneNumber": "+212610059159",
  "timestamp": "2026-02-03T10:30:00.000Z"
}
```

### 2. **Flow Webhook** (`/api/flow`)

**Purpose:** Receive Flow completion data

**What happens:**
1. User completes Flow
2. Meta sends webhook with `flow_token` + form data
3. Webhook looks up `phone_number` from `flow_token` mapping
4. Saves complete response with phone number

**Database Tables:**

```sql
-- Flow token mapping (temporary)
CREATE TABLE flow_token_mapping (
  flow_token VARCHAR(255) PRIMARY KEY,
  phone_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

-- Survey responses (permanent)
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  flow_token VARCHAR(255),
  phone_number VARCHAR(50),  -- ✅ Now populated!
  q1_rating VARCHAR(50),
  -- ... other fields
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. **Backup: Message Webhook** (`/api/message-webhook`)

**Purpose:** Handle direct messages (optional fallback)

This endpoint can receive WhatsApp message events if you configure message forwarding from Chatwoot/Voom. Useful for:
- Manual confirmations
- Button click tracking
- Future enhancements

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Send Flow (Your System)                            │
├─────────────────────────────────────────────────────────────┤
│ POST /api/send-flow                                         │
│ { phoneNumber: "+212610059159" }                            │
│                                                             │
│ ↓                                                           │
│ Generate flow_token: "flow_1738612800000_abc123"           │
│                                                             │
│ ↓                                                           │
│ Store in DB: flow_token_mapping                             │
│ ┌─────────────────────────────────────────┐                 │
│ │ flow_token  │ phone_number              │                 │
│ ├─────────────┼───────────────────────────┤                 │
│ │ flow_abc123 │ +212610059159             │                 │
│ └─────────────────────────────────────────┘                 │
│                                                             │
│ ↓                                                           │
│ Send WhatsApp Flow with flow_token                          │
└─────────────────────────────────────────────────────────────┘

                          ↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: User Fills Flow (WhatsApp)                         │
├─────────────────────────────────────────────────────────────┤
│ User: +212610059159                                         │
│ Fills out survey questions                                  │
│ Clicks "Terminer" button                                    │
└─────────────────────────────────────────────────────────────┘

                          ↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Flow Webhook (Meta → Your Server)                  │
├─────────────────────────────────────────────────────────────┤
│ POST /api/flow                                              │
│ {                                                           │
│   action: "data_exchange",                                  │
│   flow_token: "flow_abc123",                                │
│   data: {                                                   │
│     q1_rating: "5_etoiles",                                 │
│     q2_rating: "4_etoiles",                                 │
│     ...                                                     │
│   }                                                         │
│ }                                                           │
│                                                             │
│ ↓                                                           │
│ Lookup phone_number from flow_token_mapping                 │
│ → Found: +212610059159                                      │
│                                                             │
│ ↓                                                           │
│ Save to survey_responses with phone_number ✅               │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Required

Add these to Vercel (production, preview, development):

```bash
# WhatsApp API
WHATSAPP_ACCESS_TOKEN=EAAWqkyU5JYYBQjX...
PHONE_NUMBER_ID=875940088939317
FLOW_ID=33540776948903461

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Encryption
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----

# Optional: Webhook verification
WEBHOOK_VERIFY_TOKEN=changan_verify_token_2026
```

---

## How to Use

### Method 1: Use API to Send Flows (RECOMMENDED)

**Instead of using the PowerShell script, use the API:**

```powershell
# PowerShell
$body = @{
    phoneNumber = "+212610059159"
    customerName = "Ahmed"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-app.vercel.app/api/send-flow" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

**Or cURL:**
```bash
curl -X POST https://your-app.vercel.app/api/send-flow \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+212610059159", "customerName": "Ahmed"}'
```

**Or from your CRM/System:**
```javascript
// Node.js / JavaScript
const response = await fetch('https://your-app.vercel.app/api/send-flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+212610059159',
    customerName: 'Ahmed'
  })
});

const result = await response.json();
console.log('Flow sent:', result.flowToken);
```

### Method 2: Bulk Send Flows

Create a CSV with phone numbers and send Flows in bulk:

```csv
phone_number,customer_name
+212610059159,Ahmed
+212610059160,Fatima
+212610059161,Mohammed
```

Then run a script (create this if needed) that reads CSV and calls `/api/send-flow` for each customer.

---

## Advantages of This Solution

✅ **Phone numbers captured automatically**  
✅ **No manual tracking needed**  
✅ **Works with Meta's privacy restrictions**  
✅ **Scalable for bulk sending**  
✅ **Integrates with any CRM/system**  
✅ **No need to modify WhatsApp webhook URL**  

---

## Chatwoot/Voom Integration (Optional)

Your Changan account has webhook configured for Voom (chat.voomdigital.net).

**You have 2 options:**

### Option A: Don't change anything (RECOMMENDED)
- Use `/api/send-flow` to send Flows
- Phone numbers stored automatically
- No need to touch Voom's webhook

### Option B: Forward webhooks (Advanced)
If you want Chatwoot to forward webhook events to your system:

1. Access Chatwoot admin panel
2. Configure webhook forwarding
3. Forward to: `https://your-app.vercel.app/api/message-webhook`
4. This enables additional features (message tracking, etc.)

But **Option A is sufficient** for capturing phone numbers.

---

## Testing the Solution

### 1. Deploy to Vercel
```powershell
vercel --prod
```

### 2. Add environment variables
```powershell
vercel env add WHATSAPP_ACCESS_TOKEN production
vercel env add PHONE_NUMBER_ID production
vercel env add FLOW_ID production
vercel env add DATABASE_URL production
vercel env add PRIVATE_KEY production
```

### 3. Send test Flow
```powershell
cd scripts
.\send-flow-with-phone.ps1
```

### 4. User completes Flow on WhatsApp

### 5. Check database
```powershell
# Check API
curl https://your-app.vercel.app/api/responses
```

You should see phone numbers populated! ✅

---

## Troubleshooting

### Phone number still NULL?

**Check:**
1. Did you send Flow using `/api/send-flow`? (Not the old PowerShell script)
2. Is `flow_token_mapping` table created?
3. Check Vercel logs: `vercel logs --follow`
4. Verify `flow_token` matches between send and receive

**Debug queries:**
```sql
-- Check if flow_token was stored
SELECT * FROM flow_token_mapping ORDER BY created_at DESC LIMIT 10;

-- Check if survey has phone
SELECT id, flow_token, phone_number, created_at 
FROM survey_responses 
ORDER BY created_at DESC LIMIT 10;
```

### Error: "No matching flow submission found"

This means:
- Flow was sent using old method (not via `/api/send-flow`)
- OR flow_token doesn't match

**Solution:** Always use `/api/send-flow` endpoint.

---

## Migration from Old System

If you have existing PowerShell scripts that send Flows directly:

**OLD WAY (❌ No phone number):**
```powershell
# Direct WhatsApp API call
Invoke-RestMethod -Uri "https://graph.facebook.com/v21.0/$phoneNumberId/messages" ...
```

**NEW WAY (✅ Phone number captured):**
```powershell
# Use your API endpoint
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/send-flow" ...
```

Update all Flow-sending scripts to use the new endpoint.

---

## Summary

🎯 **The core concept:**  
You can't GET phone numbers from Flows, but you can STORE them BEFORE sending Flows.

🔑 **The magic:**  
`flow_token` is the linking key between sending and receiving.

✅ **Result:**  
Phone numbers automatically linked to all survey responses.

🚀 **Next steps:**  
Deploy, test, and start collecting complete survey data with phone numbers!
