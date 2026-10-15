import { HealthResponse } from '../types/index.js';

export class HealthService {
  public static getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'ecotwin-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
