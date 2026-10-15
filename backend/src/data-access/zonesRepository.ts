import { ScanCommand, GetCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDbClient, getZonesTableName } from './dynamoClient.js';
import { EnvironmentalZone, ZoneRecordItem, ZoneDetails, AirTelemetry, HeatTelemetry, WasteTelemetry } from '../types/index.js';

export class ZonesRepository {
  /**
   * Scans and returns all environmental zone items from DynamoDB.
   */
  public static async getAllZones(tableName?: string): Promise<EnvironmentalZone[]> {
    const effectiveTableName = tableName || getZonesTableName();

    const command = new ScanCommand({
      TableName: effectiveTableName,
    });

    const response = await dynamoDbClient.send(command);
    const items = (response.Items || []) as ZoneRecordItem[];

    return items.map(this.mapItemToZone);
  }

  /**
   * Retrieves a single zone by ID from DynamoDB.
   */
  public static async getZoneById(zoneId: string, tableName?: string): Promise<EnvironmentalZone | null> {
    const effectiveTableName = tableName || getZonesTableName();

    const command = new GetCommand({
      TableName: effectiveTableName,
      Key: {
        zoneId: zoneId.trim(),
      },
    });

    const response = await dynamoDbClient.send(command);
    if (!response.Item) {
      return null;
    }

    return this.mapItemToZone(response.Item as ZoneRecordItem);
  }

  /**
   * Retrieves full zone details including telemetry sub-objects by ID from DynamoDB.
   */
  public static async getZoneDetailsById(zoneId: string, tableName?: string): Promise<ZoneDetails | null> {
    const effectiveTableName = tableName || getZonesTableName();

    const command = new GetCommand({
      TableName: effectiveTableName,
      Key: {
        zoneId: zoneId.trim(),
      },
    });

    const response = await dynamoDbClient.send(command);
    if (!response.Item) {
      return null;
    }

    return this.mapItemToZoneDetails(response.Item as ZoneRecordItem);
  }

  /**
   * Puts or updates a single zone record in DynamoDB.
   */
  public static async putZone(zone: EnvironmentalZone, tableName?: string): Promise<void> {
    const effectiveTableName = tableName || getZonesTableName();
    const item = this.mapZoneToItem(zone);

    const command = new PutCommand({
      TableName: effectiveTableName,
      Item: item,
    });

    await dynamoDbClient.send(command);
  }

  /**
   * Batch seeds zone records into DynamoDB.
   * Handles DynamoDB's 25-item batch write limit and retries unprocessed items.
   */
  public static async batchPutZones(zones: EnvironmentalZone[], tableName?: string): Promise<void> {
    const effectiveTableName = tableName || getZonesTableName();
    if (zones.length === 0) return;

    // DynamoDB BatchWriteItem supports max 25 items per batch
    const batches: EnvironmentalZone[][] = [];
    for (let i = 0; i < zones.length; i += 25) {
      batches.push(zones.slice(i, i + 25));
    }

    for (const batch of batches) {
      const putRequests = batch.map((zone) => ({
        PutRequest: {
          Item: this.mapZoneToItem(zone),
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [effectiveTableName]: putRequests,
        },
      });

      const response = await dynamoDbClient.send(command);

      // Handle any unprocessed items (e.g. under throttling)
      let unprocessed = response.UnprocessedItems?.[effectiveTableName];
      let retryCount = 0;
      while (unprocessed && unprocessed.length > 0 && retryCount < 3) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, retryCount)));
        const retryResponse = await dynamoDbClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [effectiveTableName]: unprocessed,
            },
          })
        );
        unprocessed = retryResponse.UnprocessedItems?.[effectiveTableName];
      }

      if (unprocessed && unprocessed.length > 0) {
        throw new Error(`Failed to batch write ${unprocessed.length} items to table "${effectiveTableName}" after retries.`);
      }
    }
  }

  /**
   * Maps a DynamoDB ZoneRecordItem to an EnvironmentalZone conforming to the shared contract.
   * Ensures missing measurements are strictly null (never coerced to 0).
   */
  public static mapItemToZone(item: ZoneRecordItem): EnvironmentalZone {
    return {
      id: item.zoneId,
      name: item.name,
      marathiName: item.marathiName,
      category: item.category as EnvironmentalZone['category'],
      wardIdentifier: item.wardIdentifier,
      description: item.description,
      primaryRiskLayer: item.primaryRiskLayer,
      factors: item.factors,
      dataStatus: item.dataStatus,
      updatedAt: item.updatedAt ?? null,
      airRisk: item.airRisk ?? null,
      heatRisk: item.heatRisk ?? null,
      wasteRisk: item.wasteRisk ?? null,
      ecoScore: item.ecoScore ?? null,
    };
  }

  /**
   * Maps an EnvironmentalZone domain object to a DynamoDB storage item.
   */
  public static mapZoneToItem(zone: EnvironmentalZone): ZoneRecordItem {
    return {
      zoneId: zone.id,
      name: zone.name,
      marathiName: zone.marathiName,
      category: zone.category,
      wardIdentifier: zone.wardIdentifier,
      description: zone.description,
      primaryRiskLayer: zone.primaryRiskLayer,
      factors: zone.factors,
      dataStatus: zone.dataStatus,
      updatedAt: zone.updatedAt,
      airRisk: zone.airRisk,
      heatRisk: zone.heatRisk,
      wasteRisk: zone.wasteRisk,
      ecoScore: zone.ecoScore,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Maps a DynamoDB ZoneRecordItem to a full ZoneDetails payload conforming to the shared contract.
   * Preserves granular air, heat, and waste telemetry if present on the item; otherwise constructs
   * truthful default telemetry honoring base values, provenance, and nullability.
   * Missing measurements are strictly preserved as null and never converted to 0.
   */
  public static mapItemToZoneDetails(item: ZoneRecordItem): ZoneDetails {
    const baseZone = this.mapItemToZone(item);

    const airTelemetry: AirTelemetry = {
      aqi: item.air?.aqi !== undefined ? item.air.aqi : null,
      pm25: item.air?.pm25 !== undefined ? item.air.pm25 : null,
      source: item.air?.source !== undefined ? item.air.source : null,
      status: item.air?.status || baseZone.dataStatus,
      timestamp: item.air?.timestamp !== undefined ? item.air.timestamp : (baseZone.updatedAt || null),
    };

    const heatTelemetry: HeatTelemetry = {
      temperatureC: item.heat?.temperatureC !== undefined ? item.heat.temperatureC : null,
      heatRisk: item.heat?.heatRisk !== undefined ? item.heat.heatRisk : baseZone.heatRisk,
      source: item.heat?.source !== undefined ? item.heat.source : null,
      status: item.heat?.status || baseZone.dataStatus,
      timestamp: item.heat?.timestamp !== undefined ? item.heat.timestamp : (baseZone.updatedAt || null),
    };

    const wasteTelemetry: WasteTelemetry = {
      wasteRisk: item.waste?.wasteRisk !== undefined ? item.waste.wasteRisk : baseZone.wasteRisk,
      reportedOverflowCount: item.waste?.reportedOverflowCount !== undefined ? item.waste.reportedOverflowCount : null,
      collectionEfficiencyPct: item.waste?.collectionEfficiencyPct !== undefined ? item.waste.collectionEfficiencyPct : null,
      source: item.waste?.source !== undefined ? item.waste.source : null,
      status: item.waste?.status || baseZone.dataStatus,
      timestamp: item.waste?.timestamp !== undefined ? item.waste.timestamp : (baseZone.updatedAt || null),
    };

    return {
      ...baseZone,
      air: airTelemetry,
      heat: heatTelemetry,
      waste: wasteTelemetry,
    };
  }
}
