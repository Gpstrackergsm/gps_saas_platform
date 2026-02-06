# GPS SaaS Platform - Project Report

## 1. Executive Summary
This project is a **GPS Tracking SaaS Platform** designed to track vehicles in real-time. It consists of a high-performance **TCP Server** for ingesting data from GPS hardware (trackers), a **Node.js Backend** for API and real-time socket communication, and a **Next.js Frontend** for visualization on Google Maps.

## 2. Technical Architecture

### 2.1 System Overview
The system follows a classic micro-service-like architecture:
1.  **GPS Devices/Simulator**: Send raw string data (TK103 protocol) to the TCP Keyhole.
2.  **TCP Server (Port 5000)**: Ingests raw data, parses it, saves to DB, and emits to Socket.IO.
3.  **Database (MySQL)**: Stores persistent data (Device Lists, Historical Positions, Users).
4.  **API / Web Server (Port 4000)**: Serves REST endpoints and manages Socket.IO connections.
5.  **Frontend (Port 3000)**: Consumes the API and Socket.IO stream to update the map live.

### 2.2 Tech Stack

#### Backend (`/backend`)
*   **Runtime**: Node.js
*   **Language**: TypeScript
*   **Framework**: Express.js
*   **Database Driver**: `mysql2` (Promise-based)
*   **Real-time**: Socket.IO
*   **Protocols**: Custom TCP listener for TK103 devices
*   **Authentication**: JWT (JSON Web Tokens) with bcrypt hashing

#### Frontend (`/frontend`)
*   **Framework**: Next.js 16 (App Router)
*   **Library**: React 19
*   **Styling**: Tailwind CSS v4 + Lucide Icons
*   **Maps**: `@react-google-maps/api`
*   **State**: React Hooks (`useState`, `useEffect`, `useRef`)

#### Database (Docker/Local)
*   **Engine**: MySQL 8.0
*   **ORM**: Raw SQL via `mysql2` (No TypeORM/Prisma currently used, enabling high-performance raw inserts)

## 3. Database Schema
Major tables found in `init_schema.ts` / `db.ts`:

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`devices`** | Inventory of physical trackers. | `device_id` (Unique), `name`, `status` (online/offline), `last_seen` |
| **`positions`** | Historical GPS breadcrumbs. | `device_id` (FK), `lat`, `lng`, `speed`, `timestamp` |
| **`raw_logs`** | Debugging/Audi log of raw TCP payloads. | `device_id`, `payload`, `received_at` |
| **`users`** | Application users and admins. | `email`, `password_hash`, `role`, `tenant_id` |
| **`tenants`** | Multi-tenancy grouping (SaaS). | `name` |

## 4. Key Workflows

### 4.1 Data Ingestion Flow
1.  **Device Sends Data**: A GPS tracker sends a string likely formatted as a TK103 message to `localhost:5000`.
2.  **TCP Server (`src/tcpServer.ts`)**:
    *   Logs raw payload to `raw_logs`.
    *   Parses payload (e.g., extracts Lat/Lng, Speed, ID).
    *   Inserts record into `positions` table.
    *   Updates `last_seen` in `devices` table.
    *   **Emits `position` event** via Socket.IO.

### 4.2 Frontend Visualization Flow
1.  **Initial Load (`GoogleMapsView.tsx`)**:
    *   Fetches list of devices via REST API (`GET /devices`).
    *   Plots initial markers on Map.
2.  **Real-Time Update**:
    *   Listens for `position` socket event.
    *   Updates the specific vehicle marker position on the map without reloading.
3.  **History Replay**:
    *   Fetches date-range data (`GET /devices/:id/history`).
    *   Draws a polyline route.
    *   Allows "Play/Pause" simulation of the route.

## 5. Directory Structure Map

### Root
*   `start_all.sh`: **Master script** to launch DB, Backend, Simulator, and Frontend simultaneously.

### Backup (`/backend`)
*   `src/index.ts`: HTTP Server Entry Point.
*   `src/tcpServer.ts`: **Critical**. TCP Ingestion Logic.
*   `src/simulator.ts`: Fake GPS Activity Generator for testing.
*   `src/config/db.ts`: Database Connections.

### Frontend (`/frontend`)
*   `components/GoogleMapsView.tsx`: **Critical**. Main Map UI Logic.
*   `lib/socket.ts`: Singleton Socket Client.

## 6. How to Run
Run the master script from the root:
```bash
./start_all.sh
```
*   **Dashboard**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:4000](http://localhost:4000)
*   **Database**: Port 3306 (MySQL)

## 7. Migration Notes
*   The project appears to have been recently migrated or is in the process of migration from **PostgreSQL to MySQL**.
*   Traces of the migration can be seen in filenames like `test_mysql.js` and `verify_backend.py`.
*   Ensure your local environment has MySQL running if Docker is not available.
