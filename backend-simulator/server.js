const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Map to hold connected clients, simulating API Gateway connection management
const clients = new Map();

wss.on('connection', function connection(ws) {
  // Generate a random connection ID, similar to AWS API Gateway $connect route
  const connectionId = Math.random().toString(36).substring(2, 15);
  clients.set(ws, connectionId);

  console.log(`[API Gateway Simulation] New connection: ${connectionId}`);

  // Simulate welcoming the user
  ws.send(JSON.stringify({
      action: 'system',
      content: `System: You are connected securely.`
  }));

  ws.on('message', function message(data) {
    console.log(`[Lambda Simulation] Received data from ${connectionId}: %s`, data);
    
    try {
        const payload = JSON.parse(data);
        
        // Simulating the "sendmessage" Lambda route
        if (payload.action === 'sendmessage') {
            const sender = payload.sender;
            const content = payload.content;

            // Broadcast to everyone else (simulating querying DynamoDB for all connections
            // and using API Gateway Management API to postToConnection)
            clients.forEach((cId, client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        action: 'message',
                        sender: sender,
                        content: content
                    }));
                }
            });
        }
    } catch (e) {
        console.error('Error processing message:', e);
    }
  });

  ws.on('close', function close() {
      // Simulating the $disconnect route
      console.log(`[API Gateway Simulation] Disconnected: ${connectionId}`);
      clients.delete(ws);
  });
});

console.log('Mock Serverless API Gateway running on ws://localhost:8080');
