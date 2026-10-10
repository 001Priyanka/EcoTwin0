import express, { type NextFunction, type Request, type Response } from "express";
import { answerQuestion } from "../services/assistantService.ts";
import { simulate } from "../services/simulationService.ts";
import { getCitySummary, getPriorityZones, getZone, getZones } from "../services/zoneService.ts";
import { isHttpError } from "../utils/errors.ts";
import { sendError } from "../utils/httpResponse.ts";

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173").split(",").map((origin) => origin.trim());

  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    const origin = request.header("Origin");
    if (origin && allowedOrigins.includes(origin)) response.header("Access-Control-Allow-Origin", origin);
    response.header("Vary", "Origin");
    response.header("Access-Control-Allow-Headers", "Content-Type");
    response.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (request.method === "OPTIONS") return response.sendStatus(204);
    next();
  });

  app.get("/health", (_request, response) => response.json({ status: "ok", service: "ecotwin-api" }));
  app.get("/zones", async (_request, response) => response.json({ zones: await getZones() }));
  app.get("/zones/:zoneId", async (request, response) => response.json(await getZone(request.params.zoneId)));
  app.get("/summary", async (_request, response) => response.json(await getCitySummary()));
  app.get("/priority-zones", async (request, response) => {
    const rawLimit = request.query.limit ?? "5";
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      return sendError(response, 422, "INVALID_LIMIT", "Limit must be an integer between 1 and 20.");
    }
    return response.json({ zones: await getPriorityZones(limit) });
  });
  app.post("/simulate", async (request, response) => response.json(await simulate(request.body)));
  app.post("/ask", async (request, response) => response.json(await answerQuestion(request.body?.question, request.body?.zoneId)));

  app.use((_request, response) => sendError(response, 404, "NOT_FOUND", "The requested endpoint was not found."));
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (isHttpError(error)) return sendError(response, error.status, error.code, error.message);
    if (error instanceof SyntaxError) return sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
    console.error("[ecotwin-api] unexpected request error", error);
    return sendError(response, 500, "INTERNAL_ERROR", "An unexpected internal error occurred.");
  });
  return app;
}
