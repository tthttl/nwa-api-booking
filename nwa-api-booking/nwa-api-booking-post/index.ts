import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import appInsights = require("applicationinsights");

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
const client = appInsights.defaultClient;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log(req.body);
    client.trackEvent({name: "NWA-API-BOOKING-POST Request Received", properties: {requestBody: req.body}});
    //save body as booking item in cosmos db
    //if success => 201 else 500
    context.res = {
        status: 201
    };
};

export default httpTrigger;