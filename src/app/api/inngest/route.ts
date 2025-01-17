// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { client } from "@/services/inngest/client";
import { helloWorld } from "@/services/inngest/functions"; // Your own functions

export const { GET, POST, PUT } = serve({
  client,
  functions: [helloWorld],
});
