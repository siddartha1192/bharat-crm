// Test script to verify webhook endpoint
const http = require('http');

const PORT = process.env.PORT || 3001;

// Test 1: Check if server is responding
console.log('🔍 Testing webhook endpoints...\n');

// Test GET endpoint (webhook verification)
const testGet = {
  hostname: 'localhost',
  port: PORT,
  path: '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=bharat_crm_webhook_token&hub.challenge=test123',
  method: 'GET'
};

console.log('Test 1: GET /api/whatsapp/webhook (Verification)');
console.log(`URL: http://localhost:${PORT}${testGet.path}\n`);

const reqGet = http.request(testGet, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);

    if (res.statusCode === 200 && data === 'test123') {
      console.log('✅ GET webhook verification endpoint is working!\n');
    } else {
      console.log('❌ GET webhook verification failed!\n');
    }

    // Test POST endpoint
    testPost();
  });
});

reqGet.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
  console.log('\n⚠️  Make sure your backend server is running on port', PORT);
  console.log('Run: cd backend && npm start\n');
  process.exit(1);
});

reqGet.end();

// Test POST endpoint (webhook message receiver)
function testPost() {
  const testBody = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          messages: [{
            from: '919876543210',
            id: 'test_msg_123',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: 'Test message from webhook test script'
            }
          }],
          contacts: [{
            wa_id: '919876543210',
            profile: {
              name: 'Test Contact'
            }
          }]
        }
      }]
    }]
  });

  const testPostReq = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/whatsapp/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testBody)
    }
  };

  console.log('Test 2: POST /api/whatsapp/webhook (Message receiver)');
  console.log(`URL: http://localhost:${PORT}${testPostReq.path}\n`);

  const reqPost = http.request(testPostReq, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}`);

      if (res.statusCode === 200 && data === 'EVENT_RECEIVED') {
        console.log('✅ POST webhook message endpoint is working!\n');
        console.log('✅ All tests passed! Your webhook is ready.\n');
        console.log('Next steps:');
        console.log('1. Make sure ngrok is running: ngrok http', PORT);
        console.log('2. Copy the ngrok URL (https://xxxxx.ngrok.io)');
        console.log('3. In Meta Business Suite, set webhook URL to: https://xxxxx.ngrok.io/api/whatsapp/webhook');
        console.log('4. Set verify token to: bharat_crm_webhook_token');
      } else {
        console.log('❌ POST webhook endpoint failed!\n');
      }
    });
  });

  reqPost.on('error', (e) => {
    console.error(`❌ Error: ${e.message}\n`);
  });

  reqPost.write(testBody);
  reqPost.end();
}
