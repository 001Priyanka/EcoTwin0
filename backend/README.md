# EcoTwin — Kolhapur Serverless Backend

Backend microservices and APIs for **EcoTwin — Kolhapur**, built with:
- **Node.js 20 & TypeScript**
- **AWS Lambda** (native handlers, cleanly decoupled from web frameworks)
- **Amazon API Gateway** (REST API with configured CORS)
- **AWS SAM** (Infrastructure as Code via `template.yaml`)
- **Amazon DynamoDB** (NoSQL datastore for environmental zones, sensors, and simulations)
- **AWS CloudWatch** (Structured logging and observability)

---

## 📁 Project Architecture

The backend is fully modularized with strict separation of concerns:

```
backend/
├── template.yaml               # AWS SAM specification (API Gateway, Lambdas, DynamoDB)
├── tsconfig.json               # TypeScript configuration targeting Node.js ESM/ES2022
├── package.json                # Dependencies, build, test, and seed scripts
├── .env.example                # Configuration template for local execution & endpoints
├── .gitignore                  # Git ignore rules for build and temporary artifacts
├── src/
│   ├── handlers/               # Thin AWS Lambda request/response adapters
│   │   ├── health.ts           # GET /health handler
│   │   ├── getZones.ts         # GET /zones handler
│   │   ├── getZoneById.ts      # GET /zones/{zoneId} handler
│   │   ├── getPriorityZones.ts # GET /priority-zones handler
│   │   ├── simulate.ts         # POST /simulate scenario simulation handler
│   │   └── ask.ts              # POST /ask environmental Q&A assistant handler
│   ├── services/               # Pure business logic and domain orchestration
│   │   ├── healthService.ts    # Health status reporting service
│   │   ├── zonesService.ts     # Environmental zones & priority ranking service
│   │   ├── simulationService.ts# Deterministic heuristic what-if intervention simulator
│   │   └── askService.ts       # Domain Q&A grounding engine citing telemetry streams
│   ├── data-access/            # DynamoDB client and repository abstractions
│   │   ├── dynamoClient.ts     # DocumentClient wrapper with endpoint/region resilience
│   │   ├── zonesRepository.ts  # Zones DynamoDB repository (Scan, Get, BatchPut, Retries)
│   │   └── seedZones.ts        # Database seed script with production safety guards
│   ├── validation/             # Request payload and parameter validation
│   │   └── requestValidator.ts # Input validation routines
│   └── types/                  # Domain and API response interfaces
│       └── index.ts            # Type definitions (EnvironmentalZone, SimulationResult, etc.)
└── tests/                      # Automated unit and integration tests
    ├── health.test.ts          # Unit tests for the health endpoint
    ├── getZones.test.ts        # Unit tests for the GET /zones handler & CORS
    ├── getZoneById.test.ts     # Unit tests for GET /zones/{zoneId}
    ├── getPriorityZones.test.ts# Unit tests for GET /priority-zones
    ├── simulate.test.ts        # Unit tests for POST /simulate handler & schema validation
    ├── simulationService.test.ts# Unit tests for scenario heuristic calculation
    ├── ask.test.ts             # Unit tests for POST /ask handler & parameter validation
    ├── askService.test.ts      # Unit tests for domain Q&A grounding & evidence citations
    ├── zonesService.test.ts    # Unit tests for priority ranking & service logic
    ├── zonesModel.test.ts      # Unit tests for data model mapping and null preservation
    └── zonesRepository.test.ts # Unit tests for repository methods, chunking, and safety
```

---

## 🚀 Setup & Execution

### Prerequisites
- **Node.js**: >= 20.x
- **npm**: >= 10.x
- *(Optional for local emulation)*: Docker, AWS SAM CLI
- *(Optional for cloud deployment)*: AWS CLI configured with developer IAM credentials

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Compile TypeScript
To compile TypeScript into the `dist/` directory:
```bash
npm run build
```

To watch for changes continuously during development:
```bash
npm run watch
```

### 3. Run Automated Tests
```bash
npm run test:ts
```
Or if already built:
```bash
npm test
```

> **Testing Environment Distinction**:
> - **Unit Tests (`tests/*.test.ts`)**: Run in pure memory using native `node:test` and mock fixtures. **No AWS credentials, Docker, or live network connection required.**
> - **Local Integration Tests**: Require DynamoDB Local (via Docker) and/or `sam local start-api`.
> - **AWS Cloud Tests**: Require an active AWS account, deployed CloudFormation stack, and configured IAM credentials.

---

## 💻 Local Testing & Visual DynamoDB GUI

You can run DynamoDB locally on your machine, initialize the schema, seed the 7 Kolhapur zones, and **view/edit data in a visual web browser interface** (`dynamodb-admin`) or AWS NoSQL Workbench.

### Option A: 1-Command Setup (DynamoDB Local + Visual Web GUI)

We provide a `backend/docker-compose.yml` that starts both DynamoDB Local and the browser-based `dynamodb-admin` visual GUI:

```bash
# 1. From the backend/ folder, start the local DynamoDB & visual Web GUI
cd backend
docker compose up -d
```

This starts:
- **DynamoDB Local** on port `8000` (`http://localhost:8000`) with persistent volume storage.
- **DynamoDB Admin GUI** on port `8001` (`http://localhost:8001`).

```bash
# 2. Create the table and seed initial Kolhapur zones in one step:
npm run db:init
```

Now open **http://localhost:8001** in your browser!
- Click into the table **`ecotwin-zones-dev`**.
- Click on any zone item to view and edit its attributes (e.g. changing `ecoScore`, `airRisk`, `aqi`, `factors`) directly in JSON or field mode.
- Click **Save** to update the record in DynamoDB.
- You can also click **Create Item** or **Delete** items interactively.

---

### Option B: Standalone Docker Command

If you prefer running standalone Docker commands without Docker Compose:

```bash
# 1. Start DynamoDB Local with persistent storage:
docker run -d -p 8000:8000 --name ecotwin-dynamodb-local \
  -v dynamodb-data:/home/dynamodblocal/data \
  amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data

# 2. Launch the visual Web GUI using npx (no Docker required for GUI):
DYNAMO_ENDPOINT=http://localhost:8000 npx dynamodb-admin -p 8001
```

Open **http://localhost:8001** in your browser.

```bash
# 3. Initialize and seed table in another terminal:
npm run db:init
```

---

### Option C: Official Desktop Tool (AWS NoSQL Workbench)

If you prefer an official AWS desktop application:
1. Download **NoSQL Workbench for DynamoDB** (free from AWS for macOS/Windows/Linux).
2. Open NoSQL Workbench > Click **Operation Builder** > **Add Connection**.
3. Select **DynamoDB Local**:
   - Connection name: `EcoTwin Local`
   - Port: `8000`
4. Click **Connect** to visually explore tables, run queries, and edit records with a visual property editor.

---

### Step 3: Run AWS SAM Local API Gateway (Connecting to Local DynamoDB)

To run the Lambda functions locally via AWS SAM and point them to your local DynamoDB container:

1. Create a local environment file `backend/env.json`:
```json
{
  "Parameters": {
    "DYNAMODB_ENDPOINT": "http://host.docker.internal:8000",
    "ZONES_TABLE_NAME": "ecotwin-zones-dev",
    "AWS_REGION": "ap-south-1"
  }
}
```

2. Compile and start SAM local API:
```bash
# Compile TypeScript handlers to dist/
npm run build

# Start local API Gateway on port 3001
sam local start-api --port 3001 --env-vars env.json
```

3. Test endpoints with curl:
```bash
# Health check
curl http://localhost:3001/health

# Fetch all zones from local DynamoDB
curl http://localhost:3001/zones

# Fetch single zone
curl http://localhost:3001/zones/zone-panchganga

# Priority ranking
curl "http://localhost:3001/priority-zones?limit=5"

# What-if scenario simulation
curl -X POST http://localhost:3001/simulate \
  -H "Content-Type: application/json" \
  -d '{"zoneId":"zone-panchganga","intervention":{"type":"waste-segregation","intensity":50}}'

# Ask EcoTwin Q&A grounded in local DynamoDB data
curl -X POST http://localhost:3001/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the air quality risk in Shahupuri?","zoneId":"zone-shahupuri"}'
```

---

## 📡 Endpoints Specification

### 1. GET `/health`
Health check endpoint reporting service availability.

**Response (HTTP 200)**:
```json
{
  "status": "ok",
  "service": "ecotwin-api",
  "timestamp": "2026-10-11T06:45:00.000Z",
  "version": "1.0.0"
}
```

**CORS Headers**:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
- `Access-Control-Allow-Methods: GET,OPTIONS`

### 2. GET `/zones`
Retrieves all environmental zones and composite environmental risk indicators stored in DynamoDB.

**Contract Guarantees**:
- `ecoScore`: Environmental risk score (0-100 scale, higher value = higher environmental risk).
- Missing values: Preserved strictly as `null` (never coerced to 0).
- `dataStatus`: `"real"` | `"derived"` | `"simulated"` (all seed records clearly designated as `"simulated"` for ethical provenance transparency).
- Returns envelope: `{ "zones": [ ... ] }`.

**Response (HTTP 200)**:
```json
{
  "zones": [
    {
      "id": "zone-panchganga",
      "name": "Panchganga Ghat & Shiroli Gateway",
      "marathiName": "पंचगंगा घाट व शिरोली प्रवेशद्वार",
      "category": "Industrial",
      "wardIdentifier": "Ward 28-B",
      "description": "Riparian interface bordering northern industrial manufacturing fringe and river discharge channels.",
      "primaryRiskLayer": "waste",
      "factors": [
        "Industrial stormwater runoff",
        "Corridor diesel transport",
        "Riparian bank accumulation"
      ],
      "dataStatus": "simulated",
      "updatedAt": "2026-10-10T10:10:00Z",
      "airRisk": 71,
      "heatRisk": 49,
      "wasteRisk": 88,
      "ecoScore": 84
    }
  ]
}
```

### 3. GET `/zones/{zoneId}`
Retrieves complete environmental details and granular observation telemetry for a specific zone by stable ID.

**Contract Guarantees**:
- Returns `ZoneDetails` shape conforming strictly to the shared contract.
- Validates path parameter `zoneId`: non-empty, alphanumeric with dashes/underscores (`^[a-zA-Z0-9_-]{1,128}$`).
- Returns HTTP 404 with structured error `{ "error": { "code": "ZONE_NOT_FOUND", "message": "..." } }` when zone does not exist.
- Granular telemetry sub-objects for `air`, `heat`, and `waste`.
- Missing measurements preserved honestly as `null` (never coerced to 0).
- Does not calculate or modify EcoScore in the handler.
- Catches internal database errors and returns safe HTTP 500 without leaking AWS internal exceptions.

**Success Response (HTTP 200)**:
```json
{
  "id": "zone-shahupuri",
  "name": "Shahupuri Commercial Hub & Central Station",
  "marathiName": "शाहूपुरी व्यापारी केंद्र व मध्यवर्ती स्थानक",
  "category": "Commercial",
  "wardIdentifier": "Ward 14-A",
  "description": "High-density commercial market core surrounding central railway transit artery.",
  "primaryRiskLayer": "air",
  "factors": [
    "Idling diesel transit buses",
    "Narrow urban canyon trapped PM2.5"
  ],
  "dataStatus": "simulated",
  "updatedAt": "2026-10-10T10:15:00Z",
  "airRisk": 78,
  "heatRisk": 72,
  "wasteRisk": 61,
  "ecoScore": 76,
  "air": {
    "aqi": 168,
    "pm25": 72.4,
    "source": "Simulated Shahupuri Station Sensor #02",
    "status": "simulated",
    "timestamp": "2026-10-10T10:15:00Z"
  },
  "heat": {
    "temperatureC": 36.8,
    "heatRisk": 72,
    "source": "Derived Thermal Infrared Radiance",
    "status": "derived",
    "timestamp": "2026-10-10T10:00:00Z"
  },
  "waste": {
    "wasteRisk": 61,
    "reportedOverflowCount": 6,
    "collectionEfficiencyPct": 76,
    "source": "Simulated KMC Route Telemetry",
    "status": "simulated",
    "timestamp": "2026-10-10T09:30:00Z"
  }
}
```

**Not Found Response (HTTP 404)**:
```json
{
  "error": {
    "code": "ZONE_NOT_FOUND",
    "message": "Zone with identifier \"non-existent\" does not exist."
  }
}
```

### 4. GET `/priority-zones?limit={limit}`
Retrieves prioritized environmental zones ranked by environmental vulnerability (highest `ecoScore` first).

**Contract Guarantees**:
- Returns envelope: `{ "zones": [ ... ] }`.
- Validates query parameter `limit`: positive integer between 1 and 20 (default: 5).
- Rejects non-numeric or out-of-range limit values with HTTP 400 and structured error.
- Preserves existing `ecoScore` values; does not alter or recompute scores.
- Zones with null risk scores are placed at the end without coercion to 0.

**Success Response (HTTP 200)**:
```json
{
  "zones": [
    {
      "id": "zone-panchganga",
      "name": "Panchganga Ghat & Shiroli Gateway",
      "airRisk": 71,
      "heatRisk": 49,
      "wasteRisk": 88,
      "ecoScore": 84,
      "dataStatus": "simulated",
      "updatedAt": "2026-10-10T10:10:00Z"
    },
    {
      "id": "zone-shahupuri",
      "name": "Shahupuri Commercial Hub & Central Station",
      "airRisk": 78,
      "heatRisk": 72,
      "wasteRisk": 61,
      "ecoScore": 76,
      "dataStatus": "simulated",
      "updatedAt": "2026-10-10T10:15:00Z"
    }
  ]
}
```

**Validation Error Response (HTTP 400)**:
```json
{
  "error": {
    "code": "INVALID_LIMIT",
    "message": "Query parameter \"limit\" must be a valid positive integer. Received: \"abc\"."
  }
}
```

### 5. POST `/simulate`
Executes heuristic what-if intervention scenario modeling against an environmental zone stored in DynamoDB.

**Request Schema**:
```json
{
  "zoneId": "zone-panchganga",
  "intervention": {
    "type": "waste-segregation",
    "intensity": 50
  }
}
```

**Supported Interventions**:
- `urban-greening`: Urban Tree Canopy & Vegetated Buffers (heat/air mitigation)
- `cool-roofs`: Cool Roof & High-Albedo Surfaces (heat mitigation)
- `waste-segregation`: Decentralized Waste Collection & Segregation (waste mitigation)
- `clean-transit`: Low-Emission Transit & Freight Diversion (air mitigation)
- `riverbank-cleanup`: Riparian Buffer & Drainage Traps (waste mitigation)

**Contract Guarantees**:
- Validates request body, JSON syntax, zone ID, intervention type, and intensity (1–100 integer).
- Returns HTTP 404 when `zoneId` does not exist in DynamoDB.
- Returns HTTP 400 when zone has null baseline `ecoScore`.
- Uses a deterministic, documented heuristic model (`modelType: "heuristic"`).
- `ecoScore` represents environmental risk (0-100 scale, higher = greater risk).
- `estimatedChange`: Negative value indicates risk reduction.
- Never persists hypothetical scenario outcomes to DynamoDB.
- Never claims hypothetical estimates are measured field observations.

**Success Response (HTTP 200)**:
```json
{
  "baselineEcoScore": 84,
  "estimatedEcoScore": 72,
  "estimatedChange": -12,
  "modelType": "heuristic",
  "assumptions": [
    "Illustrative heuristic model: Estimates denote potential scenario changes, not empirical field measurements.",
    "Assumes 50% target deployment density for \"Decentralized Waste Collection & Segregation\" across Panchganga Ghat & Shiroli Gateway.",
    "EcoScore denotes environmental risk (0–100 scale); negative change signifies estimated vulnerability reduction.",
    "Assumes standard seasonal weather patterns without extreme climatic anomalies or localized flooding.",
    "Simplified linear response assumption; boundary spillover effects and saturation non-linearities are not resolved."
  ]
}
```

### 6. POST `/ask`
Answers natural language environmental inquiries grounded in localized DynamoDB telemetry records and city-wide risk indices.

**Request Schema**:
```json
{
  "question": "What are the primary air particulate drivers in this zone?",
  "zoneId": "zone-shahupuri"
}
```
*(Note: `zoneId` is optional; omitting it queries composite city-wide telemetry across all monitored sectors).*

**Contract Guarantees**:
- Validates JSON payload, non-empty question (minimum 3 characters).
- If `zoneId` is supplied, retrieves granular zone telemetry from DynamoDB; returns HTTP 404 if not found.
- If `zoneId` is omitted, aggregates city-wide averages and identifies top vulnerability hotspots.
- Grounds answers in actual sensor telemetry, reported backlogs, and recorded risk indicators.
- Transparently provides data provenance (`real`, `derived`, `simulated`).
- Returns citation evidence array citing sensor sources and metrics.

**Success Response (HTTP 200)**:
```json
{
  "answer": "In Shahupuri Commercial Hub & Central Station (Ward 14-A), estimated Air Quality Risk is 78/100. Recorded AQI is 168 with PM2.5 concentrations at 72.4 µg/m³. Primary particulate drivers include idling diesel transit buses, narrow urban canyon trapped PM2.5.",
  "zoneId": "zone-shahupuri",
  "dataStatus": "simulated",
  "evidence": [
    {
      "source": "Simulated Shahupuri Station Sensor #02",
      "metric": "PM2.5 Concentration",
      "value": 72.4,
      "detail": "Air risk evaluated at 78/100"
    },
    "Sensor network status: simulated data stream",
    "Key stress drivers: Idling diesel transit buses, Narrow urban canyon trapped PM2.5"
  ]
}
```

---

## 🗄️ DynamoDB Table Specification

### `ZonesTable`
- **Resource Name**: `ecotwin-zones-${EnvironmentStage}`
- **Partition Key**: `zoneId` (String, HASH)
- **Billing Mode**: `PAY_PER_REQUEST` (Serverless on-demand, no idle capacity cost)
- **Security**: Server-Side Encryption (`SSEEnabled: true`)
- **Resilience**: Point-in-Time Recovery (`PointInTimeRecoveryEnabled: true`)

### Database Seeding & Safety Guards

The seed script `backend/src/data-access/seedZones.ts` populates verified Kolhapur baseline zones into DynamoDB:
```bash
# Seed table configured in environment (ZONES_TABLE_NAME)
npm run seed

# Seed a specific table explicitly
node dist/src/data-access/seedZones.js --table ecotwin-zones-dev
```

#### Production Safety Guard
If the target table name includes `prod` or `ENVIRONMENT_STAGE=prod`, the script will automatically **ABORT** with a `[SAFETY ABORT]` error to protect live data.
To intentionally seed a production table, the developer must explicitly pass `--allow-prod` or set `ALLOW_PROD_SEED=true`:
```bash
ALLOW_PROD_SEED=true node dist/src/data-access/seedZones.js --table ecotwin-zones-prod --allow-prod
```

---

## ☁️ AWS Cloud Deployment (SAM Guided)

When deploying to a developer's AWS account:

### 1. Build SAM Artifacts
```bash
cd backend
npm run build
sam build
```

### 2. Deploy via Guided Setup
```bash
sam deploy --guided
```

SAM will interactively prompt for:
- **Stack Name**: `ecotwin-kolhapur-backend`
- **AWS Region**: `ap-south-1` (Mumbai) or preferred region
- **Parameter EnvironmentStage**: `dev` (or `staging` / `prod`)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Disable rollback**: `N`
- **Save arguments to configuration file (`samconfig.toml`)**: `Y`

### 3. Post-Deployment Outputs
Upon successful deployment, SAM outputs the endpoints and table name:
- `EcoTwinApiUrl`: `https://<api-id>.execute-api.<region>.amazonaws.com/dev/`
- `HealthEndpointUrl`: `https://<api-id>.execute-api.<region>.amazonaws.com/dev/health`
- `ZonesEndpointUrl`: `https://<api-id>.execute-api.<region>.amazonaws.com/dev/zones`
- `ZonesTableName`: `ecotwin-zones-dev`

### 4. Seed Cloud DynamoDB Table
Once deployed, seed the newly created AWS DynamoDB table:
```bash
export AWS_REGION="ap-south-1"
export ZONES_TABLE_NAME="ecotwin-zones-dev"
npm run seed
```

---

## 🔒 Security & IAM Least Privilege Rules

1. **Credentials**: Never commit AWS credentials, API keys, or `.env` files into source control.
2. **IAM Least Privilege**:
   - `HealthFunction`: Has no database or external service permissions.
   - `GetZonesFunction`: Granted strictly read-only access via `DynamoDBReadPolicy` on `ZonesTable`.
   - `GetZoneByIdFunction`: Granted strictly read-only access via `DynamoDBReadPolicy` on `ZonesTable`.
   - `GetPriorityZonesFunction`: Granted strictly read-only access via `DynamoDBReadPolicy` on `ZonesTable`.
   - `SimulateFunction`: Granted strictly read-only access via `DynamoDBReadPolicy` on `ZonesTable` (evaluates in-memory heuristics without mutating state).
   - `AskFunction`: Granted strictly read-only access via `DynamoDBReadPolicy` on `ZonesTable`.
3. **Data Protection**:
   - DynamoDB encryption at rest enabled via AWS managed keys (`SSEEnabled: true`).
   - Point-in-time recovery (PITR) enabled for continuous backups.
