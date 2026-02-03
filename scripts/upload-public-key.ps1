# Upload Public Key to WhatsApp Business Platform
$accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD"
$phoneNumberId = "634000359806432"

# Read public key
$publicKey = Get-Content -Path "public-key.pem" -Raw

# Upload to WhatsApp
$uri = "https://graph.facebook.com/v21.0/$phoneNumberId/whatsapp_business_encryption"
$body = @{
    business_public_key = $publicKey
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "Public key uploaded successfully!"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error uploading public key:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
