import type { Response } from "express";

export function sendError(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}
