import { setLastEventDate } from "@/services/redis";

export const POST = async () => {
  await setLastEventDate();
  return new Response(null, {
    status: 204,
  });
};
