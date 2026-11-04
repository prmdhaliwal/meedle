# Meedle

I built Meedle with my team during Monash University's Software Engineering Process and Management unit in 2025. We used JavaScript, Express, MongoDB, Mongoose, EJS and Bootstrap to create a learning management system for courses, classes, lessons and student learning activity.

## Application Scope

- Student and instructor workflows, account registration and login.
- Course enrolment, class membership and lesson navigation.
- Lesson scheduling and availability windows.
- Assignments, submissions and marking interfaces.
- Student progress and reporting views.

We developed these workflows across our project iterations. Database-backed features require a configured MongoDB instance.

## My Contribution

I contributed under the Git identities `prmdhaliwal` and `pdha0007`.

- I developed student enrolment, class/course navigation and reporting workflows across Express routes, Mongoose models and EJS views.
- I implemented lesson availability fields, scheduling controls and validation, then refined routing and error handling.
- I added an instructor course overview and integrated changes across our feature branches.

I worked alongside the rest of Friday 4pm Team 3, whose contributions remain credited in the repository.

## Run Locally

Prerequisites: Node.js with npm and access to a MongoDB instance you control. Use a disposable local database and invented demonstration accounts only.

```powershell
git clone https://github.com/prmdhaliwal/meedle.git
cd meedle
npm ci
$env:MONGO_URI = "mongodb://127.0.0.1:27017/fit2101_lms"
$env:PORT = "8080"
npm start
```

Start your local MongoDB service before using database-backed features. Open `http://127.0.0.1:8080`. The server binds to loopback by default; `PORT`, `HOST` and `MONGO_URI` can be supplied through the environment. A `.env` file is not loaded automatically.

New registrations are students by default. To explore instructor views, configure a disposable user in your own demonstration database with `isAdmin: true` and `role: "teacher"`. Do not use the original shared coursework database or real credentials.

## Checks

```powershell
npm test
```

I use these checks to verify local startup defaults, environment configuration and cross-platform import casing. They do not contact MongoDB or cover complete enrolment, marking or authentication workflows.

## Security Notes

The current authentication implementation stores passwords without hashing and keeps the current user in process-global state. Before using Meedle with real accounts, I would replace these with password hashing and isolated sessions, and review authorisation. For local demonstrations, I use disposable data and passwords that are not used elsewhere.
