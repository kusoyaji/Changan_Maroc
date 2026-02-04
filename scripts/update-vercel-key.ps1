# Update Vercel Environment Variable with new Private Key
# Run this after generating new RSA keys

$privateKey = Get-Content -Path "private-key.pem" -Raw

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update Vercel PRIVATE_KEY" -ForegroundColor Cyan
Write-Host "========================================`n"

Write-Host "Your new PRIVATE_KEY value:" -ForegroundColor Yellow
Write-Host $privateKey
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MANUAL STEPS:" -ForegroundColor Yellow
Write-Host "========================================`n"

Write-Host "1. Copy the private key above (including -----BEGIN/END-----)" -ForegroundColor White
Write-Host ""
Write-Host "2. Go to: https://vercel.com/mehdis-projects-7fee69af/changansurvey/settings/environment-variables" -ForegroundColor White
Write-Host ""
Write-Host "3. Find 'PRIVATE_KEY' and click Edit" -ForegroundColor White
Write-Host ""
Write-Host "4. Paste the private key (replace old value)" -ForegroundColor White
Write-Host ""
Write-Host "5. Save and Redeploy" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OR use Vercel CLI:" -ForegroundColor Yellow
Write-Host "========================================`n"

# Escape newlines for Vercel CLI
$escapedKey = $privateKey -replace '\r?\n', '\n'

Write-Host "vercel env add PRIVATE_KEY production" -ForegroundColor White
Write-Host ""
Write-Host "Then paste the private key when prompted" -ForegroundColor Gray
Write-Host ""

# Save to a file for easy reference
$escapedKey | Out-File -FilePath "PRIVATE_KEY_FOR_VERCEL.txt" -NoNewline -Encoding UTF8

Write-Host "✅ Private key also saved to: PRIVATE_KEY_FOR_VERCEL.txt" -ForegroundColor Green
Write-Host ""
Write-Host "After updating Vercel, redeploy with:" -ForegroundColor Yellow
Write-Host "git push" -ForegroundColor White
