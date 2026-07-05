import { test, expect } from '@playwright/test';
import { LambdaInvoker } from '../utils/LambdaInvoker';
import * as AWS from 'aws-sdk';

//Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const tableName = "city";

test('Probando flujo positivo del lambda Clima', async ({}) => {
    const lambdaInvoker = new LambdaInvoker();
    const lambdaResponse = await lambdaInvoker.invocarLambda("Clima", {
        Records: [
            {
                body: JSON.stringify({ city: "Monterrey" })
            }
        ]
    });

    expect(lambdaResponse).toBeDefined();

    const responseBody = JSON.parse(lambdaResponse.body);
    expect(responseBody.message).toBeDefined();
    expect(responseBody.message).toContain('Mensajes procesados correctamente');

    console.log("Respuesta completa:p ", responseBody);
});

test ('Verificar que la ciudad fue escrita en DynamoDB', async ({ })=> {
    const cityName = "Monterrey";

    const lambdaInvoker = new LambdaInvoker();
    const lambdaResponse = await lambdaInvoker.invocarLambda("Clima", {
        Records: [
            {
                body: JSON.stringify({ city: cityName })
            }
        ]
    });

    expect(lambdaResponse).toBeDefined();

    await new Promise(resolve => setTimeout(resolve, 2000));

    const params = {
        TableName: tableName,
        Key: { city: cityName }
    };

    const result = await dynamoDB.get(params).promise();
    
    //Verificar que result.item esté definido a tes de acceder a sus propiedades
    expect(result.Item).toBeDefined();

    if (result.Item) {
        expect(result.Item.city).toBe(cityName);
        console.log("Ciudad encontrada en DynamoDB:", result.Item.city);
    } else {
        console.error("No se encontró la ciudad en DynamoDB.");
    }   
});
