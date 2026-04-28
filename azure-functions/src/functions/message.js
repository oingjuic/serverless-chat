const { app } = require('@azure/functions');
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

app.http('message', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return { status: 200, headers: { 'WebHook-Allowed-Origin': '*' } };
        }

        try {
            const eventType = request.headers.get('ce-type');
            const connectionId = request.headers.get('ce-connectionid');
            const serviceClient = new WebPubSubServiceClient(process.env.WebPubSubConnectionString, "chat");

            if (eventType === 'azure.webpubsub.sys.connected' || eventType === 'azure.webpubsub.sys.disconnected') {
                return { status: 200 }; // Handled gracefully
            }

            const body = await request.text();
            let cloudEvent;
            try { cloudEvent = JSON.parse(body); } catch (e) { return { status: 200 }; }

            let chatMessage = {};
            if (cloudEvent && cloudEvent.data) {
                if (typeof cloudEvent.data === 'string') {
                    try { chatMessage = JSON.parse(cloudEvent.data); } catch(e){}
                } else { chatMessage = cloudEvent.data; }
            } else { chatMessage = cloudEvent; }

            const room = chatMessage.room || 'general';

            if (chatMessage && chatMessage.action === 'joinroom') {
                // Assign the user's connection to the specific Azure Web PubSub Group
                await serviceClient.group(room).addConnection(connectionId);
                await serviceClient.group(room).sendToAll({ action: 'system', content: `Someone joined #${room}` });
            } 
            else if (chatMessage && chatMessage.action === 'sendmessage') {
                const content = chatMessage.content || '';
                const sender = chatMessage.sender || 'Anonymous';
                
                // Broadcast exclusively to users in this specific room
                await serviceClient.group(room).sendToAll({
                    action: 'message',
                    sender: sender,
                    content: content
                });

                // Serverless Bot Logic Interception
                if (content.startsWith('/')) {
                    let botReply = '';
                    if (content === '/joke') botReply = "Why do programmers prefer dark mode? Because light attracts bugs!";
                    else if (content === '/roll') botReply = `You rolled a ${Math.floor(Math.random() * 6) + 1}! 🎲`;
                    else if (content === '/help') botReply = "Available Commands: /joke, /roll, /help";
                    else botReply = `Unknown command: ${content}. Try /help`;

                    // Send bot reply after 500ms to feel "human"
                    setTimeout(async () => {
                        await serviceClient.group(room).sendToAll({
                            action: 'message',
                            sender: 'ServerBot 🤖',
                            content: botReply
                        });
                    }, 500);
                }
            } 
            else if (chatMessage && chatMessage.action === 'typing') {
                await serviceClient.group(room).sendToAll({
                    action: 'typing',
                    sender: chatMessage.sender || 'Anonymous'
                });
            }

            return { status: 200, body: "Success" };
        } catch (err) {
            context.error("Error: ", err);
            return { status: 500, body: "Error" };
        }
    }
});
