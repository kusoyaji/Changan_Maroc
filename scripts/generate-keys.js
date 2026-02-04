const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate RSA key pair (2048-bit)
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save keys in the root directory
const rootDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(rootDir, 'public-key.pem'), publicKey);
fs.writeFileSync(path.join(rootDir, 'private-key.pem'), privateKey);

console.log('RSA keys generated successfully!');
console.log('\nPublic Key (upload to WhatsApp):');
console.log(publicKey);
console.log('\nPrivate Key (add to Vercel env as PRIVATE_KEY):');
console.log(privateKey);
