# Test Chatwoot API Connection
# Verifies that the Chatwoot access token works and can fetch conversations

$chatwootUrl = "https://chat.voomdigital.net"
$accountId = "14"
$accessToken = "j4qE9vZUww2LgHHNxDVJdpPp"

Write-Host "🔍 Testing Chatwoot API Connection..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Get recent conversations
Write-Host "Test 1: Fetching recent conversations..." -ForegroundColor Yellow
$conversationsUrl = "$chatwootUrl/api/v1/accounts/$accountId/conversations?status=all`&page=1"

try {
    $response = Invoke-RestMethod -Uri $conversationsUrl -Headers @{
        "api_access_token" = $accessToken
        "Content-Type" = "application/json"
    }
    
    $conversations = $response.payload
    Write-Host "✅ Success! Found $($conversations.Count) conversations" -ForegroundColor Green
    
    # Show first 3 conversations
    if ($conversations.Count -gt 0) {
        Write-Host "`nFirst 3 conversations:" -ForegroundColor Cyan
        $conversations[0..([Math]::Min(2, $conversations.Count - 1))] | ForEach-Object {
            $phone = $_.meta.sender.phone_number
            $name = $_.meta.sender.name
            $id = $_.id
            Write-Host "  ID: $id | Contact: $name | Phone: $phone"
        }
    }
} catch {
    Write-Host "❌ Failed to fetch conversations" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""

# Test 2: Search for a specific term
Write-Host "Test 2: Testing search functionality..." -ForegroundColor Yellow
$searchUrl = "$chatwootUrl/api/v1/accounts/$accountId/conversations/search?q=flow"

try {
    $searchResponse = Invoke-RestMethod -Uri $searchUrl -Headers @{
        "api_access_token" = $accessToken
        "Content-Type" = "application/json"
    }
    
    $searchResults = $searchResponse.payload
    Write-Host "✅ Search works! Found $($searchResults.Count) results for 'flow'" -ForegroundColor Green
} catch {
    Write-Host "❌ Search failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""

# Test 3: Get contact details (if we have a conversation)
if ($conversations.Count -gt 0) {
    $firstContact = $conversations[0].meta.sender.id
    Write-Host "Test 3: Fetching contact details for ID: $firstContact..." -ForegroundColor Yellow
    $contactUrl = "$chatwootUrl/api/v1/accounts/$accountId/contacts/$firstContact"
    
    try {
        $contactResponse = Invoke-RestMethod -Uri $contactUrl -Headers @{
            "api_access_token" = $accessToken
            "Content-Type" = "application/json"
        }
        
        $contact = $contactResponse.payload
        Write-Host "✅ Contact retrieved!" -ForegroundColor Green
        Write-Host "  Name: $($contact.name)"
        Write-Host "  Phone: $($contact.phone_number)"
        Write-Host "  Email: $($contact.email)"
    } catch {
        Write-Host "❌ Failed to fetch contact" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "🎯 Chatwoot API Test Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Send a WhatsApp Flow via Chatwoot broadcast"
Write-Host "2. User completes the Flow"
Write-Host "3. Check Vercel logs: vercel logs --follow"
Write-Host "4. Verify phone number appears in webhook logs"
Write-Host "5. Check dashboard: https://changansurvey.vercel.app"

