const https = require('https');
const fs = require('fs');

const accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD";
const flowId = "33540776948903461";

async function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: responseData });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function forceReset() {
  console.log('🔧 FORCE RESET - Deleting endpoint completely\n');
  
  // Step 1: Try to unpublish the flow
  console.log('Step 1: Unpublishing flow...');
  let res = await makeRequest(`/v21.0/${flowId}/unpublish`, 'POST', '{}');
  console.log('Unpublish:', res.body, '\n');
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 2: Delete endpoint configuration using DELETE method
  console.log('Step 2: Deleting endpoint...');
  res = await makeRequest(`/v21.0/${flowId}`, 'DELETE', null);
  console.log('Delete:', res.body, '\n');
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 3: Set everything fresh
  console.log('Step 3: Setting fresh endpoint + encryption...');
  const publicKey = fs.readFileSync('../PRODUCTION-public-key.pem', 'utf8');
  
  const setupData = JSON.stringify({
    endpoint_uri: "https://changansurvey.vercel.app/api/flow",
    whatsapp_business_encryption: publicKey
  });
  
  res = await makeRequest(`/v21.0/${flowId}`, 'POST', setupData);
  console.log('Setup:', res.body, '\n');
  
  if (JSON.parse(res.body).success) {
    console.log('✅ Complete reset done!');
    console.log('Now click Health Check in WhatsApp UI');
  }
}

forceReset().catch(console.error);
