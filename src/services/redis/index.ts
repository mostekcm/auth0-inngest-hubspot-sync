import { createClient } from "redis/dist";

const LastEventDateKey = "last_event_date";

export interface RedisRequest extends Request {
  redis?: ReturnType<typeof createClient>;
}

let client: ReturnType<typeof createClient> | null = null;

const getClient = async (): Promise<ReturnType<typeof createClient>> =>
  new Promise((resolve, reject) => {
    if (client) return resolve(client);
    createClient({
      url: process.env.REDIS_URL,
    })
      .on("error", (err: Error) => {
        console.log("Redis Client Error", err);
        reject(err);
      })
      .connect()
      .then((redisClient: ReturnType<typeof createClient>) => {
        client = redisClient;
        resolve(redisClient);
      });
  });

export const getValue = async (key: string) =>
  await (await getClient()).get(key);

export const setValue = async (key: string, value: string) =>
  await (await getClient()).set(key, value);

export const getLastEventDate = async () =>
  parseInt((await getValue(LastEventDateKey)) || "0");

export const setLastEventDate = async () =>
  await setValue(LastEventDateKey, Date.now().toString());
