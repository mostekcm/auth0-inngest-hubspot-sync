import { setLastEventDate } from "@/services/redis";
import type { NextApiRequest, NextApiResponse } from "next";

export const POST = async (req: NextApiRequest, res: NextApiResponse<void>) => {
  await setLastEventDate();
  return res.status(204).send();
};
