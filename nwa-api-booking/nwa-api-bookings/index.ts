import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import appInsights = require("applicationinsights");
import { Container, CosmosClient, Database, SqlQuerySpec } from "@azure/cosmos";

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
  if (!database || !container) {
    const result = await initializeContainer(context);
    database = result.database;
    container = result.container;
  }

  if (req.method === "POST") {
    appInsightsClient.trackEvent({
      name: "POST Request Received",
      properties: { body: req.body },
    });
    try {
      if (req.body && req.body.selectedTour) {
        const booking: Booking = {
          tourType: req.body.selectedTour,
          user: {
            id: req.body.userId,
            name: req.body.name,
            email: req.body.email,
          },
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
  } else {
    appInsightsClient.trackEvent({
      name: "GET Request Received",
      properties: { query: req.query },
    });
    try {
      if (req.query && req.query.userid) {
        const parametrizedQuery: SqlQuerySpec = {
          query:
            "select b.id as bookingId, " +
            "b.tourType as tourType, " +
            "b.user.id as userId, " +
            "b.user.name as name, " +
            "b.user.email as email " +
            "from bookings b where b.user.id = @userId",
          parameters: [{ name: "@userId", value: req.query.userid }],
        };
        const { resources } = await container.items.query(parametrizedQuery).fetchAll();
        const bookings: Booking[] = resources.map((resource) => ({
            id: resource.bookingId, 
            tourType: resource.tourType,
            user: {
                id: resource.userId,
                name: resource.name,
                email: resource.email
            }
        }));

        appInsightsClient.trackEvent({
          name: "COSMOS DB Result",
          properties: { resource: bookings },
        });

        if (bookings?.length > 0) {
          context.res = {
            status: 200,
            body: [bookings],
          };
        } else {
          context.res = {
            status: 404,
          };
        }
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
  }
};

export default httpTrigger;
