import { InngestMiddleware, NonRetriableError } from "inngest";
import { getLastEventDate } from "@/services/redis";
import { UserEvent } from "@/services/hubspot";

export const ignoreOldEventsMiddleware = new InngestMiddleware({
  name: "Ignore Old Events Middleware",
  init() {
    return {
      onFunctionRun({ ctx }) {
        return {
          async beforeExecution() {
            const ignoreBeforeTimestamp = await getLastEventDate();

            const userEvent: UserEvent = ctx.event.data.payload;

            const eventTimestamp = new Date(userEvent.time).getTime();

            if (ignoreBeforeTimestamp > eventTimestamp) {
              const message = `Ignoring old event: ${new Date(
                ignoreBeforeTimestamp
              ).toISOString()} > ${new Date(eventTimestamp).toISOString()}`;
              console.log(message);
              throw new NonRetriableError(message);
            }
          },
        };
      },
    };
  },
});
