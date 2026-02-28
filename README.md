# GanttFlow

<!-- Logo placeholder -->
<!-- <p align="center">
  <img src="public/logo.png" alt="GanttFlow Logo" width="120" />
</p> -->

<p align="center">
  <img alt="Build Status" src="https://img.shields.io/badge/build-passing-brightgreen" />
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb" />
</p>

<p align="center">
  A full-featured Gantt chart project management web application with hierarchical task planning, live drag-and-drop scheduling, version snapshots, and fully customizable workspace settings.
</p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Architecture Overview](#architecture-overview)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Gantt Chart

- Hierarchical three-level task tree: **Epic > Feature > Task**
- Live drag-and-drop bar repositioning constrained to the horizontal axis
- Live bar resizing with automatic date recalculation
- Timeline scale toggles: **Day, Week, Month, Quarter**
- Today marker with pulse animation
- Weekend column shading for at-a-glance week orientation
- Overdue bar glow effect when a task is past its planned end date
- DragOverlay floating preview rendered during active drag operations
- Jump-to-today button for instant timeline navigation
- Scroll synchronization between the task panel and the timeline viewport

### Task and Item Management

- Inline item name editing directly on the Gantt row
- Inline status dropdown per row, driven by workspace-configured statuses
- Inline percentage completion editor with click-to-edit behavior
- Delay badge displaying the number of days a task is behind schedule
- Left-edge progress accent bar and bottom mini progress bar per row
- Add Epic, Feature, and Task items via a guided dialog
- Expand and collapse Epic and Feature rows to control chart density

### Project Management

- Project grid view listing all workspace projects
- Create new projects with a name, color, and description
- Global search across all projects in the workspace
- Project archiving to remove completed work from the active view
- Collapsible sidebar with a favorites section and workspace navigation

### Version Control

- Save named project snapshots at any point in time
- Browse and restore any previously saved version through the version picker
- Snapshot data stored independently so the live project is never overwritten

### Workspace Settings

- Custom status configurations with user-defined hex colors and labels
- Mark statuses as "final" to prevent delayed-bar highlighting on completed work
- Configurable level names (rename Epic, Feature, Task to match your workflow)
- Default owner assignment applied to newly created items
- Dark and light theme toggle applied globally across the application

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | Zustand with immer middleware |
| Drag and Drop | @dnd-kit/core, @dnd-kit/sortable |
| Database | MongoDB via Mongoose |
| Date Utilities | date-fns |
| Runtime | Node.js 18+ |

---

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects/
│   │   │   │   ├── route.ts                  # GET /api/projects, POST /api/projects
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts              # GET, PATCH, DELETE /api/projects/[id]
│   │   │   │       └── versions/
│   │   │   │           ├── route.ts          # GET, POST /api/projects/[id]/versions
│   │   │   │           └── [versionId]/
│   │   │   │               └── route.ts      # GET /api/projects/[id]/versions/[versionId]
│   │   │   └── settings/
│   │   │       └── route.ts                  # GET, PATCH /api/settings
│   │   ├── projects/
│   │   │   ├── page.tsx                      # Project grid view
│   │   │   └── [id]/
│   │   │       └── page.tsx                  # Individual Gantt chart view
│   │   ├── settings/
│   │   │   └── page.tsx                      # Workspace settings view
│   │   └── layout.tsx                        # Root layout with ThemeProvider
│   ├── components/
│   │   ├── dialogs/
│   │   │   ├── AddItemDialog.tsx             # Add epic/feature/task dialog
│   │   │   ├── NewProjectDialog.tsx          # Create project dialog
│   │   │   └── SaveVersionDialog.tsx         # Save snapshot dialog
│   │   ├── gantt/
│   │   │   ├── GanttBoard.tsx               # DndContext, scroll sync, drag orchestration
│   │   │   ├── GanttBar.tsx                 # Individual draggable bar component
│   │   │   ├── GanttTimeline.tsx            # Date header, grid lines, today marker
│   │   │   └── GanttTaskPanel.tsx           # Left panel with row labels and controls
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                  # Collapsible sidebar navigation
│   │   │   └── TopNav.tsx                   # Scale toggles, version picker, controls
│   │   ├── providers/
│   │   │   └── ThemeProvider.tsx            # Applies dark/light class to html element
│   │   ├── settings/                        # Settings UI components (status, theme, etc.)
│   │   └── shared/
│   │       ├── OwnerAvatar.tsx              # Initials avatar with deterministic color
│   │       └── StatusBadge.tsx             # Color-coded status chip
│   ├── lib/
│   │   ├── mongodb.ts                       # Singleton Mongoose connection with global cache
│   │   ├── dateUtils.ts                     # Date math helpers (rollup, bar style, columns)
│   │   └── models/
│   │       ├── Project.ts                   # Mongoose schema: embedded Epic > Feature > Task
│   │       ├── ProjectSnapshot.ts           # Snapshot model with Mixed snapshotData field
│   │       └── WorkspaceSettings.ts         # Singleton settings model with default statuses
│   ├── store/
│   │   ├── useProjectStore.ts               # Zustand store: CRUD, drag, version, persist
│   │   └── useSettingsStore.ts              # Zustand store: fetch and persist settings
│   └── types/
│       └── index.ts                         # All TypeScript interfaces and type aliases
└── public/                                  # Static assets
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher (or yarn / pnpm)
- A running **MongoDB** instance (local or hosted, e.g., MongoDB Atlas)

### Installation

1. Clone the repository.

   ```bash
   git clone https://github.com/your-username/ganttflow.git
   cd ganttflow
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file by copying the example.

   ```bash
   cp .env.example .env.local
   ```

4. Populate the required environment variables in `.env.local`. See the [Environment Variables](#environment-variables) section below.

5. Start the development server.

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** If you encounter a missing Next.js binary after cloning on some systems, run:
> ```bash
> rm node_modules/.bin/next && ln -s ../next/dist/bin/next node_modules/.bin/next
> ```

---

## Environment Variables

Create a `.env.local` file in the project root. The following variables are required:

| Variable | Required | Description | Example |
|---|---|---|---|
| `MONGODB_URI` | Yes | Full MongoDB connection string | `mongodb://localhost:27017/ganttflow` |
| `NEXTAUTH_SECRET` | No | Secret used for session signing (if auth is added) | `supersecretvalue` |
| `NEXT_PUBLIC_APP_URL` | No | Public base URL of the application | `http://localhost:3000` |

**Example `.env.local`:**

```env
MONGODB_URI=mongodb://localhost:27017/ganttflow
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security:** Never commit `.env.local` or any file containing secrets to version control. The `.gitignore` generated by `create-next-app` already excludes `.env*.local` files.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Starts the Next.js development server with hot reload at port 3000 |
| Build | `npm run build` | Compiles and optimizes the application for production |
| Start | `npm run start` | Runs the production build (requires `npm run build` first) |
| Lint | `npm run lint` | Runs ESLint across all source files |
| Type Check | `npx tsc --noEmit` | Runs the TypeScript compiler without emitting files |

---

## API Reference

All routes are Next.js App Router API routes located under `src/app/api/`.

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | Return a list of all projects in the workspace |
| `POST` | `/api/projects` | Create a new project with name, color, and description |
| `GET` | `/api/projects/[id]` | Return a single project by ID including its full Epic > Feature > Task tree |
| `PATCH` | `/api/projects/[id]` | Update project fields or the task tree (used for all item mutations and drag events) |
| `DELETE` | `/api/projects/[id]` | Permanently delete a project and all its associated versions |

### Versions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/versions` | Return all saved snapshots for a project |
| `POST` | `/api/projects/[id]/versions` | Save a new named snapshot of the current project state |
| `GET` | `/api/projects/[id]/versions/[versionId]` | Return a single snapshot by ID for version restore |

### Settings

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings` | Return the singleton workspace settings document |
| `PATCH` | `/api/settings` | Update workspace settings (statuses, level names, theme, default owner) |

### Request and Response Format

All endpoints accept and return `application/json`. Successful responses use HTTP 200 or 201. Errors return a JSON object with a `message` field and an appropriate HTTP status code (400, 404, 500).

**Example: Create a project**

```
POST /api/projects
Content-Type: application/json

{
  "name": "Q3 Roadmap",
  "color": "#6366f1",
  "description": "Product roadmap for Q3 2026"
}
```

**Example: Save a version snapshot**

```
POST /api/projects/abc123/versions
Content-Type: application/json

{
  "name": "Before sprint planning"
}
```

---

## Architecture Overview

### State Management

GanttFlow uses two independent Zustand stores, both enhanced with the immer middleware for immutable state updates.

- **`useProjectStore`** manages the active project, the full Epic > Feature > Task tree, drag state, and version history. Every mutation (add, update, delete, drag end) automatically triggers date rollup (tasks roll up to Features, Features roll up to Epics) and then persists the updated project to the database via `PATCH /api/projects/[id]`.

- **`useSettingsStore`** manages workspace-level configuration: custom status definitions, level names, default owner, and the active theme. Settings are fetched once on mount via `ThemeProvider` and persisted on every change via `PATCH /api/settings`.

### Data Flow

```
User interaction (drag, edit, status change)
        |
        v
Zustand store action (useProjectStore)
        |
        v
immer draft mutation + date rollup (dateUtils.ts)
        |
        v
PATCH /api/projects/[id]  --->  MongoDB (Mongoose)
```

### Timeline Rendering and Drag Math

The Gantt timeline converts dates to pixel positions using a `pxPerDay` constant that varies by scale:

| Scale | pxPerDay |
|---|---|
| Day | 40 |
| Week | 28 |
| Month | 10 |
| Quarter | 4 |

When a drag ends, the horizontal pixel delta from `@dnd-kit` is divided by `pxPerDay` to produce `deltaDays`. That integer is added to the item's `plannedStart` and `plannedEnd` dates using `date-fns/addDays`. Dragging an Epic shifts all descendant Features and Tasks by the same delta. Dragging a Feature shifts all its Tasks.

### Database Schema

MongoDB stores projects as a single document containing the full embedded tree. Snapshots are stored as separate documents in a `projectsnapshots` collection, with `snapshotData` typed as Mongoose `Mixed` to allow arbitrary project state capture. Workspace settings are stored as a singleton document in a `workspacesettings` collection.

---

## Screenshots

> Screenshots will be added here once the application is deployed. Replace the placeholders below with actual image paths or URLs.

**Project Grid View**

![Project grid showing all workspace projects](docs/screenshots/project-grid.png)

**Gantt Chart View**

![Gantt chart with Epic, Feature, and Task rows and draggable bars](docs/screenshots/gantt-chart.png)

**Workspace Settings**

![Settings page showing custom status configuration and theme toggle](docs/screenshots/settings.png)

---

## Contributing

Contributions are welcome. Please follow these steps to submit a change.

1. Fork the repository and create a branch from `main`.

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes. Follow the existing code style (TypeScript strict mode, Tailwind utility classes, shadcn/ui components where applicable).

3. Run the build and linter to verify your changes do not break existing functionality.

   ```bash
   npm run build
   npm run lint
   npx tsc --noEmit
   ```

4. Write or update tests if applicable.

5. Commit your changes with a clear, descriptive message following the [Conventional Commits](https://www.conventionalcommits.org/) format.

   ```bash
   git commit -m "feat: add resource allocation view to Gantt chart"
   ```

6. Push your branch and open a pull request against `main`. Include a description of what changed and why.

### Code Style Guidelines

- All new components must be written in TypeScript with explicit prop types.
- Avoid inline styles. Use Tailwind utility classes or the `cn()` helper from shadcn/ui.
- State mutations must go through the Zustand store — do not mutate component state as a workaround.
- All new API routes must handle errors gracefully and return consistent JSON error objects.
- Date arithmetic must use `date-fns` functions from `src/lib/dateUtils.ts`, not native Date manipulation.

### Reporting Issues

Open an issue on GitHub with a clear title, a description of the problem, steps to reproduce, and the expected versus actual behavior. Include your Node.js version and operating system.

---

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2026 GanttFlow Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
