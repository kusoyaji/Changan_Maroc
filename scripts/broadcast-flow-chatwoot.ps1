# Broadcast Flow to Multiple Customers with Phone Number Tracking
# This ensures EVERY customer's phone number is captured

$vercelUrl = "https://changansurvey.vercel.app"
$chatwootUrl = "https://chat.voomdigital.net"
$chatwootToken = $env:CHATWOOT_ACCESS_TOKEN  # Set this in your environment
$accountId = "14"

# Option 1: Manually define customer list
$customers = @(
    @{ phoneNumber = "+212610059159"; name = "Ahmed" },
    @{ phoneNumber = "+212639085462"; name = "Fatima" },
    @{ phoneNumber = "+212XXXXXXXXX"; name = "Mohammed" }
)

# Option 2: Fetch from Chatwoot (uncomment if you want to use this)
# $customers = Get-ChatwootContacts -Token $chatwootToken -AccountId $accountId

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Broadcasting Flow to $($customers.Count) customers" -ForegroundColor Cyan
Write-Host "========================================`n"

$successCount = 0
$failCount = 0

foreach ($customer in $customers) {
    Write-Host "Sending to: $($customer.name) ($($customer.phoneNumber))" -ForegroundColor Yellow
    
    $body = @{
        phoneNumber = $customer.phoneNumber
        customerName = $customer.name
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$vercelUrl/api/send-flow" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -Body $body
        
        Write-Host "  ✅ Sent! Flow Token: $($response.flowToken)" -ForegroundColor Green
        $successCount++
        
        # Small delay to avoid rate limits
        Start-Sleep -Milliseconds 500
        
    } catch {
        Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Successfully sent: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nEach customer will have their phone number tracked!" -ForegroundColor Green
Write-Host "Check dashboard: $vercelUrl" -ForegroundColor Cyan

# Optional: Function to fetch contacts from Chatwoot
function Get-ChatwootContacts {
    param($Token, $AccountId)
    
    $url = "$chatwootUrl/api/v1/accounts/$AccountId/contacts"
    $headers = @{
        "api_access_token" = $Token
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    
    return $response.payload | ForEach-Object {
        @{
            phoneNumber = $_.phone_number
            name = $_.name
        }
    } | Where-Object { $_.phoneNumber -ne $null }
}
