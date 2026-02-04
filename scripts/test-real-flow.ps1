# Test Real Flow - Simulates Chatwoot sending a Flow
# This simulates the complete production flow:
# 1. Chatwoot sends Flow to WhatsApp
# 2. Chatwoot webhook fires (captures phone + name)
# 3. User fills Flow
# 4. System retrieves phone + name automatically

# === CONFIGURATION ===
$phoneNumber = "+212610059159"  # Your phone number (where to send)
$customerName = "Mehdi Test"     # Simulated WhatsApp display name

# WhatsApp API credentials (from Vercel environment)
$accessToken = "EAAWqkyU5JYYBQjXOfEnzw1tO3APGrZAlkG8AaPFZArGheRPK0FpAqiCcdLRyjsBSkAU9jkERZB51gfXHFo9qH3ZA5X6DYlLhU3yIgbgYCWtDsvGnGOA6PR5QyliJEnbSgaidpEE1c3nVwGCioXzTcDLPFQdqlCf8aUNqmc1gc8KTeUM0XTYUpVRfzXlulwZDZD"
$phoneNumberId = "634000359806432"
$flowId = "1301085347579095"

# === SCRIPT START ===
$webhookUrl = "https://changansurvey.vercel.app/api/chatwoot-webhook"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Simulating Real Chatwoot Flow" -ForegroundColor Cyan
Write-Host "========================================`n"

# Generate unique flow_token (like WhatsApp would)
$timestamp = [int](Get-Date -UFormat %s)
$randomBytes = [System.Guid]::NewGuid().ToString("N").Substring(0, 16)
$flowToken = "flow_${timestamp}_${randomBytes}"

Write-Host "Generated flow_token: $flowToken" -ForegroundColor Yellow

# Step 1: Send Flow via WhatsApp API (like Chatwoot does)
Write-Host "`n[Step 1] Sending Flow to WhatsApp..." -ForegroundColor Cyan

$formattedPhone = $phoneNumber.Replace('+', '')
$messageUrl = "https://graph.facebook.com/v21.0/$phoneNumberId/messages"

$messagePayload = @{
    messaging_product = "whatsapp"
    to = $formattedPhone
    type = "interactive"
    interactive = @{
        type = "flow"
        header = @{
            type = "text"
            text = "Changan Maroc - Enquête de Satisfaction"
        }
        body = @{
            text = "Bonjour $customerName ! Nous aimerions avoir votre avis sur votre expérience."
        }
        footer = @{
            text = "Prend 2 minutes"
        }
        action = @{
            name = "flow"
            parameters = @{
                flow_message_version = "3"
                flow_token = $flowToken
                flow_id = $flowId
                flow_cta = "Commencer l'enquête"
                flow_action = "navigate"
                flow_action_payload = @{
                    screen = "QUESTION_ONE"
                }
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $messageUrl `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        } `
        -Body $messagePayload
    
    $messageId = $response.messages[0].id
    Write-Host "✅ Flow sent to WhatsApp" -ForegroundColor Green
    Write-Host "   Message ID: $messageId" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Failed to send Flow!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Simulate Chatwoot webhook (captures phone + name)
Write-Host "`n[Step 2] Triggering Chatwoot webhook..." -ForegroundColor Cyan

$chatwootEvent = @{
    event = "message_created"
    account = @{
        id = 14
        name = "Voom Digital"
    }
    conversation = @{
        id = (Get-Random -Minimum 10000 -Maximum 99999)
        status = "open"
        meta = @{
            sender = @{
                id = (Get-Random -Minimum 10000 -Maximum 99999)
                name = $customerName
                phone_number = $phoneNumber
                identifier = $phoneNumber
            }
        }
    }
    message = @{
        id = (Get-Random -Minimum 10000 -Maximum 99999)
        content = "Flow sent with token: $flowToken"
        message_type = 1  # outgoing
        created_at = [int](Get-Date -UFormat %s)
        content_attributes = @{
            flow_token = $flowToken
        }
    }
    sender = @{
        phone_number = $phoneNumber
        name = $customerName
    }
} | ConvertTo-Json -Depth 10

try {
    $webhookResponse = Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $chatwootEvent
    
    Write-Host "✅ Webhook captured phone + name" -ForegroundColor Green
    Write-Host "   Phone: $phoneNumber" -ForegroundColor Gray
    Write-Host "   Name: $customerName" -ForegroundColor Gray
    Write-Host "   Token: $flowToken" -ForegroundColor Gray
    
} catch {
    Write-Host "⚠️  Webhook call failed (but Flow was sent)" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Test Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Check your WhatsApp ($phoneNumber)" -ForegroundColor Yellow
Write-Host "2. Fill the survey" -ForegroundColor Yellow
Write-Host "3. Check dashboard - you'll see:" -ForegroundColor Yellow
Write-Host "   - Name: $customerName" -ForegroundColor Cyan
Write-Host "   - Phone: $phoneNumber" -ForegroundColor Cyan
Write-Host "   - All survey responses" -ForegroundColor Cyan
Write-Host ""
Write-Host "This simulates EXACTLY what happens in production!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
