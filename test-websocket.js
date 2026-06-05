// Simple WebSocket test to verify messages are broadcast correctly
const WebSocket = require('ws');

const taskId = process.argv[2] || 'test-task';

console.log(`Connecting to ws://localhost:3001 and subscribing to task: ${taskId}`);

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  ws.send(JSON.stringify({ type: 'subscribe', taskId }));
  console.log(`Subscribed to task: ${taskId}`);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('\n=== Received Message ===');
    console.log(`Type: ${msg.type}`);
    console.log(`Task ID: ${msg.taskId}`);
    if (msg.data) {
      console.log(`Data: ${JSON.stringify(msg.data, null, 2).slice(0, 500)}...`);
    }
    console.log('========================\n');
  } catch (err) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

// Close after 30 seconds
setTimeout(() => {
  console.log('Test complete, closing connection...');
  ws.close();
}, 30000);
