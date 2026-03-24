# BlueLeafBooks — Production ZIP (Frontend + Backend)

This ZIP is cleaned for deployment (node_modules removed).

## Folder structure
- /frontend  → static site (HTML/CSS/JS)
- /backend   → Node/Express API (MongoDB + PayPal)

---

## 1) Backend — local run
1. Open a terminal in `/backend`
2. Install deps:
   npm install
3. Create `.env` from `.env.example` and fill values
4. Run:
   npm run dev
   # or: npm start

Backend runs on: http://localhost:3000 (default)

---

## 2) Frontend — local run
You can open `frontend/index.html` directly, OR serve it:
- VS Code Live Server
- any static server

IMPORTANT: In production, your frontend must point to your deployed backend URL (Render).
Check `/frontend/js/` for API base URL settings.

---

## 3) Render deploy (recommended)
### Backend (Web Service)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment Variables (Render → Environment):
  - MONGODB_URI
  - JWT_SECRET
  - PAYPAL_CLIENT_ID
  - PAYPAL_CLIENT_SECRET
  - PAYPAL_MODE (sandbox or live)
  - PLATFORM_FEE_PERCENTAGE (optional, e.g. 10)
  - ADMIN_EMAIL
  - ADMIN_PASSWORD
  - CLOUDINARY_CLOUD_NAME (if used)
  - CLOUDINARY_API_KEY (if used)
  - CLOUDINARY_API_SECRET (if used)

### Frontend (Static Site)
- Root directory: `frontend`
- Build command: (none)
- Publish directory: `.`

After backend deploy, update the frontend API base URL to your Render backend URL.

---

## Notes
- Do NOT upload `.env` to GitHub.
- `node_modules` is intentionally removed (Render installs dependencies automatically).
