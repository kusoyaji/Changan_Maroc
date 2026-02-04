# Fix RSA Key Mismatch - Regenerate and Upload
$accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD"
$phoneNumberId = "634000359806432"
$flowId = "33540776948903461"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RSA Key Regeneration and Upload Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate new RSA keys
Write-Host "Step 1: Generating new RSA key pair..." -ForegroundColor Yellow
try {
    node ../scripts/generate-keys.js
    Write-Host "✅ New keys generated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate keys: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Step 2: Read the newly generated public key
Write-Host "`nStep 2: Reading public key..." -ForegroundColor Yellow
$publicKeyPath = "../public-key.pem"
if (-not (Test-Path $publicKeyPath)) {
    Write-Host "❌ public-key.pem not found!" -ForegroundColor Red
    exit 1
}

$publicKey = Get-Content -Path $publicKeyPath -Raw
$publicKeyContent = $publicKey -replace '-----BEGIN PUBLIC KEY-----', '' -replace '-----END PUBLIC KEY-----', '' -replace '\r?\n', ''
$publicKeyContent = $publicKeyContent.Trim()

Write-Host "✅ Public key loaded (length: $($publicKeyContent.Length) chars)" -ForegroundColor Green

# Step 3: Upload public key to WhatsApp via Cloud API
Write-Host "`nStep 3: Uploading public key to WhatsApp Cloud API..." -ForegroundColor Yellow
Write-Host "  Phone Number ID: $phoneNumberId" -ForegroundColor Gray

$uri = "https://graph.facebook.com/v21.0/$phoneNumberId/whatsapp_business_encryption"
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$body = @{
    business_public_key = $publicKey
} | ConvertTo-Json

try {
    Write-Host "  Uploading to: $uri" -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
    
    Write-Host "`n✅ Public key uploaded successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "`n❌ Upload failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nAPI Response:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
    
    exit 1
}

# Step 4: Update Vercel environment variable
Write-Host "`nStep 4: Updating Vercel PRIVATE_KEY..." -ForegroundColor Yellow
$privateKeyPath = "../private-key.pem"
$privateKeyContent = Get-Content -Path $privateKeyPath -Raw

try {
    # Remove old PRIVATE_KEY
    Write-Host "  Removing old PRIVATE_KEY..." -ForegroundColor Gray
    vercel env rm PRIVATE_KEY production --yes 2>&1 | Out-Null
    
    # Add new private key using echo and pipe
    Write-Host "  Adding new PRIVATE_KEY..." -ForegroundColor Gray
    $privateKeyContent | vercel env add PRIVATE_KEY production
    
    Write-Host "✅ PRIVATE_KEY updated in Vercel" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not update Vercel env automatically" -ForegroundColor Yellow
    Write-Host "Run manually:" -ForegroundColor Yellow
    Write-Host "  vercel env rm PRIVATE_KEY production --yes" -ForegroundColor White
    Write-Host "  Get-Content private-key.pem -Raw | vercel env add PRIVATE_KEY production" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Key regeneration complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy to Vercel: cd .. ; vercel --prod --force" -ForegroundColor White
Write-Host "2. Test your flow" -ForegroundColor White
Write-Host ""
Write-Host "📁 Generated files:" -ForegroundColor Cyan
Write-Host "  - public-key.pem (uploaded to Meta)" -ForegroundColor Gray
Write-Host "  - private-key.pem (added to Vercel)" -ForegroundColor Gray
Write-Host ""
