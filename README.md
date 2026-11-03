# PulseAPI — Production API Monitoring & Incident Dashboard

PulseAPI is an enterprise-grade, internship-ready API Monitoring, Uptime Tracking, and Incident Management Dashboard built with **Node.js, Express, MySQL 8, React, Vite, and Tailwind CSS**.

It periodically monitors HTTP/REST endpoints with **node-cron**, detects downtime, automatically opens and resolves incidents, records latency time-series, safeguards your infrastructure against **SSRF attacks**, and renders public, customer-facing status pages.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       React 18 + Vite Frontend        |
                      |   (Tailwind CSS + Recharts Dashboard) |
                      +---------------------------------------+
                                          |
                                HTTP / REST (JWT)
                                          v
                      +---------------------------------------+
                      |         Node.js + Express API         |
                      |  (Helmet, Rate-Limiting, SSRF Guard)  |
                      +---------------------------------------+
                             |                         |
               node-cron ping worker           mysql2 Connection Pool
                             |                         |
                             v                         v
                   +-------------------+     +-------------------+
                   | Monitored Targets |     |  MySQL 8 Database |
                   | (SSRF Validated)  |     |  (InnoDB Tables)  |
                   +-------------------+     +-------------------+
```

---

## Key Features

1. **JWT Authentication & Access Control**: Secure registration, login, bcrypt password hashing, and token verification middleware.
2. **Scheduled Automated Monitoring**: Background `node-cron` daemon evaluates due endpoints, checks response status, measures round-trip latency, and logs metrics.
3. **SSRF Guard Protection**: Deep inspection blocking `localhost`, `127.0.0.1`, RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Cloud metadata endpoints (`169.254.169.254`), IPv6 unique local/link-local, non-HTTP protocols, and unsafe redirects.
4. **Automated Incident Lifecycle**: Detects outages upon failure, tracks incident duration, and automatically resolves incidents when service recovers.
5. **Interactive Telemetry Dashboard**: Real-time stats (online count, offline count, rolling uptime %, mean latency), Recharts response time area graphs, and live incident alerts.
6. **Detailed Monitor Analytics**: Deep dive with 24h/7d/30d uptime percentages, 50-point latency chart, comprehensive check history, and instant on-demand "Check Now" health triggers.
7. **Branded Public Status Pages**: Publish customizable, unauthenticated status pages (`/status/:slug`) with overall system health indicators and 7-day incident summaries.

---

## Directory Structure

```
pulseapi/
├── backend/
│   ├── database/
│   │   ├── schema.sql              # Production MySQL 8 database schema
│   │   └── seed.js                 # Automatic DB initialization & demo seeder
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # mysql2/promise connection pool
│   │   ├── controllers/
│   │   │   ├── authController.js   # User registration, login, profile
│   │   │   ├── dashboardController.js # Aggregated metrics & telemetry
│   │   │   ├── incidentController.js  # Incident management & tracking
│   │   │   ├── monitorController.js   # Monitor CRUD & manual check triggers
│   │   │   └── statusPageController.js# Public & private status pages
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT authentication & admin verification
│   │   │   ├── errorHandler.js     # Centralized error handler & 404
│   │   │   └── rateLimiter.js      # Endpoint & auth abuse protection
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── incidentRoutes.js
│   │   │   ├── monitorRoutes.js
│   │   │   └── statusPageRoutes.js
│   │   ├── services/
│   │   │   ├── cronService.js      # node-cron scheduled monitoring engine
│   │   │   ├── incidentService.js  # Outage state machine & duration calculation
│   │   │   └── monitorService.js   # Axios HTTP executor with timer & SSRF check
│   │   ├── utils/
│   │   │   ├── ssrfValidator.js    # RFC 1918 / Cloud metadata IP validator
│   │   │   └── validator.js        # Input sanitization and format validators
│   │   ├── app.js                  # Express application setup & middleware
│   │   └── server.js               # Server entry point & graceful shutdown
│   ├── tests/
│   │   ├── auth.test.js            # Validation and credential tests
│   │   ├── monitor.test.js         # Uptime math & status categorization tests
│   │   └── ssrf.test.js            # Comprehensive SSRF & IP blocking tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Axios client with JWT interceptor & API methods
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Alert.jsx
│   │   │   │   ├── Icons.jsx       # Custom SVG icon set
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── StatCard.jsx
│   │   │   │   └── StatusBadge.jsx
│   │   │   ├── incidents/
│   │   │   │   └── IncidentTable.jsx
│   │   │   └── monitors/
│   │   │       ├── MonitorFormModal.jsx
│   │   │       ├── MonitorTable.jsx
│   │   │       └── ResponseTimeChart.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global authentication state
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main overview dashboard
│   │   │   ├── Incidents.jsx       # Incident management view
│   │   │   ├── Login.jsx           # Sign in view
│   │   │   ├── MonitorDetail.jsx   # Telemetry, uptime & check history
│   │   │   ├── Monitors.jsx        # Monitors list & management
│   │   │   ├── PublicStatusPage.jsx# Unauthenticated public status page
│   │   │   ├── Register.jsx        # Account registration
│   │   │   └── StatusPages.jsx     # Status page builder
│   │   ├── App.jsx                 # Routing configuration
│   │   ├── index.css               # Tailwind CSS styles
│   │   └── main.jsx                # React root mount
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Windows 11 / VS Code / MySQL Workbench Setup

### Step 1: Database Setup in MySQL Workbench

1. Open **MySQL Workbench** on Windows 11 and connect to your local MySQL 8 instance (default: `localhost:3306`).
2. Open a new SQL Query tab (`Ctrl + T`).
3. Open `backend/database/schema.sql` (or paste its contents) and click the **Lightning Bolt** execution icon (`Ctrl + Shift + Enter`).
4. This creates the database `pulseapi_db` and all 6 tables:
   - `users`
   - `monitors`
   - `monitor_checks`
   - `incidents`
   - `status_pages`
   - `status_page_monitors`

### Step 2: Backend Configuration & Run

1. Open PowerShell or Command Prompt in VS Code:
   ```powershell
   cd C:\Users\aryan\.gemini\antigravity\scratch\pulseapi\backend
   ```
2. Create your `.env` configuration:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Edit `.env` with your MySQL password:
   ```ini
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=pulseapi_db
   JWT_SECRET=super_secret_jwt_key_pulseapi_production_grade_32chars!
   CRON_SCHEDULE=* * * * *
   CLIENT_URL=http://localhost:5173
   ```
4. Install backend dependencies:
   ```powershell
   npm install
   ```
5. Run the automated seed script to populate sample monitors, checks, and a demo user:
   ```powershell
   npm run seed
   ```
6. Run the unit tests to verify SSRF protection and business logic:
   ```powershell
   npm test
   ```
7. Start the backend server:
   ```powershell
   npm run dev
   # Server runs at http://localhost:5000
   ```

### Step 3: Frontend Configuration & Run

1. Open a second terminal window in VS Code:
   ```powershell
   cd C:\Users\aryan\.gemini\antigravity\scratch\pulseapi\frontend
   ```
2. Create `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Install frontend dependencies:
   ```powershell
   npm install
   ```
4. Start the Vite development server:
   ```powershell
   npm run dev
   ```
5. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## Demo Credentials

The database seeder automatically configures a demo administrator account:

| Field | Value |
| :--- | :--- |
| **Email** | `demo@pulseapi.dev` |
| **Password** | `PulsePassword123!` |
| **Public Status Page** | `http://localhost:5173/status/pulse-cloud-status` |

*(Tip: On the login screen, click **"⚡ Autofill Demo Credentials"** to test immediately).*

---

## REST API Specification

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`{ name, email, password }`)
- `POST /api/auth/login` — Sign in and receive JWT token (`{ email, password }`)
- `GET  /api/auth/profile` — Retrieve current authenticated user (Protected)
- `POST /api/auth/logout` — Invalidate session (Protected)

### Monitors (`/api/monitors`)
- `GET    /api/monitors` — List all user's monitors with status and latency
- `POST   /api/monitors` — Create a monitor (includes pre-flight SSRF check)
- `GET    /api/monitors/:id` — Detail view with 24h/7d/30d uptime, 50 check points & incidents
- `PUT    /api/monitors/:id` — Update monitor settings
- `PATCH  /api/monitors/:id/toggle-pause` — Pause or resume monitoring
- `DELETE /api/monitors/:id` — Delete monitor and historical check logs
- `POST   /api/monitors/:id/check-now` — Trigger immediate manual health check

### Incidents (`/api/incidents`)
- `GET   /api/incidents?status=all|active|resolved` — List incidents
- `GET   /api/incidents/:id` — Incident details
- `PATCH /api/incidents/:id/status` — Mark incident investigating, identified, or resolved

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary` — Aggregated counts, overall uptime %, mean latency, recent checks

### Status Pages (`/api/status-pages`)
- `GET    /api/status-pages` — List user's created status pages
- `POST   /api/status-pages` — Create new status page with slug and monitor associations
- `DELETE /api/status-pages/:id` — Delete status page
- `GET    /api/status-pages/public/:slug` — **Public (unauthenticated)** status page payload

---

## Security Implementation

- **SSRF Prevention**: Uses `dns.lookup` to inspect all resolved IPv4 & IPv6 records, rejecting loopback (`127.0.0.0/8`, `::1`), RFC 1918 private ranges, AWS metadata (`169.254.169.254`), non-HTTP schemes (`file://`, `ftp://`), and private domains (`.local`, `.internal`).
- **SQL Injection Prevention**: 100% parameterized SQL queries utilizing `mysql2/promise`.
- **Brute-Force Protection**: Tiered rate limiters via `express-rate-limit` (strict limits on login, registration, and manual checks).
- **Hardened HTTP Headers**: Helmet enabled with secure CORS origin restrictions.
- **Credential Storage**: Cryptographically hashed passwords with `bcryptjs` (salt rounds: 10).
