# Send Flow with Phone Number Tracking
# This script sends a WhatsApp Flow and stores the phone number mapping

# MODIFY THESE
$vercelUrl = "https://changansurvey.vercel.app/"  # e.g., https://changan-maroc-survey.vercel.app
$recipientPhone = "+212610059159"
$customerName = "Test Customer"  # Optional

$uri = "$vercelUrl/api/send-flow"

$body = @{
    phoneNumber = $recipientPhone
    customerName = $customerName
} | ConvertTo-Json

Write-Host "Sending Flow to: $recipientPhone"
Write-Host "URL: $uri"

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "`n✅ Flow sent successfully!" -ForegroundColor Green
    Write-Host "Message ID: $($response.messageId)"
    Write-Host "Flow Token: $($response.flowToken)"
    Write-Host "Phone Number: $($response.phoneNumber)"
    Write-Host "Timestamp: $($response.timestamp)"
    
    Write-Host "`n📝 The phone number has been stored and will be linked when the user completes the Flow."
    
} catch {
    Write-Host "`n❌ Error sending Flow:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}
