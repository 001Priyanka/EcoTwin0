/**
 * Illustrative GeoJSON Demo Data for Kolhapur Digital Twin
 * 
 * DISCLAIMER:
 * These geometries represent illustrative demonstration study areas around Kolhapur
 * for prototype visualization. They DO NOT represent verified municipal corporation
 * ward boundaries or official administrative survey lines.
 */

import { ZoneGeoJsonProperties } from '../types/environmental';

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface ZoneFeatureProperties extends ZoneGeoJsonProperties {
  label: string;
  centroid: [number, number]; // [lng, lat]
}

export interface ZonePolygonFeature {
  type: "Feature";
  id: string;
  properties: ZoneFeatureProperties;
  geometry: GeoJsonPolygon;
}

export interface ZonePointFeature {
  type: "Feature";
  id: string;
  properties: ZoneFeatureProperties;
  geometry: GeoJsonPoint;
}

export interface ZonePolygonFeatureCollection {
  type: "FeatureCollection";
  features: ZonePolygonFeature[];
}

export interface ZonePointFeatureCollection {
  type: "FeatureCollection";
  features: ZonePointFeature[];
}

/**
 * Illustrative Demonstration Polygons for 3 Kolhapur Priority Zones
 */
export const KOLHAPUR_ZONES_POLYGONS: ZonePolygonFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "zone-shahupuri",
      properties: {
        zoneId: "zone-shahupuri",
        name: "Shahupuri Commercial Hub",
        marathiName: "शाहूपुरी व्यापारी केंद्र",
        wardIdentifier: "Ward 12-A",
        category: "Commercial",
        dataStatus: "simulated",
        areaType: "Demonstration Area (Illustrative · Not Official Boundary)",
        primaryRiskLayer: "air",
        airRisk: 76,
        heatRisk: 68,
        wasteRisk: 64,
        ecoScore: 38,
        label: "Shahupuri Hub",
        centroid: [74.2415, 16.7035],
      },
      geometry: {
        type: "Polygon",
        // Valid closed polygon around Shahupuri commercial & railway station precinct
        coordinates: [
          [
            [74.2340, 16.6990],
            [74.2485, 16.6990],
            [74.2490, 16.7085],
            [74.2345, 16.7080],
            [74.2340, 16.6990]
          ]
        ]
      }
    },
    {
      type: "Feature",
      id: "zone-mahadwar",
      properties: {
        zoneId: "zone-mahadwar",
        name: "Mahadwar Road & Mahalaxmi Temple Precinct",
        marathiName: "महाद्वार रोड व महालक्ष्मी मंदिर परिसर",
        wardIdentifier: "Ward 04-C",
        category: "Heritage",
        dataStatus: "simulated",
        areaType: "Demonstration Area (Illustrative · Not Official Boundary)",
        primaryRiskLayer: "heat",
        airRisk: 54,
        heatRisk: 82,
        wasteRisk: null, // Preserved null value - unavailable data
        ecoScore: 48,
        label: "Mahalaxmi Precinct",
        centroid: [74.2235, 16.6945],
      },
      geometry: {
        type: "Polygon",
        // Valid closed polygon around historic temple core
        coordinates: [
          [
            [74.2170, 16.6895],
            [74.2295, 16.6895],
            [74.2300, 16.6995],
            [74.2175, 16.6995],
            [74.2170, 16.6895]
          ]
        ]
      }
    },
    {
      type: "Feature",
      id: "zone-panchganga",
      properties: {
        zoneId: "zone-panchganga",
        name: "Panchganga Ghat & Shiroli Gateway",
        marathiName: "पंचगंगा घाट व शिरोली प्रवेशद्वार",
        wardIdentifier: "Ward 28-B",
        category: "Industrial",
        dataStatus: "simulated",
        areaType: "Demonstration Area (Illustrative · Not Official Boundary)",
        primaryRiskLayer: "waste",
        airRisk: 71,
        heatRisk: 49,
        wasteRisk: 88,
        ecoScore: 32,
        label: "Panchganga Gateway",
        centroid: [74.2350, 16.7215],
      },
      geometry: {
        type: "Polygon",
        // Valid closed polygon along northern Panchganga river corridor
        coordinates: [
          [
            [74.2220, 16.7140],
            [74.2480, 16.7130],
            [74.2490, 16.7290],
            [74.2230, 16.7300],
            [74.2220, 16.7140]
          ]
        ]
      }
    }
  ]
};

/**
 * Centroid point features for symbol and marker placement
 */
export const KOLHAPUR_ZONES_CENTROIDS: ZonePointFeatureCollection = {
  type: "FeatureCollection",
  features: KOLHAPUR_ZONES_POLYGONS.features.map((poly: ZonePolygonFeature): ZonePointFeature => ({
    type: "Feature",
    id: `point-${poly.properties.zoneId}`,
    properties: poly.properties,
    geometry: {
      type: "Point",
      coordinates: poly.properties.centroid
    }
  }))
};
