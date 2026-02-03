# Quick Reference - Chatwoot WhatsApp Flow System

## 🔗 Important Links

- **Dashboard:** https://changansurvey.vercel.app
- **Chatwoot:** https://chat.voomdigital.net/app/accounts/14/dashboard
- **Vercel Project:** https://vercel.com/mehdis-projects-7fee69af/changan_survey

## 📞 Phone Number Capture - How It Works

```
Chatwoot Broadcast → User Fills Flow → Webhook Receives Data
                                              ↓
                               Queries Chatwoot API (flow_token)
                                              ↓
                               Gets Phone Number from Contact
                                              ↓
                               Saves Response with Phone ✅
```

## 🚀 Quick Start

### 1. Send Flow
- Open Chatwoot
- Create broadcast with your Flow
- Send to contacts

### 2. Monitor
```powershell
vercel logs --follow
```

### 3. View Results
- Open: https://changansurvey.vercel.app
- See responses with phone numbers

## 🔑 Environment Variables

```
CHATWOOT_ACCESS_TOKEN=j4qE9vZUww2LgHHNxDVJdpPp
WHATSAPP_ACCESS_TOKEN=EAAWqkyU5JYYB...
DATABASE_URL=postgresql://...
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

## 📊 API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/flow` | Receives Flow responses + fetches phone from Chatwoot |
| `/api/responses` | Get all survey responses |
| `/api/export` | Export to Excel |
| `/` | Dashboard |

## 🔍 Debugging Commands

### View Logs
```powershell
vercel logs --follow
```

### Test Chatwoot API
```powershell
$headers = @{ 'api_access_token' = 'j4qE9vZUww2LgHHNxDVJdpPp' }
Invoke-RestMethod -Uri 'https://chat.voomdigital.net/api/v1/accounts/14/conversations' -Headers $headers
```

### Redeploy
```powershell
vercel --prod
```

## ✅ What to Check

**Phone numbers showing?**
- ✅ Check Vercel logs for "Phone number retrieved"
- ✅ Verify Chatwoot has conversation with flow_token
- ✅ Confirm CHATWOOT_ACCESS_TOKEN is set

**Flow not working?**
- ✅ Check PRIVATE_KEY is set
- ✅ Verify Flow endpoint configured
- ✅ Test health check: `curl https://changansurvey.vercel.app/api/flow`

## 📚 Full Documentation

- [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) - Deployment details
- [CHATWOOT-INTEGRATION.md](CHATWOOT-INTEGRATION.md) - Integration guide
- [PHONE-NUMBER-SOLUTION.md](PHONE-NUMBER-SOLUTION.md) - Alternative approaches

## 🎯 Status

🟢 **PRODUCTION - LIVE**

System is deployed and ready to capture phone numbers from Chatwoot-sent Flows.
