# Neuro Track Care

Here's a complete build brief you can paste directly into Lovable — written so it understands the full picture before generating anything.

Project: NeuroTrack

What it is: A remote monitoring platform for Parkinson's disease patients in Zimbabwe. Patients do a short daily check-in from their phone instead of waiting months between neurologist visits. An AI engine watches for concerning trends and alerts a care team (Cimas) when something needs urgent attention.

Who uses it: Two user types — Patients (mobile-first daily check-in flow) and Clinicians (web dashboard to review trends and cases).

Tech Stack

Layer Technology Why Frontend React One shared framework for both the patient app and clinician dashboard Main backend Django + Django REST Framework Auth, CRUD, database access, business logic Voice ML service FastAPI (separate service) Isolated because it needs Python's audio/ML libraries (librosa, scikit-learn) — kept separate from Django so it can scale and deploy independently Database PostgreSQL Relational, handles patient records + time-series-style history well Notifications Firebase Cloud Messaging (FCM) Push notifications for medication reminders and critical alerts

Why two backend services instead of one: Django handles everything except the ML pipeline. FastAPI exists purely to run the voice analysis (MFCC feature extraction → L1 feature selection → SVM classification), since that needs Python's audio libraries. Django calls FastAPI over HTTP, gets back a result, and stores it — Django never runs the ML itself.

The Six Core Modules

1. Patient App (React) Daily check-in screens: medication confirmation, voice sample recording, symptom diary. Also displays in-app push notifications.

2. Voice Analysis Service (FastAPI) Patient records themselves saying "aaah" for ~10 seconds. The service:

Extracts MFCC (Mel-Frequency Cepstral Coefficient) features from the audio using librosa

Applies L1-based feature selection to keep only the informative features

Classifies with an SVM (Support Vector Machine) using scikit-learn

Returns a result (and feature vector) to Django for storage

3. AI Trend & Escalation Engine (Django) Compares each patient's latest data against their own historical baseline (not a population average). Looks for sustained trends across voice results, medication adherence, and diary entries — not single-day blips.

Runs two-tier escalation logic:

Tier 1 (Urgent/Automatic): Hard thresholds — e.g. repeated falls + sharp voice deterioration — trigger an immediate automatic alert to the Cimas care team, no human review needed first.

Tier 2 (Routine/Manual): Borderline trends get flagged on the clinician dashboard. A human clinician decides whether to escalate.

4. Clinician Dashboard (React) Shows trend charts per patient, plain-language AI-generated summaries, medication adherence history, symptom diary log, and an escalation panel with a manual "notify Cimas" action for Tier 2 cases.

5. Notification Service (Firebase Cloud Messaging) Two jobs: (a) timely medication reminders pushed to the patient at scheduled dose times, and (b) critical alerts pushed to the Cimas care team and/or clinician when Tier 1 escalation fires.

6. Data Store (PostgreSQL, via Django ORM) Core tables: Patient profile, Medication log (taken/missed + timestamp), Voice analysis history (features + classification result), Symptom diary entries, Escalation/case log.

How Data Flows (end to end)

Patient opens the app → gets an in-app notification reminding them of their dose → taps "taken" or "missed" → logged instantly via Django API.

Patient records a 10-second voice sample → sent to the FastAPI service → MFCC extraction → SVM classification → result sent back to Django → stored against that patient's history.

Patient fills in the symptom diary → stored via Django API.

On a schedule (or after each new data point), the AI Trend Engine re-evaluates that patient's trend line against their baseline.

If it crosses a critical threshold → automatic push alert to Cimas via FCM.

If it's borderline → flagged on the Clinician Dashboard → clinician reviews and can manually trigger the same Cimas alert.

Clinician can log into the dashboard anytime to see trend charts and case history for any patient.

Design/Ethical Constraint (important — bake this in from the start)

NeuroTrack is decision-support only. It never diagnoses Parkinson's or prescribes medication autonomously — it surfaces data and trends for a licensed clinician to act on. This should be reflected in the UI copy (e.g. dashboard should say "flagged for review," not "diagnosis") and is a stated requirement in Zimbabwe's National AI Strategy (2026–2030), which this project is explicitly built to align with, alongside NDS1 and NDS2's digital healthcare goals.

That's the whole picture — architecture, modules, stack, data flow, and the constraint that shapes the UI tone. Want me to also draft the specific first prompt to paste into Lovable to kick off the initial build (e.g. starting with the patient check-in flow first), or a rough database schema (table + field names) to hand to Django alongside this?

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8847bfad-5b50-4011-8abd-a2257fa18b25).

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
