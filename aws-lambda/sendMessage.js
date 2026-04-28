const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const senderConnectionId = event.requestContext.connectionId;
    const domainName = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    // API Gateway Management API allows us to push data back to clients
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        endpoint: domainName + '/' + stage
    });

    const body = JSON.parse(event.body);
    const postData = JSON.stringify({
        action: 'message',
        sender: body.sender,
        content: body.content
    });

    try {
        // 1. Get all connected clients from DynamoDB
        const connectionData = await docClient.scan({ TableName: process.env.TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();

        // 2. Send message to all connected clients EXCEPT the sender
        const postCalls = connectionData.Items.map(async ({ connectionId }) => {
            if (connectionId === senderConnectionId) return; // Don't echo to sender
            
            try {
                await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
            } catch (e) {
                if (e.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${connectionId}`);
                    await docClient.delete({ TableName: process.env.TABLE_NAME, Key: { connectionId } }).promise();
                } else {
                    throw e;
                }
            }
        });

        await Promise.all(postCalls);
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    return { statusCode: 200, body: 'Data sent.' };
};
