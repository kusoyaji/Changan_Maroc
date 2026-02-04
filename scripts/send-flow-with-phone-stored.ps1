# Send Flow AND Store Phone Number
# This script uses the /api/send-flow endpoint to send Flow and store phone number
# Customer name will be automatically captured from Chatwoot when user responds

$vercelUrl = "https://changansurvey.vercel.app"
$recipientPhone = "+212610015189"  # YOUR PHONE NUMBER

Write-Host "Sending Flow with phone number storage..." -ForegroundColor Cyan
Write-Host "Phone: $recipientPhone"
Write-Host ""

$body = @{
    phoneNumber = $recipientPhone
    # NO customerName - let Chatwoot provide the real WhatsApp name
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$vercelUrl/api/send-flow" -Method POST -Headers @{
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "Flow sent successfully!" -ForegroundColor Green
    Write-Host "Message ID: $($response.messageId)"
    Write-Host "Flow Token: $($response.flowToken)"
    Write-Host "Phone Number: $($response.phoneNumber)"
    Write-Host ""
    Write-Host "Phone number has been stored!" -ForegroundColor Green
    Write-Host "Customer name will be captured from WhatsApp when you respond."
    Write-Host "When you complete the Flow, your REAL WhatsApp name + phone will appear!"
    
} catch {
    Write-Host "Error sending Flow:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
