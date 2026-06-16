# SignalCare

Reach the right care before the waiting room.

SignalCare is a safety-first Gen AI healthcare triage assistant. It helps a patient describe symptoms in natural language, extracts structured triage details, checks deterministic emergency guardrails, asks adaptive follow-up questions, recommends a care pathway, and generates a provider-ready summary.

SignalCare is not a chatbot trying to diagnose patients. AI helps extract and summarize patient information, while deterministic clinical guardrails control urgency escalation.

> Medical disclaimer: This is an educational prototype, not a certified medical device. It does not diagnose, prescribe, or replace emergency services, clinicians, or local medical advice. If symptoms feel severe, rapidly worsening, or possibly life-threatening, call emergency services now.

Brand mark: SignalCare uses a pulse-shield mark to represent AI signal detection inside deterministic safety guardrails.

## Problem Statement

Patients often cannot self-triage accurately. A safety-first assistant can help them reach the right care level before the waiting room by asking focused questions, identifying emergency red flags, and preparing a concise summary for clinicians.

Supported care levels:

- Emergency services now
- A&E today
- GP urgent appointment
- GP routine
- Self-care with monitoring

## Solution Summary

SignalCare combines a Gen AI-assisted intake layer with deterministic triage rules:

- Natural-language symptom intake with local simulated extraction when no LLM endpoint is configured.
- Deterministic red-flag guardrails that always override lower-acuity logic.
- Symptom-specific adaptive questioning for chest pain, breathing difficulty, headache/neurological symptoms, abdominal pain, fever/infection, and general symptoms.
- Locale-aware care terminology for UK, India, and US.
- Provider-ready summary with copy, `.txt`, `.json`, and print export.
- Evaluation dashboard showing 33 deterministic safety test cases and metrics.

## Gen AI Role

The Gen AI layer is non-authoritative. It is used for:

- Language understanding
- Symptom extraction
- Draft structuring
- Explanation support
- Summarization

It is not used as the final authority for emergency decisions. LLM output is treated as untrusted until the deterministic safety rules validate the structured session.

## Why Deterministic Guardrails

Healthcare triage needs predictable emergency escalation. SignalCare uses deterministic guardrails because:

- Emergency red flags must never be down-triaged by a probabilistic model.
- Safety behavior should be inspectable and testable.
- False positives are acceptable; missed emergencies are not.
- Clinicians and judges can audit the exact rules that fired.

## Safety-First Architecture

```text
Patient message
   |
   v
AI-assisted symptom extraction
   |
   v
Structured triage session
   |
   v
Deterministic red-flag guardrails
   |
   v
Adaptive questioning
   |
   v
Urgency classification
   |
   v
Care pathway guidance
   |
   v
Provider summary and export
```

Important safety properties:

- The LLM layer is non-authoritative.
- Guardrails always override.
- Emergency sensitivity is prioritized over reducing false positives.
- The app avoids diagnostic language such as "you are having a heart attack."

## Key Features

- AI-assisted free-text intake: "I have chest tightness and it is spreading to my left arm. I feel sweaty."
- AI understanding review card with extracted details and edit/continue controls.
- Immediate emergency override from extracted red flags.
- Adaptive questions that skip details already captured from free text.
- Explainability panel: "Why this care level?"
- Region selector:
  - UK: 999, A&E, GP
  - India: 112 or 108, emergency department, doctor or clinic
  - US: 911, ER, primary care doctor
- Evaluation dashboard with pass/fail table and safety metrics.
- Provider summary exports:
  - Copy summary
  - Download `.txt`
  - Download `.json`
  - Print clean handoff view

## Evaluation Results

Current deterministic suite:

- Total test cases: 33
- Passed cases: 33
- Emergency sensitivity: 100%
- Emergency misses: 0
- Safety override pass rate: 100%

Emergency cases include chest pain with radiation, chest pain with shortness of breath, stroke-like symptoms, sudden worst headache, seizure, loss of consciousness, severe allergic reaction, heavy bleeding, fever with confusion, fever with stiff neck, and immediate self-harm risk.

Non-emergency cases cover A&E today, urgent GP, routine GP, and self-care pathways.

## How to Run Locally

```bash
cd triage-assistant-prototype/frontend
npm install
npm run build
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Run the deterministic suite in the browser console:

```js
window.runSignalCareTests()
```

Or from the frontend directory:

```bash
node -e "const esbuild=require('esbuild'); esbuild.buildSync({entryPoints:['src/lib/triageTests.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/signalcare-tests.mjs'}); import('/tmp/signalcare-tests.mjs').then((m)=>{const r=m.runTriageTestSuite(); console.log(m.calculateEvaluationMetrics(r));})"
```

## Project Structure

```text
frontend/
  public/
    signalcare-hero.png
  src/
    App.tsx
    styles.css
    lib/
      careTerminology.ts
      demoCases.ts
      questions.ts
      symptomExtraction.ts
      triageRules.ts
      triageTests.ts
      triageTypes.ts
```

The repository also contains an earlier FastAPI backend prototype, but the polished SignalCare MVP runs locally in the frontend with deterministic TypeScript rules and no required backend.

## Screenshots

Suggested screenshots for judging:

- Landing page with hero, safety positioning, demo module, and evaluation section.
- AI-assisted natural-language intake.
- Emergency chest pain demo with red emergency override.
- Low-urgency headache demo with self-care route.
- Evaluation dashboard showing 33/33 tests and zero emergency misses.
- Provider summary with export actions.

## Limitations

- This prototype is not clinically validated.
- The local extraction layer is rule/simulation based unless an external LLM endpoint is configured.
- The rule set is intentionally conservative and incomplete compared with production triage protocols.
- Pediatric, pregnancy, medication, mental health, and chronic disease pathways would need clinician review before real-world use.
- No permanent storage, authentication, audit logging, or EHR integration is included in this MVP.

## Future Scope

- Clinician-authored rule governance and versioning.
- Formal validation against triage datasets and clinician review.
- Safer LLM integration with schema validation and prompt/version logging.
- Multilingual intake and locale-specific care pathways.
- EHR, scheduling, nurse line, and emergency routing integrations.
- Privacy controls, audit logs, and secure session handoff.

## Safety Positioning

SignalCare supports care navigation and provider handoff. It does not diagnose, prescribe, or replace clinical judgement. Emergency symptoms should always be escalated immediately through local emergency services.
