# EcoTwin — Kolhapur

An environmental intelligence digital twin for Kolhapur, Maharashtra. Monitors air quality, urban heat, and waste management risk across 7 city zones with a heuristic what-if simulator and a natural-language Q&A interface.

> **Data status:** All zone data is clearly labelled `"simulated"`. This is a demonstration platform, not an official KMC measurement system.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  React 19 + Vite + MapLibre GL + Recharts + Tailwind CSS v4  │
│  Hosted on S3 + CloudFront (or AWS Amplify)                  │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS  (VITE_API_BASE_URL)
┌───────────────────────▼──────────────────────────────────────┐
│  Amazon API Gateway  (REST)                                  │
│  /health  /zones  /zones/{id}  /priority-zones               │
│  /simulate  /ask                                             │
└───────┬───────────┬───────────┬────────────┬─────────────────┘
        │           │           │            │
   Lambda       Lambda      Lambda       Lambda  (Node 20, 256 MB)
  getZones  getZoneById  simulate      ask
        │           │           │            │
        └───────────┴───────────┴────────────┘
                        │
              Amazon DynamoDB
              ecotwin-zones-{stage}
              (PAY_PER_REQUEST · SSE · PITR)
```

---

## Repository Layout

```
AWS-ecotwin/
├── src/                    # React frontend (TypeScript)
│   ├── app/App.tsx         # Root component & navigation state
│   ├── components/         # UI components (layout, dashboard, map)
│   ├── services/           # API client + per-endpoint service modules
│   ├── hooks/              # useEnvironmentalData custom hook
│   ├── data/               # Mock/demo data (offline fallback)
│   ├── types/              # Frontend TypeScript types
│   └── styles/             # Tailwind + MapLibre CSS
├── public/                 # MapLibre web worker assets (served as-is)
├── index.html              # Vite HTML entry
├── vite.config.ts          # Vite build config
├── tsconfig.json           # Frontend TypeScript config
├── package.json            # Frontend dependencies & scripts
├── .env.example            # Frontend environment variable template
└── backend/                # Serverless backend (TypeScript + AWS SAM)
    ├── src/
    │   ├── handlers/       # Lambda entry points (thin adapters)
    │   ├── services/       # Business logic (simulation, Q&A, zones)
    │   ├── data-access/    # DynamoDB client, repository, seeding
    │   ├── validation/     # Request validation
    │   └── types/          # Backend domain types
    ├── tests/              # Unit tests (node:test, no AWS needed)
    ├── template.yaml       # AWS SAM IaC (API Gateway, Lambda, DynamoDB)
    ├── samconfig.toml      # SAM CLI deployment defaults
    ├── docker-compose.yml  # Local DynamoDB + admin GUI
    ├── package.json        # Backend dependencies & scripts
    └── .env.example        # Backend environment variable template
```

---

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Frontend + backend runtime |
| npm | ≥ 10 | Package management |
| Docker | any | Local DynamoDB (optional) |
| AWS SAM CLI | ≥ 1.120 | Local Lambda emulation + deployment |
| AWS CLI | ≥ 2 | Cloud deployment |

### 1. Frontend

```bash
# Install dependencies
npm install

# Copy env template and configure
cp .env.example .env.local
# Leave VITE_API_BASE_URL empty to run in demo mode (no backend needed)

# Start dev server on http://localhost:3000
npm run dev
```

The frontend works **fully offline in demo mode** (mock data, no AWS needed). Set `VITE_API_BASE_URL` to a live API Gateway URL to switch to live data.

### 2. Backend

```bash
cd backend
npm install
npm run build       # compile TypeScript → dist/
npm run test:ts     # compile + run unit tests (no Docker needed)
```

### 3. Local DynamoDB (optional)

Start DynamoDB Local and the visual admin GUI:

```bash
cd backend
docker compose up -d
```

This gives you:
- **DynamoDB Local** on `http://localhost:8000`
- **dynamodb-admin GUI** on `http://localhost:8001`

Initialise the table and seed the 7 Kolhapur zones:

```bash
npm run db:init
```

Then open `http://localhost:8001` to browse and edit records in your browser.

### 4. Local Lambda API (SAM)

Create `backend/env.json`:

```json
{
  "Parameters": {
    "DYNAMODB_ENDPOINT": "http://host.docker.internal:8000",
    "ZONES_TABLE_NAME": "ecotwin-zones-dev",
    "AWS_REGION": "ap-south-1"
  }
}
```

```bash
cd backend
npm run build
sam local start-api --port 3001 --env-vars env.json
```

Then update `.env.local` at the root:

```
VITE_API_BASE_URL=http://localhost:3001
```

---

## AWS Deployment

### What gets deployed

| Resource | Service |
|----------|---------|
| React SPA | S3 + CloudFront (or Amplify) |
| REST API | Amazon API Gateway |
| 6 Lambda functions | AWS Lambda (Node 20) |
| Data store | Amazon DynamoDB |
| IAM roles | Auto-created by SAM (least-privilege) |

---

### Step 1 — Deploy the Backend (SAM)

You need AWS credentials with permissions to create Lambda, API Gateway, DynamoDB, CloudFormation, S3, and IAM roles.

```bash
cd backend

# Install & compile
npm install
npm run build

# Build the SAM artifact (packages Lambda code into .aws-sam/)
sam build

# First-time deploy (interactive — answers saved to samconfig.toml)
sam deploy --guided
```

Answer the prompts:

| Prompt | Value |
|--------|-------|
| Stack Name | `ecotwin-kolhapur-backend` |
| AWS Region | `ap-south-1` |
| Parameter EnvironmentStage | `dev` |
| Confirm changeset before deploy | `Y` |
| Allow SAM to create IAM roles | `Y` |
| Disable rollback | `N` |
| Save to samconfig.toml | `Y` |

After deploy, SAM prints the API Gateway URL:

```
Outputs:
  EcoTwinApiUrl = https://abc123xyz.execute-api.ap-south-1.amazonaws.com/dev/
```

**Subsequent deploys** (after initial config is saved):

```bash
npm run sam:build   # builds + deploys using samconfig.toml defaults
# or
sam build && sam deploy
```

---

### Step 2 — Seed the DynamoDB Table

After the backend stack is deployed, seed the 7 Kolhapur zone records into the cloud table:

```bash
cd backend
export AWS_REGION="ap-south-1"
export ZONES_TABLE_NAME="ecotwin-zones-dev"
npm run seed
```

Verify by calling the health and zones endpoints:

```bash
BASE=https://abc123xyz.execute-api.ap-south-1.amazonaws.com/dev

curl $BASE/health
curl $BASE/zones
curl "$BASE/priority-zones?limit=3"
```

---

### Step 3 — Deploy the Frontend

#### Option A: AWS Amplify (recommended — easiest)

1. Push the repository to GitHub / CodeCommit.
2. In the [AWS Amplify Console](https://console.aws.amazon.com/amplify), click **New app → Host web app** and connect your repository.
3. Amplify auto-detects Vite. Use these build settings (or paste into `amplify.yml`):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. Add environment variables in **Amplify → App settings → Environment variables**:

```
VITE_API_BASE_URL   = https://abc123xyz.execute-api.ap-south-1.amazonaws.com/dev
VITE_DEMO_MODE      = false
VITE_MAP_STYLE_URL  = https://tiles.openfreemap.org/styles/dark
```

5. Deploy. Amplify gives you an HTTPS URL like `https://main.d1abcdef.amplifyapp.com`.

#### Option B: S3 + CloudFront (manual)

```bash
# Build the frontend
npm run build

# Create an S3 bucket (bucket name must be globally unique)
aws s3 mb s3://ecotwin-kolhapur-frontend --region ap-south-1

# Enable static website hosting
aws s3 website s3://ecotwin-kolhapur-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build output
aws s3 sync dist/ s3://ecotwin-kolhapur-frontend --delete

# Create a CloudFront distribution pointing to the S3 bucket
# (do this in the AWS Console or via CloudFormation for HTTPS support)
```

> For a production-grade S3+CloudFront setup with OAC (Origin Access Control) and HTTPS, use the AWS Console or a CloudFormation/CDK stack. Amplify is simpler for most cases.

---

### Step 4 — Wire Frontend to Backend

After both are deployed, set the frontend environment variables so it hits the real API:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | API Gateway URL from Step 1 (no trailing slash) |
| `VITE_DEMO_MODE` | `false` |
| `VITE_MAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/dark` |

In Amplify: set these under **App settings → Environment variables** and redeploy.  
In S3+CF: rebuild with `.env.local` set before running `npm run build`.

---

### Staging / Production

Deploy separate stacks for each environment:

```bash
# Staging
sam deploy --parameter-overrides EnvironmentStage=staging

# Production (uses a separate DynamoDB table: ecotwin-zones-prod)
sam deploy --parameter-overrides EnvironmentStage=prod
```

The production safety guard in `seedZones.ts` will block accidental seeding of `*-prod` tables unless you explicitly set `ALLOW_PROD_SEED=true`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/zones` | All 7 environmental zones |
| GET | `/zones/{zoneId}` | Full telemetry for one zone |
| GET | `/priority-zones?limit=N` | Top N zones by risk score |
| POST | `/simulate` | What-if intervention simulation |
| POST | `/ask` | Natural-language Q&A grounded in zone data |

Full request/response schemas are in [`backend/README.md`](./backend/README.md).

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No | API Gateway URL. Empty = demo/offline mode. |
| `VITE_DEMO_MODE` | No | `true` forces demo mode; `false` forces live. |
| `VITE_MAP_STYLE_URL` | No | MapLibre style URL. Defaults to OpenFreeMap dark. |

### Backend (Lambda env vars set by SAM template)

| Variable | Source |
|----------|--------|
| `ZONES_TABLE_NAME` | Auto-set by SAM from the DynamoDB table resource |
| `ENVIRONMENT_STAGE` | SAM parameter `EnvironmentStage` |
| `AWS_REGION` | Lambda execution environment |

---

## Security Notes

- **Never commit `.env` files.** The `.gitignore` blocks them. Only `.env.example` files are committed.
- All Lambda functions have **least-privilege IAM policies** (read-only DynamoDB access; `HealthFunction` has no DB access at all).
- DynamoDB is encrypted at rest (`SSEEnabled`) and has **Point-in-Time Recovery** enabled.
- CORS is configured on API Gateway. For production, restrict `AllowOrigin` in `template.yaml` to your CloudFront/Amplify domain instead of `'*'`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Map | MapLibre GL JS v6 (OpenFreeMap tiles) |
| Charts | Recharts v3 |
| Icons | Lucide React |
| Backend runtime | Node.js 20 + TypeScript |
| IaC | AWS SAM (CloudFormation) |
| API | Amazon API Gateway (REST) |
| Compute | AWS Lambda |
| Database | Amazon DynamoDB |
| Frontend hosting | AWS Amplify / S3 + CloudFront |
cd 
