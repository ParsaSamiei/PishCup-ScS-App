<div align="center">

# 🏆 PishCup-ScS-App

### Scoring & Standings System for PishCup

**Built for [PishCup](https://github.com/ParsaSamiei), the RoboCup-style robotics competition hosted by Pishanam Robotics Academy**

[![Made with React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Made with Node](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20%2B%20Nginx-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🤖 About PishCup

**PishCup** is a RoboCup-style robotics competition organized by **Pishnam Robotics Academy**, spanning three leagues:

<div align="center">

| 🟢 Junior | 🟡 Advanced Junior | 🔴 Senior |
| :-------: | :----------------: | :-------: |

</div>

**PishCup-ScS-App** ("ScS" = Scoring System) is the official judging platform for the event — replacing paper scoresheets with a fast, accurate, and judge-friendly digital workflow, from the first round to the final standings.

---

## ✨ Features

- 🧾 **League-specific scoring forms** — laid out to match the official printed judging sheets, pixel for pixel
- 🕋 **Native RTL Persian UI** — built with the Vazirmatn font for a natural experience for Persian-speaking judges
- 🧮 **Automatic, rule-driven scoring**
  - Multi-option items (e.g. _tiles crossed_, 1–24 options) → base score × options checked
  - Simple checkbox items → full score on check
  - Multi-state items (e.g. obstacle crossing → _not attempted / with collision / clean pass_)
  - Free-scale qualitative items (creativity, workspace tidiness, teamwork/ethics) → partial scoring 0 → max
- 📈 **Live standings** — ranked automatically by each team's best round
- 📊 **One-click Excel export** — a separate sheet per league, ready to print or archive
- ⏱️ **Custom RTL time-input widget** — faster, error-resistant time entry for judges under pressure
- 🔌 **Offline-first** — runs entirely on a local laptop with zero internet dependency on competition day
- ☁️ **Cloud-ready** — same codebase deploys to a self-hosted server or a serverless cloud stack

---

## 🧱 Architecture

<div align="center">

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   client (React)     │  ───▶  │   server (Express)    │  ───▶  │   PostgreSQL     │
│   Vite · RTL UI       │        │   Scoring engine      │        │   (Neon / Docker)│
└─────────────────────┘        └──────────────────────┘        └─────────────────┘
```

</div>

| Layer                 | Technology                                             |
| --------------------- | ------------------------------------------------------ |
| 🎨 Frontend           | React + Vite                                           |
| ⚙️ Backend            | Node.js + Express                                      |
| 🗄️ Database           | PostgreSQL _(migrated from an earlier SQLite version)_ |
| 📤 Excel export       | SheetJS (`xlsx`)                                       |
| ☁️ Cloud deploy       | Vercel (serverless) + Neon (managed Postgres)          |
| 🐳 Self-hosted deploy | Docker + Docker Compose + Nginx                        |
| 🔁 CI/CD              | GitHub Actions → GitHub Container Registry (GHCR)      |

### Repository Structure

```
PishCup-ScS-App/
├── client/   🎨 React + Vite frontend — judging UI, standings, exports
└── server/   ⚙️ Node.js + Express API — scoring logic, PostgreSQL access
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js **18+**
- A PostgreSQL instance (local, or managed like Neon)

### 1️⃣ Configure the database

Create `server/.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/pishcup
PORT=4000
```

### 2️⃣ Start the backend

```bash
cd server
npm install
npm start
```

➡️ API live at `http://localhost:4000`

### 3️⃣ Start the frontend

```bash
cd client
npm install
npm run dev
```

➡️ Open `http://localhost:5173` — the dev server proxies API calls to the backend.

---

## 🐳 Deployment

### Option A — Self-hosted (Docker + Nginx)

```bash
docker compose up -d --build
```

| Service  | Role                                       |
| -------- | ------------------------------------------ |
| `client` | Production build served behind Nginx       |
| `server` | Express API on the internal Docker network |
| `nginx`  | Reverse proxy / HTTP(S) termination        |

**CI/CD pipeline:** every push to `main` triggers a GitHub Actions workflow that builds Docker images and publishes them to **GHCR**. The server pulls the new images and restarts the stack — zero manual steps.

### Option B — Serverless (Vercel + Neon)

Set in your Vercel project:

```env
DATABASE_URL=<Neon connection string>
```

> ⚠️ `vercel.json` must use the modern config format (`rewrites`, or `builds`/`routes`) for API routes to resolve correctly.

---

## 📐 Scoring Rules

All rules live in **`server/scoringConfig.js`** — one source of truth shared by both the form UI and the scoring engine.

| Item type                                  | Rule                                        |
| ------------------------------------------ | ------------------------------------------- |
| Multi-option                               | score = base value × options checked        |
| Simple checkbox                            | full score when checked                     |
| Obstacle crossing                          | not attempted / with collision / clean pass |
| Qualitative (creativity, tidiness, ethics) | free value, `0` → item max                  |

---

## 📊 Excel Export

Generate a full results workbook on demand — one sheet per league (🟢 Junior, 🟡 Advanced Junior, 🔴 Senior), each with standings and a round-by-round score breakdown per team.

---

## 💾 Backups

| Setup         | How to back up          |
| ------------- | ----------------------- |
| PostgreSQL    | `pg_dump`               |
| Legacy SQLite | Copy `server/scores.db` |

---

## 🤝 Contributing

Built and maintained for **PishCup**, by **Pishanam Robotics Academy**. Found a bug or have an idea? Open an issue — contributions are welcome.

## 📄 License

This project is licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for details.

---

<div align="center">

Made with 🤖 for **PishCup** · Pishnam Robotics Academy

</div>
