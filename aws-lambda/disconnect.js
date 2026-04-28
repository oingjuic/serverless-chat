const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    const params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            connectionId: connectionId
        }
    };

    try {
        await docClient.delete(params).promise();
        return { statusCode: 200, body: 'Disconnected.' };
    } catch (err) {
        console.error("Error deleting connection:", err);
        return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) };
    }
};
