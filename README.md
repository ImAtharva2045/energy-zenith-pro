# Grid Guardian

Build a fully interactive prototype called “GRIDSHIELD”.

==================================================

1. PROJECT PURPOSE

==================================================

GRIDSHIELD is an intelligent decision-support system for dynamic power allocation during urban disasters.

The core idea is NOT to replace existing SCADA/DMS/grid infrastructure. GRIDSHIELD acts as an intelligent decision layer that uses grid conditions, facility urgency, disaster conditions, predicted demand, available energy resources and network constraints to recommend how limited electricity should be allocated.

This is a Phase-1 proof-of-concept for a Smart India Hackathon-style demonstration.

IMPORTANT:

- Use realistic SYNTHETIC/MOCK data only.

- Do NOT claim that the data is real Mumbai data.

- Do NOT connect to real hospitals, utilities, SCADA systems, or government APIs.

- Clearly indicate somewhere in the UI: “Phase-1 Prototype — Simulated Data”.

- The goal is to demonstrate the complete decision-making loop interactively.

==================================================

2. CORE DEMO SCENARIO

==================================================

Simulate ONE 11 kV substation supplying four zones:

1. Hospital H01

2. Water Treatment Plant W01

3. Residential Zone R01

4. Commercial Zone C01

The simulated substation should have:

- Total available power

- Current total demand

- Voltage

- Current

- Frequency

- Feeder capacity

- Transformer capacity

- Solar generation

- Battery availability

Each zone should have realistic simulated values.

Example baseline values:

Hospital H01:

- Demand: 20 MW

- Criticality: Very High

- ICU occupancy: 70%

- Emergency workload: Medium

- Backup remaining: 4 hours

- Disaster exposure: Medium

Water Plant W01:

- Demand: 15 MW

- Criticality: Very High

- Backup remaining: 5 hours

Residential R01:

- Demand: 30 MW

- Criticality: Medium

- Flexibility: Medium

Commercial C01:

- Demand: 25 MW

- Criticality: Low

- Flexibility: High

Total demand should sometimes exceed available power so that GRIDSHIELD has an actual allocation problem to solve.

These values are examples. Keep all values editable through the control panel.

==================================================

3. MAIN GRIDSHIELD DECISION LOOP

==================================================

The prototype must demonstrate this complete loop:

SIMULATED REAL-TIME DATA

        ↓

DYNAMIC PRIORITY SCORING

        ↓

DEMAND PREDICTION

        ↓

CONSTRAINT-AWARE POWER ALLOCATION

        ↓

EXPLAINABLE RECOMMENDATION

        ↓

OPERATOR APPROVAL / REJECTION / OVERRIDE

        ↓

SIMULATED GRID EXECUTION

        ↓

MONITOR UPDATED CONDITIONS

        ↓

REASSESS AND REALLOCATE

This loop is the main purpose of the prototype.

==================================================

4. FEATURE 1 — DYNAMIC ZONE PRIORITY SCORING (DZPS)

==================================================

Implement a real, dynamic priority calculation.

Each zone must receive a score from 0–100.

The score should respond to factors such as:

- Facility criticality

- Emergency workload

- ICU occupancy for the hospital

- Disaster severity

- Backup power remaining

- Active critical tasks

The score must change when the operator changes these conditions.

IMPORTANT:

Do not simply hardcode the displayed score.

Calculate it from the input values.

Show for each zone:

- DZPS score

- Priority level:

  Critical / High / Medium / Low

- Main factors affecting the score

Example:

Hospital H01

DZPS: 94/100

Priority: CRITICAL

Reasons:

- ICU occupancy: 90%

- Emergency workload: High

- Backup remaining: 1 hour

- Flood severity: High

The exact formula can be implemented as a normalized weighted scoring model that produces a 0–100 result.

Keep the formula readable and explainable.

==================================================

5. FEATURE 2 — DISASTER-AWARE ML DEMAND PREDICTION

==================================================

The concept uses an XGBoost ML model to predict near-term electricity demand.

For this prototype:

- Create a synthetic historical dataset inside the project.

- Include features such as:

  - Previous demand

  - Time/period

  - Disaster severity

  - Rainfall/flood severity

  - Facility workload

  - ICU occupancy

  - Emergency activity

  - Solar generation

  - Battery availability

- Train/use an XGBoost regression model if the environment supports it.

If a real XGBoost model cannot run directly in the Lovable frontend, create a clean prediction service/interface so that the prototype still demonstrates the intended ML pipeline using simulated prediction logic.

DO NOT falsely claim that a trained model is running if it is not.

Display:

- Current demand

- Predicted near-term demand

- Prediction change

- Factors affecting prediction

Example:

Current demand: 18 MW

Predicted demand: 22 MW

Reason:

High flood severity + increased hospital workload.

Clearly label simulated/model-demo predictions where appropriate.

==================================================

6. FEATURE 3 — CONSTRAINT-AWARE SMART ALLOCATION

==================================================

This is different from DZPS.

DZPS answers:

“Who needs power the most right now?”

The Smart Allocation Engine answers:

“How much power should each zone actually receive?”

The allocation engine must consider:

- DZPS priority

- Predicted demand

- Minimum safe power for each critical zone

- Available grid power

- Solar generation

- Battery availability

- Feeder capacity

- Transformer capacity

When total demand exceeds available power, calculate a new allocation.

Example:

Available power: 70 MW

Hospital:

Demand = 20 MW

Priority = 94

Allocation = 20 MW

Water Plant:

Demand = 15 MW

Priority = 85

Allocation = 15 MW

Residential:

Demand = 30 MW

Priority = 60

Allocation = 25 MW

Commercial:

Demand = 25 MW

Priority = 25

Allocation = 10 MW

These numbers are illustrative. The actual allocation shown in the dashboard must be calculated from the current simulated inputs.

Show:

- Requested demand

- Allocated power

- Reduction

- Priority

- Status

Possible statuses:

PROTECTED

NORMAL

REDUCED

CURTAILED

Do not use “curtailed” without also making the meaning understandable in the UI. For example:

“CURTAILED — Power reduced due to shortage.”

==================================================

7. FEATURE 4 — EXPLAINABLE, CONTEXT-RICH DECISIONS

==================================================

Every major recommendation must include an understandable explanation.

Do NOT just show:

“Reduce Commercial by 5 MW.”

Instead show:

“Reduce Commercial Zone by 5 MW because Hospital H01 priority increased due to high ICU workload, severe flooding and low backup availability.”

The explanation should be generated from the actual current values.

Show the key factors behind the recommendation:

- Hospital urgency

- Disaster severity

- Backup availability

- Facility workload

- Load flexibility

- Current power shortage

- Network constraints

The explanation should help an operator understand WHY the system made the recommendation.

Do not use fake SHAP charts unless an actual SHAP implementation exists.

For this prototype, a clear rule-based explanation panel is acceptable.

==================================================

8. FEATURE 5 — CONTINUOUS REASSESSMENT & REALLOCATION

==================================================

GRIDSHIELD must NOT behave like a one-time calculator.

When the operator changes conditions, recalculate:

1. DZPS

2. Predicted demand

3. Available power

4. Allocation

5. Recommendation

6. Explanation

Provide a “Reassess Grid” button.

Also provide an optional simulated automatic reassessment indicator showing:

“Next reassessment: 15 min”

For the demo, allow the user to trigger reassessment immediately.

Example scenario:

Initial:

Hospital priority = 94

Hospital allocation = 20 MW

Operator clicks:

“Surgery Completed”

Hospital workload decreases.

The system recalculates:

Hospital priority decreases

Hospital demand decreases

Hospital allocation decreases

The freed power can then be allocated to another zone.

This demonstrates that power follows changing urgency rather than a static schedule.

==================================================

9. DISASTER / OPERATOR CONTROL PANEL

==================================================

Create a dedicated “Scenario Controls” panel.

The operator should be able to change:

DISASTER:

- Flood severity: 0–10

- Rainfall intensity

- Affected zone

HOSPITAL:

- ICU occupancy: 0–100%

- Emergency workload: Low / Medium / High

- Surgery: ON / OFF

- Backup remaining: 0–24 hours

ENERGY:

- Available grid power

- Solar generation

- Battery state of charge

GRID:

- Feeder capacity

- Transformer capacity

Provide quick scenario buttons:

[ NORMAL CONDITIONS ]

[ TRIGGER FLOOD ]

[ HOSPITAL EMERGENCY ]

[ BACKUP CRITICAL ]

[ SURGERY COMPLETED ]

[ RESTORE NORMAL ]

These buttons should modify the simulated data and trigger a recalculation.

==================================================

10. OPERATOR APPROVAL / OVERRIDE

==================================================

GRIDSHIELD is a DECISION-SUPPORT system.

It must NOT autonomously control a real grid.

Every recommendation should have:

[ APPROVE ]

[ REJECT ]

[ OVERRIDE ]

APPROVE:

Apply the recommended simulated allocation.

REJECT:

Keep the previous allocation and show that the operator rejected the recommendation.

OVERRIDE:

Allow the operator to manually specify an allocation for one or more zones.

Show a small activity log:

12:30 — GRIDSHIELD recommended reducing Commercial by 5 MW.

12:31 — Operator APPROVED recommendation.

12:31 — Simulated allocation updated.

==================================================

11. SIMULATED GRID / SCADA VIEW

==================================================

Create a simplified visual representation of the simulated substation.

Show:

SUBSTATION

    |

    ├── Hospital

    ├── Water Plant

    ├── Residential

    └── Commercial

Display simulated:

- Voltage

- Current

- Frequency

- Power flow

- Feeder loading

- Transformer loading

Use status indicators:

NORMAL

WARNING

CRITICAL

These values are simulated and should visibly change when the scenario changes.

DO NOT claim this is connected to real SCADA.

For this Phase-1 prototype, do NOT implement IEC-104 yet.

The architecture should remain clean enough that a real SCADA/IEC-104 integration could be added later.

==================================================

12. MAIN DASHBOARD DESIGN

==================================================

Create a professional engineering / power-grid dashboard.

Avoid:

- Generic AI robot graphics

- Emojis

- Cartoon illustrations

- Excessive gradients

- Excessive rounded cards

- Decorative AI imagery

Use:

- Clean technical icons

- Dark/navy/neutral engineering dashboard aesthetic

- Clear typography

- Strong hierarchy

- Subtle borders

- Professional data visualization

The dashboard should contain:

TOP BAR:

GRIDSHIELD

“Intelligent Power Allocation & Grid Resilience”

Status:

● NORMAL / WARNING / CRITICAL

Badge:

“PHASE-1 PROTOTYPE • SIMULATED DATA”

KEY METRICS:

Available Power

Total Demand

Power Shortage / Surplus

Critical Zones

Grid Health

ZONE TABLE:

Zone

Type

Demand

Predicted Demand

DZPS

Allocated Power

Reduction

Status

RECOMMENDATION PANEL:

Recommended Action

Why?

Affected Zone

Power Change

Priority Factors

OPERATOR ACTIONS:

Approve

Reject

Override

==================================================

13. VISUAL GRID MAP

==================================================

Create a simplified schematic/map-like view of the four zones.

Do not try to reproduce the actual geography of Mumbai.

Represent:

Substation

↓

Feeder

↓

Hospital

Water Plant

Residential

Commercial

Use visual states:

Green = protected/normal

Yellow = warning/reduced

Red = critical

Grey = unavailable

The visual should update when allocations change.

==================================================

14. ANALYTICS

==================================================

Include simple charts:

1. Demand vs Available Power

2. DZPS by Zone

3. Current Allocation by Zone

4. Predicted vs Current Demand

Keep charts simple and readable.

Do not fill the dashboard with unnecessary charts.

==================================================

15. ACTIVITY / DECISION LOG

==================================================

Create a decision history panel.

Example:

12:30

Flood severity increased to HIGH.

12:30

Hospital DZPS increased from 72 → 94.

12:30

Hospital predicted demand increased from 18 → 22 MW.

12:31

GRIDSHIELD recommended reducing Commercial by 5 MW.

12:31

Operator approved recommendation.

This makes the continuous decision loop visible to judges.

==================================================

16. DEMO FLOW

==================================================

The prototype must support this exact demonstration:

STEP 1 — NORMAL

Show:

Available Power: 100 MW

Demand: 95 MW

All zones operating normally.

STEP 2 — TRIGGER FLOOD

Operator clicks:

TRIGGER FLOOD

Flood severity becomes HIGH.

Hospital workload and disaster impact increase.

STEP 3 — GRIDSHIELD RESPONDS

Hospital DZPS increases.

Predicted hospital demand increases.

The allocation engine calculates a new allocation.

A recommendation appears:

“Reduce Commercial Zone by X MW to protect Hospital H01.”

Show the reasoning.

STEP 4 — OPERATOR APPROVES

Click APPROVE.

The simulated allocation changes.

Show the activity log.

STEP 5 — SURGERY COMPLETED

Click:

SURGERY COMPLETED

Hospital workload decreases.

GRIDSHIELD reassesses.

Hospital priority/demand decreases.

Freed power is reallocated to Residential or another eligible zone.

STEP 6 — OPERATOR OVERRIDE

Reject one recommendation.

Use OVERRIDE to manually change an allocation.

Show that the human operator remains in control.

==================================================

17. DATA MODEL

==================================================

Use local mock/synthetic state for the first prototype.

Create data structures for:

Zone:

- id

- name

- type

- criticality

- currentDemand

- predictedDemand

- minimumSafePower

- dzps

- allocatedPower

- backupHours

- icuOccupancy

- emergencyWorkload

- flexibility

- disasterSeverity

- solarGeneration

- batteryAvailable

Grid:

- availablePower

- totalDemand

- feederCapacity

- transformerCapacity

- voltage

- current

- frequency

Disaster:

- type

- severity

- rainfall

- affectedZones

Do not require a database for the first version.

Use local application state / mock JSON.

==================================================

18. IMPORTANT TECHNICAL ARCHITECTURE

==================================================

Keep the first prototype simple.

Frontend:

Use a modern web dashboard suitable for Lovable.

Backend/data:

Use local mock/synthetic data initially.

Decision logic:

Keep DZPS, demand prediction and allocation logic modular so that they can later be replaced with real Python services.

Do NOT implement yet:

- Real SCADA integration

- IEC-104

- Real utility APIs

- Real hospital APIs

- PostgreSQL

- Redis

- Authentication/RBAC

- Docker

- Microservices

These are future integration steps, not Phase-1 requirements.

==================================================

19. IMPORTANT HONESTY / PROTOTYPE LABELING

==================================================

The prototype must clearly distinguish between:

REAL IMPLEMENTED LOGIC:

- Dynamic priority calculation

- Allocation calculation

- Scenario-driven reassessment

- Operator approval/rejection/override

- Explainable recommendations

SIMULATED DATA:

- Substation readings

- Hospital data

- Water plant data

- Disaster data

- Solar/battery data

- Grid measurements

Do not present simulated values as real Mumbai measurements.

Include:

“Phase-1 Proof of Concept — Simulated Grid & Facility Data”

and:

“Production deployment would require integration with utility SCADA/DMS, facility systems, verified network models and authorized control interfaces.”

==================================================

20. CODE QUALITY

==================================================

Do not create a static fake dashboard where buttons only change text.

The interactions must actually update the underlying state.

When flood severity changes:

→ update disaster state

→ recalculate DZPS

→ update demand prediction

→ recalculate allocation

→ update recommendation

→ update explanation

→ update dashboard

→ add event to activity log

When surgery is completed:

→ reduce emergency workload

→ recalculate priority

→ recalculate demand

→ recalculate allocation

→ show reallocation

Keep calculations modular and readable.

Add comments explaining the GRIDSHIELD logic.

==================================================

21. FINAL GOAL

==================================================

The finished prototype should allow a judge to understand GRIDSHIELD in approximately 2–3 minutes:

1. This is a simulated substation.

2. A disaster changes the situation.

3. Facility urgency changes.

4. GRIDSHIELD dynamically recalculates priority.

5. Demand prediction changes.

6. Available power is allocated according to priority and grid constraints.

7. GRIDSHIELD explains why.

8. The operator approves/rejects/overrides.

9. Conditions change again.

10. GRIDSHIELD reassesses and reallocates.

The most important thing is that the prototype demonstrates the COMPLETE GRIDSHIELD DECISION LOOP rather than being only a static UI.

Build the prototype now with realistic synthetic data and fully interactive state changes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/538a5750-999c-4134-b675-3d641887088e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
