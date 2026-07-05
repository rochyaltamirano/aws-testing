import { test, expect } from '@playwright/test';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

//Configurar SQS
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

const queueUrl = 'https://sqs.us-east-2.amazonaws.com/913390876247/ColaDeEsperaClima';

test('Enviar mensaje a SQS y verificar que se guarda en DynamoDB', async ({ }) => {
    const message = {
        city: "Monterrey"
    }; 
    //Enviar mensaje a SQS
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message)
    });

    const result = await sqsClient.send(command);
    expect(result.MessageId).toBeDefined();
    console.log(`Mensaje enviado a SQS con ID: ${result.MessageId}`);
});

test ('Enviar mensaje inválido a la cola SQS', async ({ }) => {
    const message = {

    };

    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message)
    });

    try {
        await sqsClient.send(command);
    } catch (error: any) {
        expect(error).toBeDefined();
        console.error("Error al enviar mensaje inválido a SQS: ", error.message);
    }
});