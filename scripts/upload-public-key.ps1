# Upload Public Key to WhatsApp Business Platform
$accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD"
$phoneNumberId = "634000359806432"

# Read public key
$publicKey = Get-Content -Path "../public-key.pem" -Raw

# Upload to WhatsApp Flow via WABA endpoint
$wabaId = "634000359806432"  # This is actually the Phone Number ID, but let's try WABA approach
$flowId = "33540776948903461"

# First, let's try to get the Flow info to confirm it exists
Write-Host "Step 1: Checking Flow accessibility..." -ForegroundColor Yellow
$checkUri = "https://graph.facebook.com/v21.0/$flowId"

try {
    $flowInfo = Invoke-RestMethod -Uri $checkUri -Method GET -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "✅ Flow found: $($flowInfo.name)" -ForegroundColor Green
    Write-Host ""
    
    # Now upload the public key
    Write-Host "Step 2: Uploading public key..." -ForegroundColor Yellow
    $uri = "https://graph.facebook.com/v21.0/$flowId"
    
    # Try with application_id field (sometimes needed)
    # Remove PEM headers and format for API
    $publicKeyContent = $publicKey -replace '-----BEGIN PUBLIC KEY-----', '' -replace '-----END PUBLIC KEY-----', '' -replace '\r?\n', ''
    
    $body = @{
        encryption_key = $publicKeyContent.Trim()
    } | ConvertTo-Json
    
    Write-Host "Sending key (first 50 chars): $($publicKeyContent.Trim().Substring(0,50))..."
    
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Public key uploaded successfully!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
