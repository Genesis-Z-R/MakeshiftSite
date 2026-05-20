

```markdown
# CampusMarket

CampusMarket is a production-grade, peer-to-peer marketplace architected specifically for university student communities. Built with safety and accessibility in mind, the platform provides a localized network where students can list items, message securely in real time, manage a cart workflow, and track transactional histories.

---

## Technical Architecture Overview

The system utilizes a decoupled, modern web-stack configuration:

* **Frontend:** React 19 single-page application built on top of Vite and TypeScript, featuring global layout guards, a context-driven accessibility architecture, and animations powered by Motion (Framer Motion).
* **Backend Layer:** Node.js server powered by Express, TypeScript (`tsx`), and native WebSocket connectivity using Socket.io to manage streaming traffic.
* **Database Engine:** PostgreSQL managing structured relations (Users, Listings, Messages, Cart Items, Transactions, Admin Reports, Warnings) using an optimized pooling protocol via `pg`.
* **Asset Storage:** Supabase Integration for handling persistent, public object storage buckets (image uploads).

---

## Extended Features

### 1. User Ecosystem & Guarded Routes
* **Authentication Flow:** JSON Web Token (JWT) authorization handling for cross-origin security.
* **Granular Role System:** Built-in verification routing partitioning access levels between typical `student` operators and platform `admin` users.
* **Account Support:** Dedicated structural support for registration, lookup profiles, password resetting, and updates.

### 2. Product & Listing Pipeline
* **P2P Marketplace Matrix:** Dynamic listings engine supporting localized search operations, granular category parameters, and context-aware filtering (e.g., retrieving specific seller histories vs globally available assets).
* **Asset Pipeline:** Multi-part file routing handled via `multer` to stream media directly into secure Supabase storage buckets.

### 3. Messaging & Streaming
* **Real-time Engine:** Custom WebSockets mapping active user identifiers to physical sockets (`Socket.io`).
* **Active Status Matrix:** Live tracking metrics providing multi-client status updates and user-typing telemetry across messaging rooms.

### 4. Commerce Workflows
* **Transactional Tracking:** Virtualized cart structure mapping multi-item configurations per unique user with relational dependency checking to prevent stale states or purchasing unavailable items.
* **Checkout Engine:** ACID-compliant checkout routines using PostgreSQL database transactions (`BEGIN` / `COMMIT` / `ROLLBACK`) ensuring item statuses, metrics, and global transaction balances execute atomically.

### 5. Advanced Administration & Moderation
* **Telemetry Dashboard:** Aggregation tracking total active user accounts, listing volumes, transactional loops, and current WebSocket connections.
* **System Logging Platform:** Intercepting error-state middleware shifting runtime exceptions dynamically into real-time visual registers.
* **Moderation Pipeline:** Systemic platform warning tracking and account lookup architectures ensuring localized student compliance.

---

## Project Structure

```text
├── backend/
│   ├── db.ts               # PostgreSQL client pooling and schema initialization scripts
│   └── package.json        # Node.js backend dependency configurations
├── src/
│   ├── components/         # Global layout assets (Navbar, FloatingCart, Modals)
│   ├── context/            # React global Context providers (Auth, Cart, Socket, Accessibility)
│   ├── lib/                # Supabase Storage client initializations
│   ├── pages/              # Application views (Home, Admin, Profile, Cart, Messages)
│   ├── App.tsx             # Main routing registry and path protection configurations
│   └── main.tsx            # Application entry render point
├── server.ts               # Main Express app, Socket.io listeners, and route controllers
├── package.json            # Monorepo/Root configurations and build parameters
└── vite.config.ts          # Vite build pipeline and plugin registers

```

---

## Configuration & Environment Variables

The application relies on configuration keys structured across two contexts.

### Server & Database Layer Context

Create a `.env` file within your root/backend workspace:

```env
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_public_key
UPLOADS_PATH=./uploads
NODE_ENV=development

```

### Client Layer Context

Create a `.env` file within your frontend layer:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

```

---

## Getting Started

### Installation

1. Clone the repository down to your local machine:
```bash
git clone [https://github.com/your-username/CampusMarket.git](https://github.com/your-username/CampusMarket.git)
cd CampusMarket

```


2. Provision environment dependencies across both boundaries:
```bash
npm install

```



### Execution Scripts

* **Development Routine:** Run your full stack inside a localized watch environment using `tsx`:
```bash
npm run dev

```


* **Build Routine:** Bundles your single-page app via Vite and transpiles the server code using `esbuild` to construct production-ready artifacts under `/dist`:
```bash
npm run build

```


* **Production Start:** Launches the system directly out of your generated deployment directory:
```bash
npm start

```


* **Static Testing & Linting:** Validates strict TypeScript compilation metrics:
```bash
npm run lint

```



---

## Production Deployment Context

The server architecture is explicitly built to support high-availability hosting platforms (such as Vercel, Render, or Fly.io).

* **CORS Safe-Listing:** Out-of-the-box configuration maps request validation to secure domains, natively supporting Vercel preview environments and your primary custom mapping:
```text
[https://campusmarket1.store](https://campusmarket1.store)

```


* **Static Asset Ingestion:** When toggled to `production`, the backend automates the distribution pipeline by binding `/dist` as static file middleware, ensuring single-instance execution efficiency.

```

