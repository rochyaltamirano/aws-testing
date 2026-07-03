import { test, expect } from '@playwright/test';
import { LambdaInvoker } from '../utils/LambdaInvoker';
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