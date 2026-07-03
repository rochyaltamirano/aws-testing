import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { config } from "dotenv";
config();

export class LambdaInvoker {
    private lambdaCliente: LambdaClient;

    constructor() {
        this.lambdaCliente = new LambdaClient({ region: process.env.AWS_REGION });
    }
    
    public async invocarLambda(functionName: string, payload: object): Promise<any> {
        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: Buffer.from(JSON.stringify(payload)),
            InvocationType: "RequestResponse",
        });

        try {
            const response = await this.lambdaCliente.send(command);
            const responsePayload = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
            console.log("Respuesta de la Lambda:", responsePayload);

            return responsePayload;
        } catch (error) {
            console.error("Error al invocar la Lambda, revisar la config: ", error);
            throw error;
        }

    }
}