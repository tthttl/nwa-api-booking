import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log(req.body);
    //save body as booking item in cosmos db
    //if success => 201 else 500
    context.res = {
        status: 201
    };
};

export default httpTrigger;