import { NonRetriableError } from "inngest";
import { client } from "./client";
import { getLastEventDate } from "../redis";
import {
  createUser,
  deleteUser,
  diffUser,
  getUser,
  updateUser,
  UserEvent,
} from "../hubspot";

const validateApiKey = async (headers: { [key: string]: string }) => {
  for (const key in headers) {
    if (key.toLowerCase() === "authorization") {
      return false; //headers[key] === `Bearer ${process.env.API_TOKEN}`;
    }
  }

  return false;
};

export const handleAuth0Event = client.createFunction(
  { id: "handle-auth0-event" },
  {
    event: "auth0/event.received",
    retries: 10, // this will retry for hours, can set to much longer if we need to retry for weeks, though there's likely a better way to handle this...
  },
  async ({ event, step }) => {
    const verified = await step.run("check-api-key", async () => {
      return await validateApiKey(event.data.headers);
    });
    if (!verified) {
      // WARN: in production you wouldn't want to log or return the API token in the error!!!
      console.log("Headers: ", event.data.headers);
      throw new NonRetriableError(
        "failed token validation: " +
          JSON.stringify(event.data.headers, null, 2)
      );
    }

    let response = {};

    await step.run(`process auth0/${event.data.payload.type}`, async () => {
      console.log("Received Event: ", event.data.payload);

      try {
        const ignoreBeforeTimestamp = await getLastEventDate();

        const userEvent: UserEvent = event.data.payload;

        const eventTimestamp = new Date(userEvent.time).getTime();

        if (ignoreBeforeTimestamp > eventTimestamp) {
          const message = `Ignoring old event: ${new Date(
            ignoreBeforeTimestamp
          ).toISOString()} > ${new Date(eventTimestamp).toISOString()}`;
          console.log(message);
          response = {
            message,
          };
          return;
        }

        const user = await getUser(userEvent);

        switch (userEvent.type) {
          case "user.created":
          case "user.initialized":
            if (user) {
              console.log("skipping user because it already exists: ", user);
              diffUser(user, userEvent);
              break;
            }
          case "user.updated":
            if (!user) {
              await createUser(userEvent);
              break;
            }
            const userTimestamp = parseInt(
              user.auth0_last_event_timestamp || "0"
            );
            const eventTimestamp = new Date(userEvent.time).getTime();
            // Check event time vs last event processed on the user
            if (eventTimestamp > userTimestamp) {
              await updateUser(user, userEvent);
              break;
            }
            console.log(
              `Not updating user because ${eventTimestamp} <= ${userTimestamp}`
            );
            break;
          case "user.deleted":
            if (!user) {
              console.log("Can't delete non-existing user");
              break;
            }

            await deleteUser(user);
            break;
        }

        return (response = {
          message: "User event processed successfully",
        });
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error("Failed to process event", e, event);
          console.error(e.message);
        } else {
          console.error("Failed to process event for unknown reason", e, event);
        }
        throw e;
      }
    });
    return response;
  }
);
