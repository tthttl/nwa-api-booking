import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.res = {
    body: {
        functionKey: process.env.NWA_API_BOOKING_POST_KEY
    },
  };
};

export default httpTrigger;
