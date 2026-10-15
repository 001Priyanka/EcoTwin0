import { ZonesRepository } from '../data-access/zonesRepository.js';
import { AskEcoTwinRequest, AskEcoTwinResponse, AskEvidenceItem, ZoneDetails, EnvironmentalZone } from '../types/index.js';
import { ZoneNotFoundError } from './simulationService.js';

export class AskService {
  /**
   * Processes an environmental question grounded in DynamoDB telemetry records.
   *
   * Rules:
   * - If zoneId is supplied, retrieves granular zone telemetry from DynamoDB.
   * - If zoneId does not exist in database, throws ZoneNotFoundError.
   * - If zoneId is omitted, evaluates city-wide context across all stored zones.
   * - Provides transparent data provenance (real, derived, simulated).
   * - Includes supporting evidence citing sensors, metrics, and recorded values.
   */
  public static async askEcoTwin(
    request: AskEcoTwinRequest,
    tableName?: string
  ): Promise<AskEcoTwinResponse> {
    if (request.zoneId) {
      return this.evaluateZoneSpecificQuery(request.question, request.zoneId, tableName);
    }

    return this.evaluateCityWideQuery(request.question, tableName);
  }

  /**
   * Evaluates questions focused on a specific zone.
   */
  private static async evaluateZoneSpecificQuery(
    question: string,
    zoneId: string,
    tableName?: string
  ): Promise<AskEcoTwinResponse> {
    const zone: ZoneDetails | null = await ZonesRepository.getZoneDetailsById(zoneId, tableName);

    if (!zone) {
      throw new ZoneNotFoundError(zoneId);
    }

    const q = question.toLowerCase();
    const zoneName = zone.name;
    const ward = zone.wardIdentifier || `Ward-${zone.id}`;
    const scoreVal = zone.ecoScore !== null ? `${zone.ecoScore}/100` : 'unavailable';
    const airVal = zone.airRisk !== null ? `${zone.airRisk}/100` : 'unavailable';
    const heatVal = zone.heatRisk !== null ? `${zone.heatRisk}/100` : 'unavailable';
    const wasteVal = zone.wasteRisk !== null ? `${zone.wasteRisk}/100` : 'unavailable';

    const severity =
      zone.ecoScore === null
        ? 'Unavailable'
        : zone.ecoScore >= 75
        ? 'High Vulnerability'
        : zone.ecoScore >= 50
        ? 'Elevated Risk'
        : 'Low Risk';

    let answer: string;
    const evidence: (string | AskEvidenceItem)[] = [];

    // Air quality & particulate queries
    if (q.includes('air') || q.includes('pm2.5') || q.includes('pm25') || q.includes('aqi') || q.includes('pollution') || q.includes('smog')) {
      const aqiStr = zone.air.aqi !== null ? `${zone.air.aqi}` : 'unavailable';
      const pm25Str = zone.air.pm25 !== null ? `${zone.air.pm25} µg/m³` : 'unavailable';
      answer = `In ${zoneName} (${ward}), estimated Air Quality Risk is ${airVal}. Recorded AQI is ${aqiStr} with PM2.5 concentrations at ${pm25Str}. Primary particulate drivers include ${(zone.factors || []).join(', ') || 'traffic and corridor transit'}.`;

      evidence.push({
        source: zone.air.source || 'Kolhapur Air Quality Monitoring Network',
        metric: 'PM2.5 Concentration',
        value: zone.air.pm25,
        detail: `Air risk evaluated at ${airVal}`,
      });
      evidence.push(`Sensor network status: ${zone.air.status} data stream`);
      if (zone.factors && zone.factors.length > 0) {
        evidence.push(`Key stress drivers: ${zone.factors.join(', ')}`);
      }
    }
    // Thermal & urban heat queries
    else if (q.includes('heat') || q.includes('temperature') || q.includes('thermal') || q.includes('microclimate') || q.includes('cool')) {
      const tempStr = zone.heat.temperatureC !== null ? `${zone.heat.temperatureC} °C` : 'unavailable';
      answer = `In ${zoneName} (${ward}), Urban Heat Risk is recorded at ${heatVal}. Surface thermal index is estimated at ${tempStr} across the ${zone.category || 'mixed'} sector, driven by dense built footprint and thermal emissivity.`;

      evidence.push({
        source: zone.heat.source || 'Satellite Thermal Infrared Radiance',
        metric: 'Surface Temperature',
        value: zone.heat.temperatureC,
        detail: `Urban heat vulnerability evaluated at ${heatVal}`,
      });
      evidence.push(`Microclimate classification: ${zone.category || 'Mixed-use'} precinct`);
    }
    // Waste management & Panchganga queries
    else if (q.includes('waste') || q.includes('garbage') || q.includes('runoff') || q.includes('panchganga') || q.includes('overflow') || q.includes('dump')) {
      const overflows = zone.waste.reportedOverflowCount !== null ? `${zone.waste.reportedOverflowCount}` : '0';
      const eff = zone.waste.collectionEfficiencyPct !== null ? `${zone.waste.collectionEfficiencyPct}%` : 'unavailable';
      answer = `Waste Management Risk for ${zoneName} (${ward}) is estimated at ${wasteVal}. Monitoring reports indicate ${overflows} overflow backlog incidents with route collection efficiency at ${eff}.`;

      evidence.push({
        source: zone.waste.source || 'Municipal Waste Logistics & Route Telemetry',
        metric: 'Collection Efficiency',
        value: zone.waste.collectionEfficiencyPct,
        detail: `Reported backlog count: ${overflows}`,
      });
      evidence.push(`Pillar status: ${zone.waste.status} observation stream`);
    }
    // Drivers, factors, or general risk overview
    else {
      const primaryLayer = zone.primaryRiskLayer ? zone.primaryRiskLayer.toUpperCase() : 'MULTI-CRITERIA';
      const factorsList = (zone.factors || []).join('; ') || 'Continuous multi-layer sensor network observation';
      answer = `For ${zoneName} (${ward}), the composite EcoScore (environmental risk) is ${scoreVal} (${severity}). The primary environmental vulnerability driver is ${primaryLayer} risk. Observed localized factors: ${factorsList}.`;

      evidence.push({
        source: 'EcoTwin Environmental Composite Index',
        metric: 'Composite EcoScore',
        value: zone.ecoScore,
        detail: 'Risk score on 0-100 scale (higher indicates greater environmental vulnerability)',
      });
      evidence.push(`Primary risk layer: ${primaryLayer}`);
      evidence.push(`Active localized drivers: ${factorsList}`);
    }

    return {
      answer,
      zoneId: zone.id,
      dataStatus: zone.dataStatus,
      evidence,
    };
  }

  /**
   * Evaluates questions across the entire city when no zoneId is provided.
   */
  private static async evaluateCityWideQuery(
    question: string,
    tableName?: string
  ): Promise<AskEcoTwinResponse> {
    const zones: EnvironmentalZone[] = await ZonesRepository.getAllZones(tableName);

    const validZonesWithScore = zones.filter((z) => typeof z.ecoScore === 'number');
    const avgScore = validZonesWithScore.length > 0
      ? Math.round(validZonesWithScore.reduce((sum, z) => sum + (z.ecoScore as number), 0) / validZonesWithScore.length)
      : null;

    const sortedByRisk = [...validZonesWithScore].sort((a, b) => (b.ecoScore as number) - (a.ecoScore as number));
    const topZones = sortedByRisk.slice(0, 3);
    const topNames = topZones.map((z) => `${z.name} (EcoScore: ${z.ecoScore}/100)`).join(', ');

    const q = question.toLowerCase();
    let answer: string;
    const evidence: (string | AskEvidenceItem)[] = [
      `City-wide coverage: ${zones.length} environmental sectors monitored in DynamoDB`,
      `Average composite environmental risk: ${avgScore !== null ? `${avgScore}/100` : 'unavailable'}`,
      `Highest vulnerability sectors: ${topNames || 'None recorded'}`,
    ];

    if (q.includes('air') || q.includes('pm2.5') || q.includes('aqi') || q.includes('pollution')) {
      const airZones = zones.filter((z) => typeof z.airRisk === 'number');
      const avgAir = airZones.length > 0
        ? Math.round(airZones.reduce((sum, z) => sum + (z.airRisk as number), 0) / airZones.length)
        : null;
      const topAir = [...airZones].sort((a, b) => (b.airRisk as number) - (a.airRisk as number))[0];
      answer = `Across Kolhapur's ${zones.length} monitored sectors, city-wide air quality risk averages ${avgAir !== null ? `${avgAir}/100` : 'unavailable'}. The highest air pollution stress is concentrated around ${topAir ? `${topAir.name} (${topAir.airRisk}/100)` : 'transit arteries'}.`;
      evidence.push(`Average air vulnerability index: ${avgAir !== null ? `${avgAir}/100` : 'N/A'}`);
    } else if (q.includes('heat') || q.includes('temperature') || q.includes('thermal')) {
      const heatZones = zones.filter((z) => typeof z.heatRisk === 'number');
      const avgHeat = heatZones.length > 0
        ? Math.round(heatZones.reduce((sum, z) => sum + (z.heatRisk as number), 0) / heatZones.length)
        : null;
      const topHeat = [...heatZones].sort((a, b) => (b.heatRisk as number) - (a.heatRisk as number))[0];
      answer = `Across Kolhapur, urban microclimate thermal vulnerability averages ${avgHeat !== null ? `${avgHeat}/100` : 'unavailable'}. Peak thermal retention is recorded in ${topHeat ? `${topHeat.name} (${topHeat.heatRisk}/100)` : 'dense commercial cores'}.`;
      evidence.push(`Average urban heat index: ${avgHeat !== null ? `${avgHeat}/100` : 'N/A'}`);
    } else if (q.includes('waste') || q.includes('garbage') || q.includes('panchganga')) {
      const wasteZones = zones.filter((z) => typeof z.wasteRisk === 'number');
      const avgWaste = wasteZones.length > 0
        ? Math.round(wasteZones.reduce((sum, z) => sum + (z.wasteRisk as number), 0) / wasteZones.length)
        : null;
      const topWaste = [...wasteZones].sort((a, b) => (b.wasteRisk as number) - (a.wasteRisk as number))[0];
      answer = `Municipal waste management vulnerability averages ${avgWaste !== null ? `${avgWaste}/100` : 'unavailable'} across Kolhapur's monitored sectors. Critical overflow stress centers on ${topWaste ? `${topWaste.name} (${topWaste.wasteRisk}/100)` : 'riverbank outfalls'}.`;
      evidence.push(`Average waste risk index: ${avgWaste !== null ? `${avgWaste}/100` : 'N/A'}`);
    } else {
      answer = `Across Kolhapur's ${zones.length} monitored municipal sectors, the city-wide composite environmental risk averages ${avgScore !== null ? `${avgScore}/100` : 'unavailable'}. The top vulnerability hotspots identified in the twin are: ${topNames || 'None'}.`;
    }

    return {
      answer,
      zoneId: null,
      dataStatus: zones[0]?.dataStatus || 'simulated',
      evidence,
    };
  }
}
