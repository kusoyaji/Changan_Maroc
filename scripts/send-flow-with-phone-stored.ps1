# Send Flow AND Store Phone Number
# This script uses the /api/send-flow endpoint to send Flow and store phone number

$vercelUrl = "https://changansurvey.vercel.app"
$recipientPhone = "+212610059159"  # YOUR PHONE NUMBER
$customerName = "Test User"

Write-Host "Sending Flow with phone number storage..." -ForegroundColor Cyan
Write-Host "Phone: $recipientPhone"
Write-Host ""

$body = @{
    phoneNumber = $recipientPhone
    customerName = $customerName
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
    Write-Host "When you complete the Flow, your phone number will appear in the dashboard."
    
} catch {
    Write-Host "Error sending Flow:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
