# Changan Maroc WhatsApp Survey - Setup Instructions

## Current Status
✅ Project structure created
✅ Dependencies installed
✅ RSA keys generated
✅ Public key uploaded to WhatsApp
✅ Database configuration ready
✅ All API endpoints created
✅ Dashboard UI created

## Next Steps

### 1. Deploy to Vercel

Run the deployment:
```powershell
vercel
```

When prompted:
- Project name: `changan-maroc-survey` (must be lowercase)
- Directory: `./`
- Settings: No changes needed

### 2. Add Environment Variables

After deployment, add these environment variables to ALL three environments (production, preview, development):

**PRIVATE_KEY** (from private-key.pem):
```
vercel env add PRIVATE_KEY production
vercel env add PRIVATE_KEY preview
vercel env add PRIVATE_KEY development
```

**DATABASE_URL**:
```
postgresql://neondb_owner:npg_sg2ufBzTKy4X@ep-square-unit-aiehv441-pooler.c-4.us-east-1.aws.neon.tech/Changan_maroc_survey_janvier_db?sslmode=require
```

```powershell
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

### 3. Redeploy with Environment Variables

```powershell
vercel --prod
```

### 4. Configure Flow Endpoint

Once deployed, update the endpoint in your Flow:

1. Copy your Vercel deployment URL (e.g., `https://changan-maroc-survey.vercel.app`)
2. Edit `scripts/configure-flow-endpoint.ps1`
3. Replace `YOUR_VERCEL_URL` with your actual URL
4. Run the script:
```powershell
.\scripts\configure-flow-endpoint.ps1
```

### 5. Test the Flow

Send a test message to yourself:
```powershell
.\scripts\send-test-flow.ps1
```

### 6. Monitor Logs

Watch Vercel logs in real-time:
```powershell
vercel logs --follow
```

### 7. Access Dashboard

Open your deployment URL in a browser to see the analytics dashboard:
```
https://your-project.vercel.app
```

## Quick Reference

### Project Configuration
- **WhatsApp Phone ID**: 634000359806432
- **Flow ID**: 33540776948903461
- **Test Phone**: +212610059159
- **Business Phone**: +212669677069

### Important Files
- `api/flow.js` - Main webhook endpoint
- `api/responses.js` - Get all responses
- `api/export.js` - Export to Excel
- `public/index.html` - Dashboard
- `private-key.pem` - Keep this secret!

### Troubleshooting

**If deployment fails:**
- Ensure project name is lowercase
- Check that all files are saved
- Verify package.json dependencies

**If webhook returns 500:**
- Check environment variables are set
- Verify DATABASE_URL format (no `psql` wrapper)
- Check Vercel logs for errors

**If database connection fails:**
- Ensure DATABASE_URL includes `?sslmode=require`
- Verify Neon database is active
- Check for typos in connection string

## Support

Check the COMPLETE-WORKFLOW-GUIDE.md for detailed troubleshooting and explanations.
