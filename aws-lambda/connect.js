const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    // API Gateway passes the connection ID in the event object
    const connectionId = event.requestContext.connectionId;

    const params = {
        TableName: process.env.TABLE_NAME, // Provided via Environment Variable
        Item: {
            connectionId: connectionId
        }
    };

    try {
        await docClient.put(params).promise();
        return { statusCode: 200, body: 'Connected.' };
    } catch (err) {
        console.error("Error saving connection:", err);
        return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
    }
};
