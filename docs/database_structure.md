# Database Structure & MongoDB Atlas Schemas

This document defines the data models, relationship constraints, indexing strategies, and concurrency mechanisms implemented in MongoDB Atlas for the **AI Event Recommendation System**.

---

## 1. Entity-Relationship Overview

```text
┌────────────────────────┐                   ┌────────────────────────┐
│      User Schema       │                   │      Event Schema      │
├────────────────────────┤                   ├────────────────────────┤
│ _id (ObjectId)         │ 1               * │ _id (ObjectId)         │
│ name (String)          ├────────┐ ┌────────┤ name (String)          │
│ email (String, Unique) │        │ │        │ category (String)      │
│ passwordHash (String)  │        │ │        │ date (String)          │
│ role (user | admin)    │        ▼ ▼        │ time (String)          │
│ createdAt (Date)       │     ┌─────────┐   │ location (String)      │
└────────────────────────┘     │ Regist- │   │ venue (String)         │
                               │ ration  │   │ price (Number)         │
                               └─────────┘   │ seats (Number)         │
                                             │ deadline (Date)        │
                                             │ description (String)   │
                                             │ imageUrl (String)      │
                                             │ popularity (Number)    │
                                             │ createdAt (Date)       │
                                             └────────────────────────┘
```

---

## 2. Collections & Field Specifications

### A. Users Collection (`users`)

Stores registered students and administrators. Plaintext passwords are never stored.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Unique MongoDB document identifier |
| `name` | `String` | Required, Trim, Max: 100 | Full name of the user |
| `email` | `String` | Required, Unique, Lowercase, Regex match | User email used for authentication |
| `passwordHash`| `String` | Required | Salted bcrypt password hash |
| `role` | `String` | Enum: `['user', 'admin']`, Default: `'user'` | Role-based authorization identifier |
| `createdAt` | `Date` | Default: `Date.now` | Account registration timestamp |
| `updatedAt` | `Date` | Managed by Mongoose | Account modification timestamp |

#### Indexes:
- `{ email: 1 }` (Unique): Guarantees no two users register with the same email address.

---

### B. Events Collection (`events`)

Stores all campus events managed by administrators.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Unique event document identifier |
| `name` | `String` | Required, Trim | Title of the event |
| `category` | `String` | Required, Trim | Event category (e.g. Workshop, Cricket, Music) |
| `date` | `String` | Required | Event date (e.g. `2026-10-20` or formatted date) |
| `time` | `String` | Required, Trim | Event scheduled timing (e.g. `10:00 AM - 04:00 PM`) |
| `location` | `String` | Required, Trim | City or campus location (e.g. Chennai) |
| `venue` | `String` | Required, Trim | Specific hall or ground (e.g. Tech Auditorium) |
| `price` | `Number` | Required, Min: 0, Default: 0 | Admission price in INR (`0` for free events) |
| `seats` | `Number` | Required, Min: 0, Default: 50 | Remaining available seat capacity |
| `registrationDeadline` | `Date` | Required | Timestamp after which registrations are blocked |
| `description` | `String` | Required, Trim | Detailed event agenda and prerequisites |
| `imageUrl` | `String` | Default: modern stock banner | URL pointing to the promotional cover image |
| `popularity` | `Number` | Min: 0, Max: 100, Default: 50 | Dynamic score incremented on registration |
| `createdAt` | `Date` | Default: `Date.now` | Creation timestamp |

#### Queries & Filtering Indexes:
- `{ registrationDeadline: 1, seats: 1 }`: Optimizes active event queries where `registrationDeadline > now` and `seats > 0`.
- `{ category: 1 }`: Fast category indexing for exact match checks.

---

### C. Registrations Collection (`registrations`)

Stores confirmed bookings made by users for specific events.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key | Unique registration record identifier |
| `user` | `ObjectId` | Ref: `User`, Required | Reference to the registered user account |
| `event` | `ObjectId` | Ref: `Event`, Required | Reference to the registered campus event |
| `name` | `String` | Required, Trim | Contact attendee name |
| `email` | `String` | Required, Lowercase, Trim | Contact attendee email address |
| `phone` | `String` | Required, Min: 7 | Contact attendee phone number |
| `status` | `String` | Enum: `['confirmed', 'cancelled']`, Default: `'confirmed'` | Booking state |
| `registeredAt`| `Date` | Default: `Date.now` | Timestamp of registration |

#### Unique Compound Index:
```javascript
registrationSchema.index({ user: 1, event: 1 }, { unique: true });
```
- **Constraint Enforcement**: Strictly prevents a single user from registering for the same event multiple times.

---

## 3. Concurrency & Atomicity (Seat Management)

When a student registers, the system prevents race conditions and overbooking using atomic query-and-update:

```javascript
const updatedEvent = await Event.findOneAndUpdate(
  {
    _id: eventId,
    seats: { $gt: 0 },
    registrationDeadline: { $gt: new Date() }
  },
  {
    $inc: { seats: -1, popularity: 2 }
  },
  { new: true }
);
```

- If `seats <= 0` or `registrationDeadline <= now`, the atomic operation matches `0` documents and returns `null`.
- Registration is immediately aborted with HTTP 400 (`"Event is full."` or `"Registration deadline has passed."`).
- No negative seat counts can ever occur.
