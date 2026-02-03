# Send Test Flow Message
$accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD"
$phoneNumberId = "634000359806432"
$recipientPhone = "+212610059159"
$flowId = "33540776948903461"

$uri = "https://graph.facebook.com/v21.0/$phoneNumberId/messages"
$flowToken = "test-" + [guid]::NewGuid().ToString()

$body = @{
    messaging_product = "whatsapp"
    to = $recipientPhone
    type = "interactive"
    interactive = @{
        type = "flow"
        header = @{
            type = "text"
            text = "Changan Maroc - Enquete de Satisfaction"
        }
        body = @{
            text = "Bonjour ! Nous aimerions avoir votre avis sur votre experience."
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
                flow_cta = "Commencer l'enquete"
                flow_action = "navigate"
                flow_action_payload = @{
                    screen = "QUESTION_ONE"
                }
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "Test message sent successfully!"
    Write-Host "Message ID: $($response.messages[0].id)"
    Write-Host "Flow Token: $flowToken"
} catch {
    Write-Host "Error sending test message:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
