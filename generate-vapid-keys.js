// Run this ONCE to generate your VAPID keys:
// node generate-vapid-keys.js
// Then copy the output into your .env file and Vercel environment variables.

const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();

console.log('\n=== VAPID KEYS — copy these into your .env and Vercel ===\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\n⚠️  Keep the private key secret. Never commit it to git.\n');
