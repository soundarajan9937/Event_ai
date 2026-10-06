# AI Event Recommendation System — Project Architecture & Flow

This document details the complete end-to-end operational workflow, architectural sequence, and decision pathways of the **AI Event Recommendation System**.

---

## 1. High-Level System Architecture

The application is architected as a decoupled, multi-tier system:

```text
┌────────────────────────────────────────────────────────┐
│                   React.js Frontend                    │
│             (Vite, Modern Vanilla CSS, SPA)            │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       HTTP / REST (JSON)        HTTP / REST (JSON)
                │                        │
┌───────────────▼────────────────────────▼───────────────┐
│               Node.js & Express.js Backend             │
│  - Authentication (JWT & bcrypt)                       │
│  - Event & Registration Management                     │
│  - Deadline & Capacity Enforcement                     │
│  - Category Taxonomy & ML Orchestration                │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
     Mongoose ORM Connection     Internal HTTP Call
                │                        │
┌───────────────▼───────────────┐ ┌──────▼───────────────┐
│      MongoDB Atlas Cloud      │ │  Python Flask ML     │
│  - Users Collection           │ │  - Logistic Reg.     │
│  - Events Collection          │ │  - ColumnTransformer │
│  - Registrations Collection   │ │  - Joblib Pipeline   │
└───────────────────────────────┘ └──────────────────────┘
```

---

## 2. Administrator Workflow

```text
[Administrator]
       │
       ▼
1. Login with Admin Credentials (/login)
       │
       ▼
2. Backend verifies bcrypt hash & issues JWT with role: "admin"
       │
       ▼
3. Access Admin Dashboard (/admin)
       │
       ├─► View Real-time Platform Overview (Total Events, Active Events, Registrations)
       ├─► Add Real Event (Name, Category, Date, Time, Location, Venue, Price, Seats, Deadline, Description, Image URL)
       ├─► Edit Active/Past Event Information
       ├─► Delete Event (cascades deletion of registrations)
       └─► Audit Registrations (Student Name, Email, Phone, Event, Status, Timestamp)
```

---

## 3. User Discovery & Recommendation Workflow

```text
[Student / User]
       │
       ▼
1. User Registration / Login
       │  (Bcrypt password hashing, default role: "user")
       ▼
2. Browse Active Events (/events)
       │  (Filter by Category, Location, or Keyword)
       │  * Backend query automatically filters: registrationDeadline > now AND seats > 0
       ▼
3. Request AI Recommendations (/recommendations)
       │  User submits: [user_interest, location, budget, event_category]
       ▼
4. Backend Processes Request:
       │
       ├─► Queries active MongoDB events (registrationDeadline > now, seats > 0)
       │
       ├─► Checks for EXACT category matches:
       │     │
       │     ├─► [EXACT CATEGORY AVAILABLE]:
       │     │     Candidates = Active MongoDB events matching requested category
       │     │     exact_match = true
       │     │
       │     └─► [EXACT CATEGORY UNAVAILABLE] (Section 14 Logic):
       │           exact_match = false
       │           message = "No [Category] events are currently available."
       │           Identifies related categories using domain taxonomy:
       │             - Technology: Workshop <-> Tech Talk, Hackathon, Coding Contest, Seminar
       │             - Sports: Kabaddi <-> Cricket, Football, Athletics, Badminton
       │             - Cultural: Music <-> Dance, Theatre, Concert, Art Exhibition
       │             - Business: Startup Pitch <-> Networking, Career Fair, Summit
       │           Candidates = Active MongoDB events in related categories
       │           * Events strictly retain their actual names and categories (NEVER renamed)
       │
       ▼
5. Backend calls Flask ML Service (POST /recommend):
       │  Transfers user preferences + candidate active events
       ▼
6. Flask ML Service:
       │  Preprocesses via ColumnTransformer:
       │    - OneHotEncoder on categorical features: user_interest, location, event_category
       │    - StandardScaler on numerical features: budget, event_price, event_popularity
       │  Calculates match probabilities using Logistic Regression pipeline
       │  Assigns normalized match_score (e.g. 91.5%)
       │  Ranks candidate events descending by score
       ▼
7. Frontend displays recommendations:
       ├─ If exact category unavailable, renders notice banner:
       │  "No [Category] events are currently available. Showing related active events:"
       └─ Ranks events with match score badges (e.g. 91.5% Match)
```

---

## 4. Event Registration & Seat Management Workflow

```text
[User clicks "Register for Event" on /events/:id]
       │
       ▼
1. Frontend checks authentication:
       If guest: prompt redirect to /login
       If authenticated: display registration confirmation modal
       │
       ▼
2. User submits registration details (Name, Email, Phone)
       │
       ▼
3. Backend performs multi-point validation:
       ├─ Verify Event exists
       ├─ Verify Deadline: current time < registrationDeadline (Reject with 400 if passed)
       ├─ Verify Seat Availability: seats > 0 (Reject with 400 "Event is full." if <= 0)
       └─ Verify Duplicate Registration: check (user_id, event_id) (Reject with 400 if already registered)
       │
       ▼
4. Atomic Database Update:
       Event.findOneAndUpdate(
         { _id: eventId, seats: { $gt: 0 }, registrationDeadline: { $gt: now } },
         { $inc: { seats: -1, popularity: 2 } }
       )
       │
       ▼
5. Store Registration in MongoDB Atlas:
       New Registration document created with status: "confirmed"
       │
       ▼
6. Response & UI Update:
       - Remaining seats updated live on event page
       - Registration appears immediately in User's "My Events" page
       - Registration appears immediately in Administrator's dashboard
```

---

## 5. Machine Learning Pipeline Architecture

- **Training Phase (`train_model.py`)**:
  1. Expects dataset file: `ml_service/data/event_recommendation_20000.csv`.
  2. Validates presence of exact 6 columns:
     - `user_interest`
     - `location`
     - `budget`
     - `event_category`
     - `event_price`
     - `event_popularity`
  3. Prepares training instances using balanced negative sampling (pairing user attributes with shuffled/mismatched event properties).
  4. Builds Sklearn `Pipeline`:
     - `ColumnTransformer` (OneHotEncoder for categorical, StandardScaler for numerical)
     - `LogisticRegression(max_iter=1000)`
  5. Serializes trained pipeline to `ml_service/model/recommendation_model.joblib`.

- **Inference Phase (`app.py`)**:
  - Model loaded once at startup.
  - Suitable for restricted 512 MB RAM environments.
  - Takes candidate active events provided by backend + user preferences.
  - Returns ranked list of `{ event_id, match_score }`.
