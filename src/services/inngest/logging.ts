import { client } from "./client";

export const handleLogEvent = client.createFunction(
  { id: "handle-log-event" },
  {
    event: "logevents/*",
    retries: 10, // this will retry for hours, can set to much longer if we need to retry for weeks, though there's likely a better way to handle this...
  },
  async ({ event, step }) => {
    await step.run(`process logevents/${event.data.payload.type}`, async () => {
      console.log("Received Event: ", event.data.payload);
    });
    return {};
  }
);
