# 🤖 PishCup RoboCup Judging System

<p align="center">
  <b>Score entry, automatic calculation, live leaderboard, and Excel export — for the Junior, Advance Junior, and Senior leagues</b>
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%E2%89%A518-3c873a?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-local--db-07405e?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey">
</p>

A local-first app (no internet needed after setup) for PishCup competition judges to quickly record each team's score every round, following the official judging sheets for the **Junior**, **Advance Junior**, and **Senior** leagues. The score entry form mirrors the exact layout and color-coding of the printed judging sheets, so judges see something familiar rather than a generic form.

---

## Table of Contents

- [Features](#features)
- [Preview](#preview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup (first time only)](#setup-first-time-only)
- [Running it afterwards](#running-it-afterwards)
- [API Reference](#api-reference)
- [Scoring Rules](#scoring-rules)
- [Notes](#notes)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 📋 **Score form styled after the official judging sheets** — column order (`Total | Details | Points | Item`) and per-section colors (Robot Performance, Robot Technical, Penalties, Group Points) match the printed competition sheets exactly.
- 🧮 **Live, automatic scoring** for every item, section, and final total as the judge checks boxes.
- 👥 **Team management** per league (add / remove).
- 🗂 **Score history** with the ability to delete a mistaken entry.
- 🏆 **Live leaderboard** based on each team's best round.
- 📤 **Excel export** with all scores and the leaderboard, filterable by league or across all leagues.
- 🔌 **Fully local-first** — data lives in a single SQLite file, and no internet connection is needed after the initial `npm install`.
- 🌐 RTL, Persian-language UI, set in the Vazirmatn typeface.

## Project Structure

```
PishCup-ScS-App/
  server/              -> Node.js + Express + SQLite (local database and API)
    index.js            - API route definitions
    db.js                - SQLite connection and table setup
    scoringConfig.js     - Scoring rules per league (source of truth for calculations)
  client/              -> React + Vite (user interface)
    src/App.jsx          - Tabs: Teams / Score Entry / History / Leaderboard / Excel Export
    src/ScoreForm.jsx     - Score entry form styled after the judging sheets
    src/index.css         - Styling and color palette
```

## Prerequisites

Node.js version 18 or later must be installed ([download from nodejs.org](https://nodejs.org)).

## Setup (first time only)

### 1. Server (backend + database)

```bash
cd server
npm install
npm start
```

The server runs at `http://localhost:4000`. The database file is created automatically at `server/scores.db` (SQLite).

### 2. Client (user interface)

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Running it afterwards

Every time you want to run the app, only these two commands are needed (no need to `npm install` again):

```bash
# terminal 1
cd server && npm start

# terminal 2
cd client && npm run dev
```

## API Reference

The server exposes a simple REST API at `http://localhost:4000/api`:

| Method | Route | Description |
|---|---|---|
| GET | `/api/config` | Returns the full scoring rule definition for all three leagues |
| GET | `/api/teams?league=` | List teams (optional: filter by league) |
| POST | `/api/teams` | Add a new team `{ name, league }` |
| DELETE | `/api/teams/:id` | Delete a team and its scores |
| GET | `/api/scores?team_id=&league=` | List recorded score entries |
| POST | `/api/scores` | Record a round's score `{ team_id, league, round_number, values, judge_name }` |
| PUT | `/api/scores/:id` | Edit a score entry |
| DELETE | `/api/scores/:id` | Delete a score entry |
| GET | `/api/leaderboard?league=` | Leaderboard based on each team's best round |
| GET | `/api/export?league=` | Download an Excel file with scores and the leaderboard |

## Scoring Rules

All rules live in `server/scoringConfig.js`, and editing it automatically updates both the score entry form and the server-side calculations:

- For items with multiple options/numbers (e.g. "crossing each tile", 1 through 24), score = (item's base points) × (number of options checked).
- Simple items (e.g. "robot powers on") are plain checkboxes: checked = full points.
- The "crossing the obstacle" item is a choice between three states (did not cross / crossed with collision / crossed without collision).
- "Creativity", "workspace cleanliness", and "team conduct & cooperation" are adjustable numbers from zero up to the item's max, so the judge can award partial credit.

If any of these assumptions differ from your competition's actual rules, just edit `scoringConfig.js` or open an Issue.

## Notes

- **Where is the data stored?** Everything lives in the `server/scores.db` file. To back it up, just copy that one file.
- **Does it work offline?** Yes — after the initial setup (`npm install`), the whole app runs locally (on localhost) with no internet connection required.
- **Multiple judges at once?** If all judges work on one laptop, that's fine. To connect multiple devices over a local network, run the server bound to your local IP (not just `localhost`), or open an Issue and this can be added.
- **Changing the scoring rules:** All rules are in `server/scoringConfig.js`.

## Contributing

Issues and pull requests are welcome. For larger changes (like adding a new league or changing the database structure), please open an Issue first so we can agree on an approach.

## License

This project is released under the [MIT License](LICENSE) — use, modify, and distribute freely.
