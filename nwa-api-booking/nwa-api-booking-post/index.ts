import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import appInsights = require("applicationinsights");
import { Container, CosmosClient, Database } from "@azure/cosmos";

interface NatoursUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

type tourType = "tour1" | "tour2" | "tour3";
interface Booking {
  readonly id?: string;
  readonly tourType: tourType;
  readonly user?: NatoursUser;
}

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
const appInsightsClient = appInsights.defaultClient;

let database: Database;
let container: Container;
const endpoint = process.env.NWA_COSMOS_DB_ENDPOINT;
const key = process.env.NWA_COSMOS_DB_KEY;
const client = new CosmosClient({ endpoint, key });

const initializeContainer = async (context: Context): Promise<{ database: Database; container: Container }> => {
  const { database } = await client.databases.createIfNotExists({ id: "NWA-DB" });
  context.log(database.id);
  const { container } = await database.containers.createIfNotExists({ id: "Booking Container" });
  context.log(container.id);
  return {
    database,
    container,
  };
};

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log(req.body);
  appInsightsClient.trackEvent({
    name: "NWA-API-BOOKING-POST Request Received",
    properties: { requestBody: req.body },
  });

  if (!database || !container) {
    const result = await initializeContainer(context);
    database = result.database;
    container = result.container;
  }

  try {
    if (req.body && req.body.selectedTour) {
      const booking: Booking = {
        tourType: req.body.selectedTour,
        user: {
            id: req.body.userId,
            name: req.body.name,
            email: req.body.email
        }
      };
      const { resource } = await container.items.create(booking);
      context.res = {
        status: 201,
        body: {
          id: resource.id,
        },
      };
    } else {
        context.res = {
            status: 400,
          };
    }
  } catch (error) {
    appInsightsClient.trackException({ exception: error });
    context.res = {
      status: 500,
    };
  }
};

export default httpTrigger;
