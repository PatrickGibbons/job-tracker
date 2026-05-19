# Job Tracker

A personal job application tracking app built with Next.js. Track applications, interviews, contacts, documents, and notes in one place — all stored locally in SQLite.

## Features

- **Applications board** — Kanban-style pipeline with drag-and-drop (wishlist → applied → interview → offer → accepted/rejected)
- **Auto-fill from URL** — paste a job posting URL when creating an application to automatically extract the title, company, location, remote type, and salary
- **Notes** — per-application markdown notes
- **Interviews** — schedule and track interview rounds with outcome
- **Files** — upload and view resumes, cover letters, etc. inline in the browser
- **Google Docs** — create new Google Docs linked to an application, or link existing ones by URL; preview inline; rename and delete/unlink
- **Contacts** — maintain a contact book and link contacts to applications
- **Tags** — colour-coded labels across applications
- **Activity log** — full audit trail of every change
- **Dashboard** — weekly applications chart and pipeline summary
- **Dark mode**

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM + drizzle-kit |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| AI (optional) | Anthropic Claude Haiku (job scraping fallback) |
| Google integration | Google Drive REST API v3 (OAuth 2.0) |

## Prerequisites

- Node.js 20+
- npm
- A Google account (for Google Docs integration — optional)
- An Anthropic API key (for job URL auto-fill — optional)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

Create `.env.local` in the project root:

```env
# Optional — enables AI-powered job info extraction when a URL is pasted
ANTHROPIC_API_KEY=your_anthropic_api_key

# Required only for Google Docs integration — see section below
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

### 3. Initialise the database

```bash
npx drizzle-kit push
```

This creates `data/app.db` (SQLite).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Google Docs Integration (Optional)

The app can create Google Docs linked to applications and store them in your Google Drive. Setup takes about 10 minutes.

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project.
2. Enable the **Google Drive API**: APIs & Services → Library → search "Google Drive API" → Enable.

### Step 2 — Create OAuth 2.0 credentials

1. Go to APIs & Services → Credentials → **Create Credentials** → OAuth client ID.
2. Application type: **Web application**.
3. Under **Authorised redirect URIs** add: `http://localhost:9999`
4. Download or note the **Client ID** and **Client Secret** — these go into `.env.local` as `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.

### Step 3 — Configure the OAuth consent screen

1. Go to APIs & Services → OAuth consent screen.
2. Set User type to **External** and fill in the required fields.
3. Under **Test users**, add your Google account email.
4. You do not need to publish the app — test mode is fine for personal use.

### Step 4 — Get a refresh token

With `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` set in your environment, run:

```powershell
# PowerShell
$env:GOOGLE_OAUTH_CLIENT_ID="your_client_id"
$env:GOOGLE_OAUTH_CLIENT_SECRET="your_client_secret"
node scripts/get-google-token.mjs
```

```bash
# bash / cmd
set GOOGLE_OAUTH_CLIENT_ID=your_client_id
set GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
node scripts/get-google-token.mjs
```

The script prints an auth URL. Open it in a browser, authorise the app, and the script will print:

```
GOOGLE_OAUTH_REFRESH_TOKEN=1//0gxxxxxx...
```

Add that value to `.env.local`.

### Step 5 — Create a Drive folder

1. Go to [drive.google.com](https://drive.google.com) and create a folder (e.g. `Job Tracker Docs`).
2. Open the folder — the URL will look like `https://drive.google.com/drive/folders/1zMDbeJf...`
3. Copy the ID at the end and add it to `.env.local` as `GOOGLE_DRIVE_FOLDER_ID`.

### Step 6 — Restart the dev server

```bash
npm run dev
```

You should now be able to create and link Google Docs from any application's **Documents** tab.

---

## Database management

```bash
# Apply schema changes
npx drizzle-kit push

# Apply schema changes and skip interactive confirmation (for CI / scripting)
npx drizzle-kit push --force

# Open Drizzle Studio (visual DB browser)
npx drizzle-kit studio
```

## Project structure

```
src/
  app/
    api/           # API route handlers
    applications/  # Application list + detail pages
    dashboard/     # Dashboard page
    contacts/      # Contacts page
  components/      # Shared UI components
  db/              # Drizzle schema and client
  lib/             # Utilities (activity logger, validations, Google Drive, scraping)
scripts/
  get-google-token.mjs   # One-time OAuth refresh token helper
data/              # SQLite database (git-ignored)
uploads/           # Uploaded files (git-ignored)
```
