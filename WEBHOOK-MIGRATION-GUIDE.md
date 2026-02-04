# Webhook Migration Guide - Phone Number Tracking

## Overview
This guide explains how to migrate your existing WhatsApp Flow webhooks to use our phone number tracking solution, ensuring phone numbers always appear in the dashboard.

---

## The Problem
WhatsApp Flows send data to your webhook, but **DO NOT include the sender's phone number** in the payload. This means you can't identify who submitted the survey.

---

## Our Solution
We implemented a **two-step phone number tracking system**:

1. **BEFORE sending Flow** → Store `flow_token` ↔ `phone_number` mapping in database
2. **WHEN receiving Flow response** → Retrieve phone number using `flow_token`

---

## Migration Steps for Existing Flows

### Step 1: Update Your Flow Sending Logic

**OLD WAY** (Without phone tracking):
```javascript
// ❌ This loses the phone number
await sendWhatsAppFlow(phoneNumber, flowId);
```

**NEW WAY** (With phone tracking):
```javascript
// ✅ Use our /api/send-flow endpoint
const response = await fetch('https://changansurvey.vercel.app/api/send-flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+212639085462',  // Customer phone
    customerName: 'Customer Name'   // Optional
  })
});

const { flowToken, messageId } = await response.json();
// Flow sent with tracking enabled
```

### Step 2: Verify Your Webhook Endpoint

Your Flow webhook URL should point to:
```
https://changansurvey.vercel.app/api/flow
```

This endpoint automatically:
- ✅ Decrypts Flow responses
- ✅ Retrieves phone number from `flow_token_mapping` table
- ✅ Saves complete survey data with phone number
- ✅ Returns success response to WhatsApp

### Step 3: Update WhatsApp Flow Configuration

In your WhatsApp Flow JSON, ensure the final screen uses `data_exchange`:

```json
{
  "type": "Footer",
  "label": "Valider",
  "on-click-action": {
    "name": "data_exchange",
    "payload": {
      "q1_rating": "${data.q1_rating}",
      "q1_comment": "${data.q1_comment}",
      // ... all your survey fields
    }
  }
}
```

---

## For Different Integration Methods

### Option A: Chatwoot Integration
If sending flows through Chatwoot:

1. Use the `/api/send-flow` endpoint (it handles everything)
2. Chatwoot conversation will automatically be linked
3. Phone number extracted from Chatwoot data

**Implementation:**
```javascript
// In your Chatwoot automation
POST https://changansurvey.vercel.app/api/send-flow
{
  "phoneNumber": "{{contact.phone_number}}",
  "customerName": "{{contact.name}}"
}
```

### Option B: Direct WhatsApp Business API
If using WhatsApp Business API directly:

1. Call `/api/send-flow` to store phone + get flow_token
2. Send Flow message with the returned flow_token
3. Webhook receives data and retrieves phone number

**Implementation:**
```javascript
// Step 1: Store phone number
const { flowToken } = await fetch('/api/send-flow', {
  method: 'POST',
  body: JSON.stringify({ phoneNumber, customerName })
}).then(r => r.json());

// Step 2: Send Flow via WhatsApp API (handled by our endpoint)
// Phone number automatically tracked
```

### Option C: Custom Integration
If you have a custom system:

1. Before sending Flow, call our storage endpoint:
   ```javascript
   POST /api/send-flow
   Body: { phoneNumber: "+212...", customerName: "..." }
   ```

2. Get the `flowToken` from response
3. The Flow will be sent with tracking enabled
4. Webhook automatically retrieves phone number

---

## Testing Your Migration

### Test Script (PowerShell)
```powershell
# Test phone number tracking
$vercelUrl = "https://changansurvey.vercel.app"
$testPhone = "+212YOUR_NUMBER"

$body = @{
    phoneNumber = $testPhone
    customerName = "Test Customer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$vercelUrl/api/send-flow" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

Write-Host "Flow Token: $($response.flowToken)"
Write-Host "Phone stored: $($response.phoneNumber)"
```

### Verify in Dashboard
1. Send test Flow using above script
2. Complete the Flow on WhatsApp
3. Check dashboard at https://changansurvey.vercel.app
4. Verify phone number appears correctly

---

## Database Tables

Our solution uses two tables:

### `flow_token_mapping`
Stores temporary phone number mappings:
```sql
flow_token (PK)     | phone_number  | created_at | used
--------------------+---------------+------------+------
flow_123...         | +212639...    | 2026-02-03 | true
```

### `survey_responses`
Stores complete survey data with phone:
```sql
id | submission_timestamp | phone_number | q1_rating | q2_rating | ...
---+---------------------+--------------+-----------+-----------+----
17 | 2026-02-03 22:24    | +212639...   | 5_etoiles | 5_etoiles | ...
```

---

## API Endpoints Reference

### POST `/api/send-flow`
Sends Flow and stores phone number mapping.

**Request:**
```json
{
  "phoneNumber": "+212639085462",
  "customerName": "Customer Name"
}
```

**Response:**
```json
{
  "success": true,
  "flowToken": "flow_1770153832848_61c98e354ecd2c6e",
  "phoneNumber": "+212639085462",
  "messageId": "wamid.HBg..."
}
```

### POST `/api/flow`
Webhook endpoint for Flow responses (configured in WhatsApp Flow settings).

**Automatic processing:**
1. Decrypts request
2. Retrieves phone from `flow_token_mapping`
3. Saves to `survey_responses`
4. Returns encrypted success response

### GET `/api/responses`
Dashboard data endpoint.

**Response:**
```json
{
  "stats": {
    "total": 17,
    "today": 5,
    "nps": 100,
    "avgSatisfaction": 0.92,
    "needsFollowup": 3
  },
  "responses": [
    {
      "id": 17,
      "timestamp": "2026-02-03T22:24:06Z",
      "phone_number": "+212639085462",
      "responses": { ... },
      "analytics": { ... }
    }
  ]
}
```

---

## Troubleshooting

### Phone Number Not Appearing

**Check Vercel Logs:**
```
✅ Stored flow token mapping: flow_xxx -> +212xxx
📞 Retrieved phone number from flow_token mapping: +212xxx
```

If you see:
```
⚠️ Could not retrieve phone number from Chatwoot
📞 Retrieved phone number from flow_token mapping: NOT FOUND
```

**Solution:** Ensure you're calling `/api/send-flow` BEFORE the user fills the Flow.

### Wrong Phone Number

**Verify the flow_token:**
- Each Flow should have a unique `flow_token`
- Check logs for: `✅ Stored flow token mapping: flow_xxx -> +212yyy`
- Ensure the correct phone is being passed to `/api/send-flow`

### Data Not Saving

**Check database logs:**
```
✅ Saved to database: { id: 17, phone_number: '+212...', ... }
```

If you see database errors, check:
- DATABASE_URL environment variable is set
- `flow_token_mapping` table exists
- `survey_responses` table has `submission_timestamp` column

---

## Migration Checklist

- [ ] Update Flow sending code to use `/api/send-flow` endpoint
- [ ] Verify webhook URL points to `/api/flow`
- [ ] Test with one customer flow
- [ ] Check phone number appears in dashboard
- [ ] Verify data exports include phone numbers
- [ ] Update all production flows
- [ ] Monitor Vercel logs for errors
- [ ] Test with multiple customers

---

## Support

**Logs Location:** Vercel Dashboard → Your Project → Logs

**Key Log Markers:**
- `✅ Stored flow token mapping` - Phone stored successfully
- `📞 Retrieved phone number from flow_token mapping` - Phone retrieved successfully
- `✅ Saved to database` - Survey data saved with phone number

**Common Issues:**
1. Missing phone → Check flow_token mapping was created first
2. Wrong phone → Verify correct phone passed to `/api/send-flow`
3. Database errors → Check schema migration ran successfully

---

## Summary

**Before:** WhatsApp Flows → ❌ No phone number

**After:** 
1. Call `/api/send-flow` → Store phone + flow_token
2. User fills Flow → WhatsApp sends flow_token
3. Webhook retrieves phone → ✅ Complete data with phone number

**Result:** 100% phone number tracking for all survey responses!
