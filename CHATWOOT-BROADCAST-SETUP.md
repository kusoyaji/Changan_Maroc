# Chatwoot Automation for Flow Broadcasts with Phone Tracking

## Setup Steps

### 1. Create Custom Automation in Chatwoot

Go to: **Chatwoot → Settings → Automations → Add Automation**

**Trigger:**
- Event: `Message Created`
- Conditions:
  - Message Type: `Outgoing`
  - Message Contains: `[SURVEY]` (or any trigger keyword)

**Actions:**
1. **Webhook Action**
   - URL: `https://changansurvey.vercel.app/api/send-flow`
   - Method: `POST`
   - Headers:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "phoneNumber": "{{contact.phone_number}}",
       "customerName": "{{contact.name}}"
     }
     ```

### 2. How to Use

When you want to broadcast:

1. **Create a broadcast message** in Chatwoot
2. **Add trigger keyword** in the message (e.g., "[SURVEY]")
3. **Send to your contact list**
4. **Automation triggers** for EACH contact
5. **Each contact gets unique flow_token**

### 3. Example Broadcast Message

```
Bonjour {{contact.name}} ! 

Nous espérons que vous êtes satisfait de votre nouvelle voiture Changan.

Pourriez-vous prendre 2 minutes pour répondre à notre enquête de satisfaction ?

[SURVEY]
```

When this message is sent:
- Automation detects `[SURVEY]`
- Calls `/api/send-flow` for that specific contact
- Flow is sent with phone tracking enabled

### 4. Alternative: Manual Broadcast Script

If Chatwoot automations don't work, use the PowerShell script:

```powershell
# scripts/broadcast-flow-chatwoot.ps1

# Define your customer list
$customers = @(
    @{ phoneNumber = "+212610059159"; name = "Ahmed" },
    @{ phoneNumber = "+212639085462"; name = "Fatima" }
)

# Run the broadcast
.\broadcast-flow-chatwoot.ps1
```

### 5. Verification

After broadcast:
1. Check Vercel logs for each customer:
   ```
   ✅ Stored flow token mapping: flow_xxx -> +212610059159
   ✅ Stored flow token mapping: flow_yyy -> +212639085462
   ```

2. As customers complete surveys, check dashboard
3. Each response will show correct phone number

## ⚠️ IMPORTANT: Chatwoot Template Broadcasts

If using **Chatwoot's native template broadcast feature**:

**Problem:** Templates send the SAME message to everyone, meaning SAME flow_token

**Solution:**
- DON'T use Chatwoot template broadcasts directly
- USE the automation method above OR
- USE the PowerShell broadcast script

## Summary

✅ **Guaranteed phone tracking** requires:
1. Each customer gets UNIQUE flow_token
2. Flow_token stored BEFORE sending
3. Use individual API calls (automation or script)

❌ **Will NOT work:**
- Chatwoot template broadcasts (same flow_token for all)
- Manual Flow sends without phone storage

✅ **WILL work:**
- PowerShell broadcast script (guaranteed)
- Chatwoot automation (with webhook per contact)
- Any method that calls `/api/send-flow` individually
