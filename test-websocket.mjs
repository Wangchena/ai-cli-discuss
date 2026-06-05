// Simple WebSocket test using fetch API
const taskId = process.argv[2] || 'test-task';

console.log(`Testing WebSocket connection to ws://localhost:3001`);
console.log(`Subscribing to task: ${taskId}\n`);

// Create a simple test using Node's built-in fetch
async function testWebSocket() {
  // First, let's just verify the HTTP API is working
  try {
    const health = await fetch('http://localhost:3000/health');
    console.log('HTTP API Health Check:', await health.json());
  } catch (err) {
    console.error('HTTP API not available:', err.message);
    process.exit(1);
  }

  console.log('\nTo test WebSocket messages:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Submit a task');
  console.log('3. Check the browser console for WebSocket messages');
  console.log('\nOr use this browser console command:');
  console.log(`
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', taskId: '${taskId}' }));
  console.log('Subscribed to', '${taskId}');
};
ws.onmessage = (e) => {
  console.log('Received:', JSON.parse(e.data));
};
  `);
}

testWebSocket().catch(console.error);
