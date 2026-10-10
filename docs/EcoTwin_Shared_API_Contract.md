# EcoTwin --- Shared API Contract

**Version:** 1.0 proposed baseline\
**Purpose:** Single source of truth shared by frontend and backend
owners.

> These schemas are proposed. Both owners must approve them before
> implementation. Example values are simulated, not actual Kolhapur
> readings.

## Common conventions

-   JSON request and response bodies.
-   REST paths have no global prefix unless explicitly changed here.
-   Timestamps are ISO 8601 UTC strings.
-   IDs are stable strings.
-   Missing measurements are `null`, never silently converted to zero.
-   Data status: `real`, `derived`, or `simulated`.
-   Risk values range from 0 to 100.
-   Higher `ecoScore` means higher environmental risk.
-   Errors use the shared error envelope below.

## `GET /health`

``` json
{
  "status": "ok",
  "service": "ecotwin-api"
}
```

## `GET /zones`

``` json
{
  "zones": [
    {
      "id": "zone-01",
      "name": "Example Zone",
      "airRisk": 72,
      "heatRisk": 65,
      "wasteRisk": 81,
      "ecoScore": 73,
      "dataStatus": "simulated",
      "updatedAt": "2026-10-10T09:00:00Z"
    }
  ]
}
```

## `GET /zones/{zoneId}`

Returns one `ZoneDetails` object:

``` json
{
  "id": "zone-01",
  "name": "Example Zone",
  "airRisk": 72,
  "heatRisk": 65,
  "wasteRisk": 81,
  "ecoScore": 73,
  "dataStatus": "simulated",
  "updatedAt": "2026-10-10T09:00:00Z",
  "air": {
    "aqi": null,
    "pm25": null,
    "source": null,
    "status": "simulated"
  },
  "heat": {
    "temperatureC": null,
    "heatRisk": 65,
    "source": null,
    "status": "simulated"
  },
  "waste": {
    "wasteRisk": 81,
    "reportedOverflowCount": null,
    "collectionEfficiencyPct": null,
    "source": null,
    "status": "simulated"
  }
}
```

## `GET /priority-zones?limit=5`

Returns `{ "zones": EnvironmentalZone[] }`, ordered by descending
`ecoScore`. The proposed maximum limit is 20. Zones with unavailable
overall score are excluded unless the team explicitly changes this rule.

## `POST /simulate`

Request:

``` json
{
  "zoneId": "zone-01",
  "intervention": {
    "type": "increase-waste-collection",
    "intensity": 20
  }
}
```

Response:

``` json
{
  "zoneId": "zone-01",
  "baselineEcoScore": 73,
  "estimatedEcoScore": 68,
  "estimatedChange": -5,
  "modelType": "heuristic",
  "assumptions": [
    "Illustrative model; not a validated environmental forecast."
  ]
}
```

The values above are illustrative only. The implemented service must
calculate the result.

## `POST /ask`

Request:

``` json
{
  "question": "Why is this zone high risk?",
  "zoneId": "zone-01"
}
```

Response:

``` json
{
  "answer": "Example explanation based on retrieved zone data.",
  "zoneId": "zone-01",
  "dataStatus": "simulated",
  "evidence": [
    {
      "field": "wasteRisk",
      "value": 81
    }
  ]
}
```

## Shared error envelope

``` json
{
  "error": {
    "code": "ZONE_NOT_FOUND",
    "message": "The requested zone was not found."
  }
}
```

Suggested status codes: 400 malformed input, 404 unknown resource, 422
invalid field/business value, 429 throttled, 500 unexpected internal
error, 502/503 upstream AI provider unavailable.

## TypeScript contracts

``` ts
export type DataStatus = "real" | "derived" | "simulated";

export interface EnvironmentalZone {
  id: string;
  name: string;
  airRisk: number | null;
  heatRisk: number | null;
  wasteRisk: number | null;
  ecoScore: number | null;
  dataStatus: DataStatus;
  updatedAt: string | null;
}

export interface ZoneDetails extends EnvironmentalZone {
  air: {
    aqi: number | null;
    pm25: number | null;
    source: string | null;
    status: DataStatus;
  };
  heat: {
    temperatureC: number | null;
    heatRisk: number | null;
    source: string | null;
    status: DataStatus;
  };
  waste: {
    wasteRisk: number | null;
    reportedOverflowCount: number | null;
    collectionEfficiencyPct: number | null;
    source: string | null;
    status: DataStatus;
  };
}

export interface SimulationRequest {
  zoneId: string;
  intervention: {
    type: string;
    intensity: number;
  };
}

export interface SimulationResponse {
  zoneId: string;
  baselineEcoScore: number | null;
  estimatedEcoScore: number | null;
  estimatedChange: number | null;
  modelType: "heuristic" | "validated";
  assumptions: string[];
}

export interface AskRequest {
  question: string;
  zoneId?: string;
}

export interface AskEvidence {
  field: string;
  value: string | number | boolean | null;
}

export interface AskResponse {
  answer: string;
  zoneId: string | null;
  dataStatus: DataStatus;
  evidence: AskEvidence[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

## Change control

Any change to paths, property names, nullability, enum values, score
semantics, error structure, or timestamps must be recorded here and
approved by both frontend and backend owners before merging. Update
fixtures, tests, and implementation together.
