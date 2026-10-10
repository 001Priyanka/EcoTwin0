import type { ZoneDetails } from "../types/environmental.ts";

export interface EnvironmentalDataProvider {
  readonly name: string;
  listZones(): Promise<ZoneDetails[]>;
  findZone(zoneId: string): Promise<ZoneDetails | undefined>;
}
