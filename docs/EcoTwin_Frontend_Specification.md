# EcoTwin --- Kolhapur Frontend Specification

**Document status:** Proposed implementation contract\
**Version:** 1.0\
**Audience:** Frontend engineers, AI coding agents, integration lead\
**Project deadline:** Four-day hackathon\
**Important:** This document describes the agreed target implementation,
not already verified code. Where data providers, exact formulas, or
deployment details are undecided, they are explicitly marked as
decisions to confirm.

## 1. Purpose

Define the frontend architecture, screens, component responsibilities,
data contracts, map behavior, API integration, state management,
accessibility, testing, and integration rules for EcoTwin --- an
environmental digital twin for Kolhapur.

The frontend must let users explore environmental conditions through
three layers:

-   **Air:** air-quality and pollution-risk information.
-   **Heat:** urban heat risk.
-   **Waste:** waste-management risk.

The interface must clearly distinguish observed data, values derived
from observations, and simulated demonstration data.

## 2. Frontend Runtime and Stack

  -----------------------------------------------------------------------
  Item                                Decision
  ----------------------------------- -----------------------------------
  Framework                           React

  Language                            TypeScript

  Build/dev server                    Vite

  Styling                             Tailwind CSS

  UI primitives                       shadcn/ui where useful

  Icons                               Lucide React

  Map renderer                        MapLibre GL JS

  Geospatial format                   GeoJSON

  Charts                              Recharts, only where useful

  Tests                               Vitest + React Testing Library; add
                                      Playwright only if time permits

  Package manager                     npm unless the repository already
                                      standardizes on another manager

  API                                 REST over HTTPS

  Configuration                       Vite environment variables prefixed
                                      with `VITE_`
  -----------------------------------------------------------------------

### Map provider constraint

MapLibre is a map renderer, not a source of basemap tiles or building
data. The team must select a compatible tile/data provider and review
its terms, attribution requirements, rate limits, and free allowance. Do
not assume detailed 3D building coverage exists across all of Kolhapur.
If building footprints are unavailable, show the best supported map
style and prioritize reliable environmental zones.

## 3. Product Screens and Layout

### 3.1 Main environmental command center

Primary route: `/`

Layout regions:

1.  **Header**
    -   EcoTwin identity.
    -   Kolhapur location label.
    -   Data freshness/status indicator.
    -   Optional help/about action.
2.  **Left control rail**
    -   Air, Heat, Waste layer selection.
    -   City-level summary.
    -   Priority-zone list.
    -   Legend for the active layer.
3.  **Central map**
    -   MapLibre map centered on Kolhapur.
    -   Zoom and navigation controls.
    -   Environmental polygons or supported geographic zones.
    -   Optional 3D buildings where source data supports them.
    -   Selected-zone outline/highlight.
    -   Layer legend and data status.
4.  **Selected-zone panel**
    -   Zone name.
    -   EcoScore and component risk scores.
    -   Available observations, units, sources, and timestamps.
    -   Clear labels for missing, derived, or simulated values.
5.  **Ask EcoTwin panel**
    -   Question input.
    -   Loading, answer, evidence, and error states.
    -   Answers should identify whether supporting values are real,
        derived, or simulated.
6.  **What-if simulator**
    -   Select a supported intervention.
    -   Choose a documented intensity/range.
    -   Show baseline and estimated result.
    -   Show assumptions and a clear "estimate, not a forecast" notice.

On smaller screens, panels may become drawers or stacked sections. The
map must remain usable rather than overflow horizontally.

## 4. Routes and Navigation

For the MVP, a single dashboard route is sufficient. Do not add a
routing library unless multiple pages are genuinely required.

Possible future routes, not required for the first demo:

-   `/about-data` --- data sources and methodology.
-   `/methodology` --- scoring formulas and limitations.

## 5. Component Ownership

Suggested structure:

``` text
frontend/
  src/
    app/
      App.tsx
    components/
      layout/
        AppHeader.tsx
        DashboardLayout.tsx
      map/
        CityMap.tsx
        MapControls.tsx
        ZoneLayer.tsx
        MapLegend.tsx
      dashboard/
        CitySummary.tsx
        RiskMetric.tsx
        PriorityZoneList.tsx
      zone/
        ZoneDetailsPanel.tsx
        DataProvenance.tsx
      assistant/
        AskEcoTwin.tsx
        AnswerEvidence.tsx
      simulator/
        InterventionSimulator.tsx
        SimulationResult.tsx
      ui/
    features/
      air/
      heat/
      waste/
    services/
      apiClient.ts
      zonesApi.ts
      assistantApi.ts
      simulationApi.ts
    data/
      mockZones.ts
      mockGeoJson.ts
    hooks/
    types/
      environmental.ts
    utils/
      formatters.ts
      risk.ts
    main.tsx
```

Folders may be added when needed; do not create empty abstractions
solely to match the diagram.

### Component responsibilities

-   `CityMap`: owns MapLibre instance lifecycle and map events; does not
    calculate risk scores.
-   `ZoneLayer`: renders GeoJSON and active-layer styling.
-   `ZoneDetailsPanel`: displays selected zone data and provenance.
-   `PriorityZoneList`: renders backend-ranked zones; does not
    independently rank them using a second formula.
-   `AskEcoTwin`: collects the question and displays
    answer/evidence/error states.
-   `InterventionSimulator`: gathers inputs and displays API results;
    does not claim the result is scientifically validated.
-   `apiClient`: shared HTTP handling, base URL, JSON parsing, and
    normalized errors.
-   `mockZones`: development-only fixtures conforming to the same
    contract as the API.

## 6. Shared TypeScript Data Contract

Keep frontend interfaces aligned with backend schemas and the examples
in `docs/API-CONTRACT.md`.

``` ts
export type DataStatus = "real" | "derived" | "simulated";

export type LayerId = "air" | "heat" | "waste";

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
```

`null` means unavailable or not measured. Do not replace missing data
with zero. Risk scores, when available, must be between 0 and 100. A
high `ecoScore` means **higher environmental risk**, not better
sustainability.

Do not infer `dataStatus` for the whole zone if the three layers have
different provenance. Display each layer's status when necessary.

## 7. GeoJSON Contract

Every map feature must have a stable `properties.zoneId` that matches an
API `zone.id`.

Example shape:

``` json
{
  "type": "Feature",
  "properties": {
    "zoneId": "zone-01",
    "name": "Example Zone"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
```

The empty coordinates above are illustrative, not valid production
geometry. Use real valid geometry for map rendering. Never join data by
array index or display name. Unknown `zoneId` features should not crash
the map; log or surface a safe diagnostic in development.

## 8. Map Behavior

-   Initial camera should focus on Kolhapur using a verified center and
    reasonable zoom.
-   Map controls must support zoom and pan.
-   Clicking a zone selects it and updates the detail panel.
-   Changing Air/Heat/Waste updates polygon styling and the legend.
-   Selected zone styling must remain visible regardless of active
    layer.
-   Include a neutral style for missing data.
-   Include attribution required by the chosen basemap/data provider.
-   Avoid making unsupported claims from building appearance or map
    color.
-   Handle map load errors and missing tile/data responses.
-   Dispose of the MapLibre instance and listeners when the component
    unmounts.
-   Keep API/data state outside MapLibre's internal feature state where
    practical.

Layer colors must be accessible and accompanied by labels or a legend;
color alone cannot convey meaning.

## 9. API Integration Contract

Base URL: `VITE_API_BASE_URL`. Use an empty value only if a documented
same-origin proxy is configured.

Expected MVP endpoints:

  Method   Path                        Frontend use
  -------- --------------------------- ------------------------------------
  GET      `/zones`                    Load zones for map and summary
  GET      `/zones/{zoneId}`           Load selected-zone detail
  GET      `/priority-zones?limit=5`   Show backend-ranked priority zones
  POST     `/simulate`                 Calculate an intervention scenario
  POST     `/ask`                      Ask EcoTwin

Expected response envelope for zones:

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

These numbers are example/demo values, not actual Kolhapur observations.
Exact response schemas must be agreed in the shared API contract before
either side treats them as final.

### HTTP client rules

-   Use one shared API client.
-   Parse JSON only when a response has a body.
-   Handle non-2xx responses explicitly.
-   Do not assume all error responses share one format until the backend
    contract is frozen.
-   Apply a reasonable request timeout or abort policy.
-   Avoid duplicate requests when rapidly selecting zones.
-   Do not expose private API keys or model credentials in `VITE_`
    variables.
-   Do not silently switch to mock data after a production API failure;
    show an explicit fallback/demo mode label.

## 10. State Management

Use React component state and context for the MVP. Do not add
Redux/Zustand unless actual complexity justifies it.

Suggested state:

-   `activeLayer: LayerId`
-   `selectedZoneId: string | null`
-   `zones: EnvironmentalZone[]`
-   `selectedZone: ZoneDetails | null`
-   `priorityZones: EnvironmentalZone[]`
-   `loading/error` state per data operation
-   assistant question, answer, and status
-   simulation inputs and result

Rules:

-   The selected zone is stored by ID, not by array index.
-   API data is the canonical source in deployed mode.
-   Mock fixtures are only for development/demo fallback.
-   Changing layers must not clear the selected zone unless that
    behavior is intentionally designed.
-   Separate loading states so a slow AI response does not block map
    interaction.

## 11. Scoring Display Rules

The frontend only displays scores supplied by the backend. It may format
them, but must not create a competing EcoScore formula.

-   Show "Unavailable" when score is `null`.
-   Show data provenance beside or near the value.
-   Use a consistent scale of 0--100 when applicable.
-   Explain that higher EcoScore means higher estimated risk.
-   Display the methodology link or short explanation when available.
-   Do not imply that a heuristic risk score is an official AQI or
    validated public-health metric.

## 12. Error, Empty, and Loading States

Required states:

-   Initial map loading.
-   Zone data loading.
-   No zones returned.
-   No zone selected.
-   Selected zone missing.
-   Individual measurement unavailable.
-   API unavailable.
-   Map tile/provider unavailable.
-   AI provider unavailable or quota exceeded.
-   Simulation validation failure.
-   Simulation result clearly labeled as an estimate.

A backend or model failure must not crash the whole dashboard. Keep the
map usable when an independent panel fails.

## 13. Security and Privacy

-   Never place AWS secret keys or private model keys in frontend code.
-   `VITE_*` variables are public at build time.
-   Validate all user-provided text and numeric inputs on the backend as
    well.
-   Render AI text as text; do not inject raw HTML.
-   Do not collect precise personal location unless the feature requires
    it and the user has consented.
-   Avoid sending sensitive information to a model provider.
-   Follow the map/data provider's attribution and terms.

## 14. Testing and Acceptance Criteria

### Tests

-   Type-check and production build.
-   API client success and failure handling.
-   Correct layer selection and legend.
-   Zone selection updates details using matching IDs.
-   Missing values render as unavailable, not zero.
-   Simulated status is visible.
-   Priority zones are displayed in backend-provided order.
-   Simulator shows assumptions and model type.
-   AI answer displays evidence/provenance and failure state.
-   Map cleanup occurs on unmount.

### Definition of done

-   `npm run build` succeeds.
-   Relevant tests pass.
-   No TypeScript errors.
-   Map loads using the chosen provider and required attribution is
    visible.
-   All layer controls and selected-zone behavior work.
-   Mock mode and live API mode are distinguishable.
-   No secrets are committed.
-   The implementation matches `docs/API-CONTRACT.md`.

## 15. Frontend Environment Variables

Example `.env.example`:

``` dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_MAP_STYLE_URL=
VITE_DEMO_MODE=true
```

`VITE_MAP_STYLE_URL` must be set to a compatible style URL selected by
the team. Do not commit secret tokens. If a provider requires a public
browser token, understand that it is visible to users and restrict it
according to provider guidance.

## 16. AI Coding Agent Instructions

Before editing:

1.  Read this document and `docs/API-CONTRACT.md`.
2.  Inspect existing files and package versions.
3.  State the files to be changed and proposed approach.
4.  Do not invent API fields or change shared contracts silently.
5.  Implement only the assigned frontend task.
6.  Run type-check/build/tests and report exact results.
7.  Identify any assumptions or incomplete items.

## 17. Decisions Requiring Confirmation

-   Final basemap/tile and building-data provider.
-   Actual zone boundary dataset and zone naming.
-   Real environmental sources and their granularity.
-   Final EcoScore weights and missing-data strategy.
-   Final API response/error schema.
-   Whether the AI provider is available within a free quota.
-   Final deployment hostname and CORS origin.

These are decisions to confirm, not facts already implemented.
