# BANSAY

BANSAY (Building Adaptive Non-Specialist Support and Assessment for Youth
educators) is a low-bandwidth coaching workspace for secondary-school
teachers assigned outside their college specialty. It supports lesson
preparation, AI student rehearsal, mentor feedback, and CPD evidence tracking.

## Run locally

Prerequisites: Node.js 20+ and a Gemini API key.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.
3. Start the development server with `npm run dev`.
4. Open `http://localhost:3000`.

Use `npm run build` to create a production build and `npm run lint` to type
check the project.

## Project structure

```
.
├── public/
│   └── assets/aistudio/       # Reference material supplied with the project
├── src/
│   ├── components/            # Dashboard shell and feature views
│   │   ├── LessonPrepStudio   # Lesson setup and generated support
│   │   ├── RehearsalReview    # Simulated student and mentor feedback flow
│   │   ├── CpdPortfolio       # Competency and classroom-evidence portfolio
│   │   └── CohortOversight    # Mentor/coordinator cohort view
│   ├── data/bansayData.ts     # Seed cases, localized copy, and demo data
│   ├── types/bansay.ts        # Shared domain types
│   ├── App.tsx                # Application state and view composition
│   ├── index.css              # Global styles and Tailwind imports
│   └── main.tsx               # React entry point
├── server.ts                  # Express API and Gemini-powered endpoints
├── index.html                 # Vite HTML shell
├── vite.config.ts             # Vite, React, and Tailwind configuration
├── package.json               # Scripts and dependencies
└── .env.example               # Required environment-variable template
```

## API endpoints

The Express server exposes three Gemini-backed endpoints:

- `POST /api/bansay/generate-support` creates specialty bridges, misconception
  alerts, activities, and rehearsal prompts.
- `POST /api/bansay/rehearse` responds as a simulated student.
- `POST /api/bansay/mentor-assist` drafts focused mentor feedback.

The browser stores working cases, library saves, evidence records, and
low-data-mode preference in local storage. Demo content is defined in
`src/data/bansayData.ts`.
