# Remove and Re-upload Public Key to WhatsApp
$accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD"
$phoneNumberId = "634000359806432"

Write-Host "Step 1: Removing old public key..."
$deleteUri = "https://graph.facebook.com/v21.0/$phoneNumberId/whatsapp_business_encryption"

try {
    $deleteResponse = Invoke-RestMethod -Uri $deleteUri -Method DELETE -Headers @{
        "Authorization" = "Bearer $accessToken"
    }
    Write-Host "Old key removed successfully!"
    Write-Host ($deleteResponse | ConvertTo-Json)
} catch {
    Write-Host "Note: Could not remove old key (might not exist or already removed)"
    Write-Host $_.Exception.Message
}

Start-Sleep -Seconds 2

Write-Host "`nStep 2: Uploading new public key..."
$publicKey = Get-Content -Path "public-key.pem" -Raw

$uploadUri = "https://graph.facebook.com/v21.0/$phoneNumberId/whatsapp_business_encryption"
$body = @{
    business_public_key = $publicKey
} | ConvertTo-Json

try {
    $uploadResponse = Invoke-RestMethod -Uri $uploadUri -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "New public key uploaded successfully!"
    Write-Host ($uploadResponse | ConvertTo-Json)
} catch {
    Write-Host "Error uploading new public key:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
