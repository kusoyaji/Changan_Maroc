# Deploy to Vercel Script
Write-Host "Deploying Changan Maroc Survey to Vercel..."

# Deploy to Vercel
vercel --prod

Write-Host "`nDeployment complete!"
Write-Host "`nNext steps:"
Write-Host "1. Copy your deployment URL"
Write-Host "2. Add environment variables: PRIVATE_KEY and DATABASE_URL"
Write-Host "3. Run: vercel env add PRIVATE_KEY production"
Write-Host "4. Run: vercel env add DATABASE_URL production"
Write-Host "5. Redeploy: vercel --prod"
