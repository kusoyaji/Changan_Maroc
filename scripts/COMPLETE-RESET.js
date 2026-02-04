const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const accessToken = "EAAUFgRUbRc0BQip6ZCLZAVBcRpZBlo5di2JBpRWeDyC6BhidZC3fe5I9TcjKbh2ku0SvV5NdxCAio8HC4QRm7ZBLqj4nh15I9WvOZCvSAYV2B1ZB9ZAZBzF6BaV9IBDFwnv6AzNAdHzKOblFwBrDfDO1pkg7XzSfvpOKY9SFZCy5ZALckHDFecFA04cFvFSKmGYMAZDZD";
const flowId = "33540776948903461";

async function makeRequest(method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v21.0/${flowId}`,
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

async function fix() {
  console.log('STEP 1: Deleting old endpoint configuration...\n');
  
  // Try to delete endpoint
  const deleteData = JSON.stringify({ endpoint_uri: null });
  let res = await makeRequest('POST', deleteData);
  console.log('Delete response:', res.body, '\n');
  
  console.log('Waiting 3 seconds...\n');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('STEP 2: Generating fresh RSA keys...\n');
  
  // Generate BRAND NEW keys
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  console.log('✅ New keys generated\n');
  console.log('Public key:\n', publicKey);
  
  // Save keys
  fs.writeFileSync('../PRODUCTION-private-key.pem', privateKey);
  fs.writeFileSync('../PRODUCTION-public-key.pem', publicKey);
  console.log('✅ Keys saved to PRODUCTION-*.pem files\n');
  
  console.log('STEP 3: Uploading fresh public key to WhatsApp...\n');
  
  const setupData = JSON.stringify({
    endpoint_uri: "https://changansurvey.vercel.app/api/flow",
    whatsapp_business_encryption: publicKey
  });
  
  res = await makeRequest('POST', setupData);
  console.log('Upload response:', res.body, '\n');
  
  if (res.status === 200) {
    console.log('✅ SUCCESS! New encryption configured!\n');
    console.log('STEP 4: Updating Vercel with new private key...\n');
    console.log('Run this command:');
    console.log('cd ..; Get-Content PRODUCTION-private-key.pem -Raw | vercel env add PRIVATE_KEY production');
    console.log('\nThen redeploy:');
    console.log('vercel --prod --force');
  } else {
    console.log('❌ Upload failed');
  }
}

fix().catch(console.error);
