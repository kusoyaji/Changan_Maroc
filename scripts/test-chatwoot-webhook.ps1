# Test Chatwoot Webhook Integration
# Simulates what Chatwoot sends when a message is created

$webhookUrl = "https://changansurvey.vercel.app/api/chatwoot-webhook"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Chatwoot Webhook Integration" -ForegroundColor Cyan
Write-Host "========================================`n"

# Simulate a message_created event (when Flow is sent)
$messageCreatedEvent = @{
    event = "message_created"
    account = @{
        id = 14
        name = "Voom Digital"
    }
    conversation = @{
        id = 12345
        status = "open"
        meta = @{
            sender = @{
                id = 67890
                name = "Test Customer"
                phone_number = "+212610059159"
                identifier = "+212610059159"
            }
        }
    }
    message = @{
        id = 99999
        content = "Flow sent with token: flow_1770214296362_test123"
        message_type = 1  # outgoing
        created_at = [int](Get-Date -UFormat %s)
        content_attributes = @{
            flow_token = "flow_1770214296362_test123"
        }
    }
    sender = @{
        phone_number = "+212610059159"
        name = "Test Customer"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Sending message_created event..." -ForegroundColor Yellow
Write-Host $messageCreatedEvent -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $messageCreatedEvent
    
    Write-Host "`n✅ Webhook received successfully!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Webhook failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check Vercel logs for phone number capture"
Write-Host "2. Send real Flow from Chatwoot"
Write-Host "3. Verify phone number appears in dashboard"
Write-Host "========================================" -ForegroundColor Cyan
