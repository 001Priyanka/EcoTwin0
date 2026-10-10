# EcoTwin --- Kolhapur Backend Specification

**Document status:** Proposed implementation contract\
**Version:** 1.0\
**Audience:** Backend engineers, AI coding agents, integration lead\
**Project deadline:** Four-day hackathon\
**Important:** This is a target specification. It does not claim that
these endpoints or AWS resources already exist. Unconfirmed choices are
listed explicitly.

## 1. Purpose

Define the backend API, runtime, environmental data model, risk
calculations, storage responsibilities, validation, error handling,
security, deployment, testing, and frontend integration contract for
EcoTwin --- Kolhapur.

The backend is responsible for:

-   Providing environmental zone data to the frontend.
-   Preserving data provenance and timestamps.
-   Calculating canonical risk scores.
-   Ranking priority zones.
-   Running transparent what-if calculations.
-   Providing verified data/tools to Ask EcoTwin.
-   Exposing a stable API contract.
-   Deploying with AWS services in a cost-conscious configuration.

## 2. Runtime and Architecture

  -----------------------------------------------------------------------
  Item                                Proposed value
  ----------------------------------- -----------------------------------
  Runtime                             Node.js on AWS Lambda

  Language                            TypeScript

  HTTP API                            Amazon API Gateway

  Infrastructure as code              AWS SAM CLI

  Database                            DynamoDB only if persistence/query
                                      needs justify it

  Object storage                      S3 for geographic datasets or files
                                      where needed

  Logs                                CloudWatch

  Permissions                         Least-privilege IAM roles

  Local development                   Node.js + SAM CLI; local fixtures
                                      where possible

  Authentication                      Public read-only MVP unless
                                      write/admin functionality requires
                                      authentication; review this before
                                      deployment

  API style                           REST/JSON over HTTPS

  API prefix                          `/` initially; no global prefix
                                      unless agreed
  -----------------------------------------------------------------------

The MVP should avoid unnecessary services. Do not add RDS, OpenSearch,
ECS, or EKS without a demonstrated requirement.

## 3. Proposed Architecture

``` text
Environmental data sources / prepared datasets
                  |
                  v
          Data normalization
                  |
                  v
          Environmental services
          /          |           \
      Air risk    Heat risk    Waste risk
          \          |           /
                  EcoScore
                     |
              Priority ranking
                     |
                     v
              API Gateway
                     |
                     v
                 Lambda
                /      \
          DynamoDB      S3
                     |
                     v
            Frontend REST client

Ask EcoTwin -> backend tools -> trusted zone data -> model explanation
```

Data ingestion is not assumed to be real-time. The MVP may load prepared
GeoJSON and environmental fixtures. Every source and refresh interval
must be documented.

## 4. API Inventory

The following routes are proposed for the MVP. They become the shared
contract only after the frontend and backend owners approve the schemas
in `docs/API-CONTRACT.md`.

  --------------------------------------------------------------------------------------------------------------
  Method      Endpoint                    Purpose        Auth         Success              Main errors
  ----------- --------------------------- -------------- ------------ -------------------- ---------------------
  GET         `/health`                   Basic health   Public       200 status object    5xx
                                          check                                            

  GET         `/zones`                    List zone      Public       200                  500
                                          summaries      read-only,   `{ zones: [...] }`   
                                                         if approved                       

  GET         `/zones/{zoneId}`           Detailed zone  Public       200 zone detail      404, 500
                                          data           read-only,                        
                                                         if approved                       

  GET         `/priority-zones?limit=5`   Highest-risk   Public       200                  400/422, 500
                                          zones          read-only,   `{ zones: [...] }`   
                                                         if approved                       

  POST        `/simulate`                 Run            Public demo  200 simulation       400/404/422/500
                                          intervention   endpoint     result               
                                          model          only if                           
                                                         abuse risk                        
                                                         is                                
                                                         acceptable                        

  POST        `/ask`                      Grounded Ask   Public demo  200 answer/evidence  400/422/429/502/500
                                          EcoTwin answer endpoint                          
                                                         only with                         
                                                         input/rate                        
                                                         controls                          
  --------------------------------------------------------------------------------------------------------------

### Health response

``` json
{
  "status": "ok",
  "service": "ecotwin-api"
}
```

The health route should not expose environment variables, credentials,
internal configuration, or sensitive infrastructure details.

### GET `/zones`

Purpose: Return summaries for map styling, city-level metrics, and
ranking.

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

Example numbers are simulated documentation values, not real Kolhapur
observations.

### GET `/zones/{zoneId}`

Purpose: Return detailed information for one known zone.

Proposed response shape:

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

Null means unavailable. Never substitute zero for missing measurements.

### GET `/priority-zones?limit=5`

-   `limit` must be a bounded positive integer.
-   Initial default: 5.
-   Maximum: set and document a safe cap (proposed 20).
-   Sort descending by canonical EcoScore.
-   Use stable deterministic tie-breaking, such as ascending zone ID.

Response:

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

### POST `/simulate`

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

These result numbers are illustrative only. Implementation must compute
results using a documented function; do not hardcode this example
response. Validate allowed intervention types and intensity bounds.
Return 404 for unknown zones and 422 for invalid values. Simulation must
be deterministic for the same input and dataset version unless
randomness is explicitly required and documented.

### POST `/ask`

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

The answer must be based on backend-retrieved data and tools. Do not ask
the model to invent readings, rankings, or simulation results. If model
access fails, return a documented safe fallback or a clear `502`/`503`
response; the frontend must handle it. Never expose model-provider
credentials or raw internal errors.

## 5. Data Models

### Environmental zone summary

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
```

### Zone detail

``` ts
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
```

Validation rules:

-   IDs are stable strings.
-   Names are non-empty.
-   Risk scores are null or numbers in `[0, 100]`.
-   AQI and PM2.5 are nullable numeric measurements with documented
    units/source.
-   Temperature uses degrees Celsius.
-   Collection efficiency, if present, is between 0 and 100.
-   Counts are non-negative integers.
-   Timestamps use ISO 8601 UTC strings.
-   Each individual metric carries provenance where sources differ.
-   `ecoScore` is an environmental **risk** score; higher means more
    risk.

## 6. Data Provenance and Ingestion

Allowed status values:

-   `real`: directly observed or published by an identified source.
-   `derived`: calculated from identified input observations.
-   `simulated`: fabricated or generated for demo/testing.

For each source, document:

-   Source name and URL/reference.
-   Metric and unit.
-   Geographic granularity.
-   Observation timestamp or reporting period.
-   Refresh cadence.
-   Transformation/calculation.
-   Known limitations and licensing/attribution constraints.

Do not claim real-time or neighborhood-level accuracy unless the source
supports that granularity. If only city-level readings exist, do not
fabricate precise local readings. GeoJSON zones and environmental
observations are separate datasets joined by stable zone ID or a
documented spatial mapping process.

## 7. Canonical Risk Engine

The backend is the single source of truth for risk calculations.

### Component risks

Air, Heat, and Waste each have a documented mapping from source inputs
to a normalized 0--100 risk score. The mapping may be heuristic for the
hackathon but must be explainable, tested, and labeled accordingly.

Do not equate a normalized risk score with an official AQI value.

### EcoScore

Proposed form:

`EcoScore = wA × AirRisk + wH × HeatRisk + wW × WasteRisk`

Initial MVP implementation decision:

-   `wA = 0.4`, `wH = 0.3`, and `wW = 0.3`.
-   When one or more component risks are unavailable, the score is
    renormalized over the available weights. If all components are
    unavailable, `ecoScore` is `null`.
-   The result is rounded to the nearest integer after renormalization.
-   This is a deterministic heuristic for simulated demonstration data,
    not an official environmental index.

Requirements:

-   Weights are non-negative and sum to 1.
-   Weights must be agreed upon and documented before implementation.
-   All non-null inputs must be in the 0--100 range.
-   Missing inputs must not silently become zero.
-   Decide whether to mark EcoScore unavailable when any component is
    missing or renormalize over available components. Record the choice
    and test it.
-   The frontend must display backend results rather than reimplement
    this formula.

### Priority ranking

-   Sort by descending EcoScore.
-   Exclude zones with unavailable EcoScore unless product owners decide
    otherwise.
-   Use a stable tie-breaker.
-   Tests must cover ties, missing scores, and empty input.

## 8. Proposed DynamoDB Model

DynamoDB is conditional: use it if persistence or query patterns justify
it. Static GeoJSON and stable demonstration fixtures may be packaged or
stored in S3 rather than copied into DynamoDB.

One possible single-table design:

  Attribute      Meaning
  -------------- --------------------------------------------
  `PK`           `ZONE#<zoneId>`
  `SK`           `SUMMARY` or `OBSERVATION#<ISO timestamp>`
  `entityType`   `ZONE_SUMMARY` or `OBSERVATION`
  `payload`      Validated metric fields
  `source`       Source identifier
  `dataStatus`   real/derived/simulated
  `updatedAt`    ISO 8601 UTC timestamp

This is a proposed model, not a final decision. Choose keys based on
actual access patterns, for example: get zone summary, get zone history,
and list known zones. DynamoDB does not automatically make arbitrary
score sorting efficient; if the dataset is small, sort in application
memory. Avoid scans on every request if the dataset grows.

## 9. S3 Responsibilities

Use S3 only for file/object storage, such as:

-   GeoJSON boundary files.
-   Prepared source datasets.
-   Static historical files, if required.

Rules:

-   Keep buckets private by default.
-   Use IAM permissions scoped to required buckets and prefixes.
-   Do not place secrets in S3.
-   Validate file provenance and format.
-   Do not make a bucket public simply to simplify frontend access.
-   If the frontend needs GeoJSON publicly, evaluate whether it should
    be bundled into the frontend, served through a controlled endpoint,
    or exposed through a carefully configured public/static delivery
    path.

## 10. Lambda Code Organization

Suggested layout:

``` text
backend/
  src/
    handlers/
      health.ts
      getZones.ts
      getZone.ts
      getPriorityZones.ts
      simulate.ts
      ask.ts
    services/
      zoneService.ts
      riskEngine.ts
      priorityService.ts
      simulationService.ts
      assistantService.ts
    repositories/
      zoneRepository.ts
    schemas/
      zoneSchema.ts
      simulationSchema.ts
      askSchema.ts
    types/
      environmental.ts
    utils/
      httpResponse.ts
      errors.ts
  tests/
  template.yaml
  package.json
  tsconfig.json
```

Keep business logic separate from Lambda event parsing. Unit-test
service functions without requiring AWS. Avoid one Lambda per tiny
helper; group handlers sensibly to reduce infrastructure and deployment
overhead.

## 11. Validation and Error Contract

Agree on a stable error shape:

``` json
{
  "error": {
    "code": "ZONE_NOT_FOUND",
    "message": "The requested zone was not found."
  }
}
```

Proposed status conventions:

  Status    Use
  --------- -------------------------------------------------------
  200       Successful read/action
  400       Malformed request
  404       Unknown zone/resource
  422       Well-formed request with invalid field/business value
  429       Rate limit or model quota exceeded
  500       Unexpected internal error
  502/503   Upstream model/provider unavailable

All error responses should use the same envelope where possible. Never
expose stack traces, AWS internals, prompts containing secrets, or
provider credentials. Log a correlation/request ID for debugging.

## 12. Security and Abuse Controls

-   Use least-privilege IAM.
-   Keep AWS credentials out of source control and frontend builds.
-   Validate request body size and field types.
-   Limit question length and simulator inputs.
-   Add throttling/rate limits for model-backed endpoints.
-   Do not allow arbitrary model tool invocation from client input.
-   Restrict CORS to known frontend origins in deployed environments.
-   Avoid logging full user prompts if they may contain personal
    information.
-   Apply timeouts to external model requests.
-   Handle provider throttling/quota errors.
-   Treat external dataset content as data, not executable instructions.
-   Keep the MVP read-only where possible.

Authentication can be omitted only if the deployed MVP exposes read-only
public data and carefully controlled demo endpoints. If writes, private
data, or privileged actions are introduced, define authentication and
authorization before implementation.

## 13. AI Agent and Tool Contract

AI must explain, not replace, the deterministic environmental engine.

Suggested backend tools:

-   `getZoneDetails(zoneId)`
-   `getPriorityZones(limit)`
-   `getAvailableObservations(zoneId)`
-   `simulateIntervention(zoneId, intervention)`

Tool results must be typed and validated. The model should receive only
the fields required for the question. Responses should distinguish
observation, derived result, and simulated result.

The agent must:

-   Cite the returned evidence fields in its answer or structured
    evidence list.
-   State when data is simulated or unavailable.
-   Avoid unsupported causal claims.
-   Never invent values when a tool fails.
-   Return a controlled fallback if model access is unavailable.

The selected model, provider, free-tier quota, and deployment
compatibility must be verified. An agent framework does not make
inference free by itself.

## 14. Environment Variables and Secrets

Example `.env.example` for local development:

``` dotenv
AWS_REGION=ap-south-1
TABLE_NAME=
GEOJSON_BUCKET=
CORS_ORIGINS=http://localhost:5173
AI_PROVIDER=
AI_MODEL_ID=
```

Only include variables actually used by the implementation. Keep real
credentials and API keys out of `.env.example`, Git, logs, and frontend
`VITE_` variables. Use the deployment platform's supported
secret/configuration mechanism for model credentials. Prefer IAM roles
and temporary credentials for AWS access.

## 15. AWS SAM Deployment

The SAM template should declare only required resources:

-   Lambda function(s).
-   API Gateway HTTP API or REST API, selected explicitly.
-   DynamoDB table only if required.
-   S3 bucket only if required.
-   IAM permissions scoped to the required resources.
-   Environment variables needed by handlers.

Typical workflow:

1.  Configure AWS credentials using the recommended local AWS CLI
    process.
2.  Review the SAM template and resource permissions.
3.  Run `sam validate`.
4.  Run `sam build`.
5.  Test locally where practical.
6.  Deploy to a named development stack.
7.  Record the API URL and update the frontend environment
    configuration.
8.  Test deployed endpoints.
9.  Review AWS billing and remove unused resources after the event.

Do not assume every service or request volume is free. Confirm the
current account's free-tier/credit eligibility and pricing before
deployment.

## 16. Testing Requirements

### Unit tests

-   Score normalization and boundaries.
-   EcoScore weights and missing-data behavior.
-   Priority ordering and tie-breaking.
-   Simulation input validation and deterministic output.
-   Schema validation.
-   Error mapping.
-   AI tool response validation.

### API tests

-   `GET /health`.
-   Empty and populated `GET /zones`.
-   Known and unknown zone IDs.
-   Invalid priority limit.
-   Invalid simulation intervention/intensity.
-   Missing zone in simulation.
-   Empty/oversized Ask EcoTwin question.
-   AI provider timeout, throttling, and unavailable model.
-   CORS behavior in deployed environment.

### Definition of done

-   `sam validate` succeeds.
-   `sam build` succeeds.
-   Relevant tests pass.
-   API response examples match `docs/API-CONTRACT.md`.
-   No secrets are committed.
-   Error shape and status codes are consistent.
-   Risk calculations are deterministic and documented.
-   Real/derived/simulated provenance is retained.
-   Deployment endpoint is smoke-tested.
-   Resource permissions and expected costs have been reviewed.

## 17. Frontend Integration Requirements

-   Keep response property names and nullability aligned with the
    frontend TypeScript interfaces.
-   `GET /zones` returns stable zone IDs.
-   GeoJSON `properties.zoneId` values match API IDs.
-   `GET /zones/{zoneId}` returns the agreed detail model.
-   Priority-zone order comes from the backend.
-   The frontend does not independently calculate EcoScore.
-   Simulation response includes model type and assumptions.
-   Ask EcoTwin response includes data status and evidence.
-   Missing values are represented as `null`, not zero.
-   Any contract change requires a coordinated frontend/backend update.

## 18. Decisions Requiring Confirmation

1.  Exact public environmental data sources and licenses.
2.  Actual GeoJSON boundary dataset and zone definitions.
3.  Final component-risk mappings and EcoScore weights.
4.  Missing-data behavior for overall scores.
5.  Whether DynamoDB is required for the initial demo.
6.  Whether S3 is required or GeoJSON can be bundled.
7.  Final map provider and attribution.
8.  AI model/provider and verified free quota.
9.  Public versus authenticated API exposure.
10. Exact API Gateway type, region, deployment stack, and CORS origin.

These decisions must be resolved with the integration lead before the
affected code is considered final.
