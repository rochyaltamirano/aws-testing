import { test, expect } from '@playwright/test';
import { LambdaInvoker } from '../utils/LambdaInvoker';
import * as AWS from 'aws-sdk';
import { config } from "dotenv";
config();

// Configuración de AWS SDK
AWS.config.update({ region: process.env.AWS_REGION });

//Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const tableName = "city";

test ('Verificar escritura directa en DynamoDB', async () => {
    const city = "Namek";

    const params = {
        TableName: tableName,
        Item: { city }
    };

    try {
        await dynamoDB.put(params).promise();
        console.log(`Escritura exitosa en DynamoDB para la ciudad ${city}`);

        //Verificamos la lectura
        const getParams = {
            TableName: tableName,
            Key: {
                city: city
            }
        };

        const result = await dynamoDB.get(getParams).promise();
        expect(result.Item).toBeDefined();
        expect(result.Item?.city).toBe(city);

        console.log(`Lectura exitosa en DynamoDB para la ciudad ${city}: `, result.Item);
    } catch (error) {
        console.error("Error al escribir en DynamoDB: ", error);
        throw error;
    }
});


test ('Verificar lectura consistente en DynamoDB', async () => {
    const city = "TestConsistencia";
    const temperature = 22; 

    const writeParams = {
        TableName: tableName,
        Item: { city }
    };

    await dynamoDB.put(writeParams).promise();
    console.log(`Escritura exitosa en DynamoDB para la ciudad ${city}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const getParams = {
        TableName: tableName,
        Key: {
            city: city
        },
        ConsistentRead: true
    };

    const result = await dynamoDB.get(getParams).promise();
    console.log(`Lectura con consistencia fuerte para la ciudad ${city}: `, JSON.stringify(result, null, 2));

    expect.soft(result.Item).toBeDefined();
    expect.soft(result.Item?.city).toBe(city);
});

test ('Verificar configuración de la tabla DynamoDB', async () => {
    const dynamoDB = new AWS.DynamoDB();
    try {
        const tableInfo = await dynamoDB.describeTable({ TableName: tableName }).promise();
        console.log(`Configuración de la tabla ${tableName}: `, JSON.stringify(tableInfo, null, 2));

        expect(tableInfo.Table).toBeDefined();
        expect(tableInfo.Table?.TableStatus).toBe('ACTIVE');

        //verificar la primary key
        const keySchema = tableInfo.Table?.KeySchema;
        expect.soft(keySchema).toBeDefined();
        expect.soft(keySchema?.length).toBeGreaterThan(0);
        expect.soft(keySchema?.[0].AttributeName).toBe('city');
        expect.soft(keySchema?.[0].KeyType).toBe('HASH');

        console.log(`La tabla ${tableName} tiene la configuración correcta.`);

    } catch (error) {
        console.error("Error al obtener la configuración de la tabla: ", error);
        throw error;
    }
});

test ('Simulación de concurrencia: 10 escrituras en DynamoDB', async () => {
    const ciudades = ['Nueva York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Filadelfia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];

    const lambdaInvoker = new LambdaInvoker();
    const respuestas = [];

    for (const ciudad of ciudades) {
        const respuesta = await lambdaInvoker.invocarLambda("Clima", {
            Records: [{ body: JSON.stringify({ city: ciudad }) }]
        });

        respuestas.push(respuesta);
    }

    respuestas.forEach(respuesta => {
        expect(respuesta).toBeDefined();
        expect(respuesta.errorMessage).toBeUndefined();
    });


    //Tiempo de espera antes de ir a verificar a la BD
    await new Promise(resolve => setTimeout(resolve, 3000));

    const resultados = await Promise.all(ciudades.map(ciudad => dynamoDB.get({ TableName: tableName, Key: { city: ciudad } }).promise()));

    resultados.forEach((resultado, indice) => {
        //expect.soft(resultado.Item).toBeDefined();
        if (resultado.Item) {
            expect.soft(resultado.Item.city).toBe(ciudades[indice]);
            console.log(`Resultado en DynamoDB encontrado para ${ciudades[indice]}: `, JSON.stringify(resultado.Item, null, 2));
        }
    });
});

test ('Verificar que la ciudad NO es escrita en DynamoDB cuando la ciudad no se encuentra', async ({ }) =>{
    const city = "CiudadInexistente";

    const lambdaInvoker = new LambdaInvoker();
    const lambdaResponse = await lambdaInvoker.invocarLambda("Clima", {
        Records: [{ body: JSON.stringify({ city }) }]
    });
    console.log("Respuesta del lambda: ", JSON.stringify(lambdaResponse, null, 2));

    expect(lambdaResponse).toBeDefined();

    //esperar un breve tiempo para asegurarnos de que la lambda haya insertado los datos
    await new Promise(resolve => setTimeout(resolve, 2000));

    const getParams = {
        TableName: tableName,
        Key: {
            city: city
        }
    };

    const result = await dynamoDB.get(getParams).promise();
 
    expect(lambdaResponse).toBeDefined();
    expect(lambdaResponse.statusCode).toBeDefined();
    expect(lambdaResponse.statusCode).not.toBe(500);
    expect(result.Item).not.toBeDefined();
}); 