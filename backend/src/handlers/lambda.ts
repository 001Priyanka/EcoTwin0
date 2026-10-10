import { configure } from "@vendia/serverless-express";
import { createApp } from "./app.ts";

export const handler = configure({ app: createApp() });
