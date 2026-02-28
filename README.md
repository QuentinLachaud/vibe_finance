# 💰 Finance is Fun

A modern personal finance web app built with React, TypeScript, and Vite. Track your savings rate, project investment growth with compound interest, and simulate your financial future — all in a sleek dark-themed UI that works beautifully on both desktop and mobile.

## ✨ Features

- **Savings Calculator** — Enter your income and monthly expenses to instantly see your savings rate, visualised with an interactive donut chart.
- **Compound Interest Calculator** — Model how an initial investment plus recurring deposits (or withdrawals) grow over time, with a stacked bar chart and full year-by-year breakdown table.
- **Portfolio Simulator** — Run Monte Carlo simulations on custom cash-flow scenarios to visualise a range of possible financial futures.
- 🌙 Dark / light theme toggle
- 💱 Multi-currency support (GBP, USD, EUR)
- 📱 Fully responsive — works great on mobile

---

## 📸 Screenshots

#### Savings Calculator
![Savings Calculator](https://github.com/user-attachments/assets/0aa70d77-59a6-44ec-beee-51fe66995dfd)

#### Compound Interest Calculator
![Compound Interest Calculator](https://github.com/user-attachments/assets/518fd11a-7315-4bd5-be66-3fa955247061)

#### Portfolio Simulator
![Portfolio Simulator](https://github.com/user-attachments/assets/8af4593b-0200-410a-8705-3f2232228efb)

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### 🔑 Firebase / Auth (optional)

Copy `.env.example` to `.env` and fill in your Firebase project values to enable Google and email sign-in:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

The app runs in read-only mode (no auth) when these keys are absent.

### 🚀 Production deployment (Cloudflare Pages via GitHub Actions)

The workflow in `.github/workflows/deploy.yml` builds and deploys automatically on every push to `main`.

Add the following **GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID (Analytics) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages write permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

> **Why GitHub Secrets?** Vite bakes `VITE_*` variables into the JavaScript bundle at build time. Passing them through GitHub Secrets ensures they are always present during the build, regardless of whether Cloudflare's own environment-variable settings are configured correctly.

## 🛠️ Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) with HMR
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) for data visualisation
- [React Router v7](https://reactrouter.com/)
- [Firebase](https://firebase.google.com/) (optional auth)
