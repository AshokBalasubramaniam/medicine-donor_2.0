# Medicine Donor System

Connects patients who need medicines with verified donors. One login for
patients, donors and administrators; the backend decides each user's role.

- `backend/` — Rust (Axum) API with MongoDB, JWT auth, Cloudinary image storage
- `react/` — React + Vite frontend

## Run locally

```bash
# Backend (needs MongoDB running)
cd backend
cp .env.example .env   # then fill in the values
cargo run              # http://localhost:3000

# Frontend
cd react
npm install
npm run dev            # http://localhost:5173 (proxies /api to the backend)
```

Never commit `backend/.env` — it holds database, JWT, Cloudinary, SMTP and
Razorpay secrets.
