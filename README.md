# PharmaCare - Pharmacy Management System

A production-grade, offline-first Windows desktop application for pharmacy management.

## 🚀 Features

*   **POS / Billing:** Fast checkout with FIFO batch deduction and barcode support.
*   **Inventory:** Multi-batch tracking (expiry, cost, quantity).
*   **Purchases:** Supplier management and credit tracking.
*   **Customers:** Credit system and payment history.
*   **Financials:** Real-time profit calculation (batch-wise) and sales reports.
*   **Cash Management:** Daily opening/closing and expense tracking.
*   **Security:** Role-based access (Admin, Manager, Cashier) and JWT auth.
*   **Automation:** Daily auto-backup and email reports via SMTP.

## 🛠️ Tech Stack

*   **Frontend:** React.js, Tailwind CSS, Zustand, Recharts, jsPDF.
*   **Desktop:** Electron.js.
*   **Backend:** Node.js, Express.js.
*   **Database:** SQLite with Prisma ORM.

## ⚙️ Setup & Development

1.  **Install Dependencies:**
    ```bash
    npm install
    cd backend && npm install
    cd ../frontend && npm install
    ```

2.  **Setup Database:**
    ```bash
    cd backend
    npx prisma migrate dev --name init
    npm run db:seed
    ```

3.  **Run in Development:**
    From the root directory:
    ```bash
    npm run dev
    ```
    This starts the Express server (4000) and Vite dev server (5173) concurrently.

4.  **Run Electron:**
    ```bash
    npm run electron
    ```

## 📦 Building .exe

To package the application for Windows:
```bash
npm run dist
```
The installer will be generated in `dist-electron/`.

## 👤 Demo Credentials

*   **Admin:** `admin@pharmacy.com` / `admin123`
*   **Cashier:** `cashier@pharmacy.com` / `cashier123`

---
Built with ❤️ by Antigravity
