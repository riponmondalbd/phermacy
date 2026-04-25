# PharmaCare — Advanced Pharmacy Management System

A production-grade, full-stack Pharmacy Management System (PMS) designed for high-concurrency retail environments. Built with a focus on **security**, **performance**, and **financial accuracy**, this system provides a comprehensive suite for inventory tracking, POS billing, and multi-tier auditing.

## 🚀 Key Features

### 🛒 Point of Sale (POS)
- **High-Speed Checkout:** Optimized product search with barcode and generic name support.
- **FIFO Batch Deduction:** Automatically deducts stock from the oldest batches to prevent product expiration.
- **Dynamic Pricing:** Real-time discount application and tax calculation.
- **Credit Sales:** Support for registered customer dues with automatic balance tracking.

### 📦 Inventory & Supply Chain
- **Multi-Batch Management:** Track multiple batches per product with unique expiry dates and cost prices.
- **Stock Restoration:** Automated inventory correction during product returns.
- **Supplier Management:** Comprehensive supplier ledger with credit/debit tracking.

### 💰 Financials & Reporting
- **Batch-Wise Profit Tracking:** Real-time profit calculation based on the actual cost of the specific batch sold.
- **Refund Management:** Intelligent refund system that adjusts customer dues and restores stock integrity.
- **Daily Sessions:** Cash management with expected vs. actual balance reconciliation.
- **In-depth Analytics:** Visualized sales trends and product performance charts.

### 🛡️ Security & Auditing
- **HttpOnly Cookie Auth:** Secure session management using non-JS accessible cookies to prevent XSS.
- **Audit Logging:** Detailed logs of all critical system actions (logins, deletions, financial adjustments).
- **Role-Based Access (RBAC):** Granular permissions for Admin, Manager, and Salesman roles.
- **Rate Limiting:** Backend protection against brute-force and DDoS attempts.

## 🛠️ Tech Stack

- **Frontend:** React 18, Tailwind CSS, Zustand (State Management), Recharts.
- **Backend:** Node.js, Express.js.
- **ORM:** Prisma (PostgreSQL).
- **Database:** Neon (Serverless PostgreSQL).
- **Deployment:** Vercel (Edge Functions + Static Hosting).

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- A PostgreSQL Database (Neon recommended)

### Step 1: Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd phermacy

# Install root dependencies
npm install

# Install sub-project dependencies
cd frontend && npm install
cd ../backend && npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=4000
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_secure_random_secret"
FRONTEND_URL="http://localhost:5173"

# Default Admin Credentials
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure_password"
```

### Step 3: Database Initialization
```bash
cd backend
npx prisma generate
npx prisma db push
npm run seed
```

### Step 4: Run Locally
From the root directory:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## 📂 Project Structure

```text
phermacy/
├── backend/                # Express.js Server
│   ├── prisma/             # Database schema & migrations
│   ├── src/
│   │   ├── routes/         # API endpoints (Sales, Inventory, etc.)
│   │   ├── middleware/     # Auth & Error handling
│   │   ├── utils/          # Database, Logging, Scheduler
│   │   └── server.js       # Entry point
│   └── .env                # Backend secrets
├── frontend/               # React.js Application
│   ├── src/
│   │   ├── api/            # Axios client configuration
│   │   ├── components/     # UI & Layout components
│   │   ├── pages/          # Individual page views
│   │   ├── store/          # Zustand state management
│   │   └── index.css       # Global styles & Tailwind
│   └── .env                # Frontend public vars
├── vercel.json             # Deployment configuration
└── package.json            # Root monorepo configuration
```

## ☁️ Cloud Deployment (Vercel)

The project is pre-configured for Vercel deployment via `vercel.json`.

1. Connect your repository to Vercel.
2. Add the environment variables in the Vercel Dashboard.
3. Vercel will automatically build the React frontend and deploy the Express backend as a Serverless Function.

## 📄 License
This project is proprietary. Unauthorized copying or distribution is prohibited.

---
**Developed with focus on reliability and security by Ripon Mondal.**
