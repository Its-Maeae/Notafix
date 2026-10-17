# Notafix

A self-hosted grade calculator for German schools. Track your grades across semesters, calculate averages, and analyze your performance — with offline support and an optional Android app.

## Features

- 📚 Manage multiple school years and subjects
- 📝 Track grades per semester with custom categories and weights
- 🎓 Abirechner Sachsen (Oberstufe): Gesamtqualifikation bis 900 Punkte, Zielschnitt-Verteilung, Best-/Worst-Case
- 📊 Grade statistics with bar charts and subject breakdown
- 🌐 Offline support — works without internet, syncs automatically when back online
- 🔒 User accounts with login, registration, and admin panel
- 🌙 Dark / Light mode
- 📱 Installable as PWA (Progressive Web App)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite via Prisma
- **Auth:** JWT (jose) + bcryptjs
- **Styling:** Custom CSS with CSS variables (no Tailwind)

## Requirements

- [Node.js](https://nodejs.org/) v18+
- npm v9+

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Its-Maeae/Notafix.git
cd notafix
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-min-32-characters-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="YourAdminPassword123!"
```

> ⚠️ Change `JWT_SECRET` and the admin credentials before deploying to production.

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Deployment (Raspberry Pi / Linux Server)

### Build

```bash
npm run build
```

### Run as a systemd service

Create `/etc/systemd/system/notafix.service`:

```ini
[Unit]
Description=Notafix
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/notafix
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable notafix
sudo systemctl start notafix
```

The app runs on port **3000** by default.

### Reverse Proxy (Nginx Proxy Manager)

Point a domain at `localhost:3000` and enable SSL via Let's Encrypt. Make sure ports **80** and **443** are forwarded in your router.

## Project Structure

```
notafix/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.js                # Initial admin user seed
├── public/
│   ├── sw.js                  # Service worker (offline support)
│   ├── manifest.json          # PWA manifest
│   ├── logo.png               # ← Replace with your logo
│   └── favicon.png            # ← Replace with your favicon
├── src/
│   ├── app/
│   │   ├── (app)/             # Protected app routes
│   │   │   ├── half/1/        # 1st semester
│   │   │   ├── half/2/        # 2nd semester
│   │   │   ├── final/         # Final grades
│   │   │   ├── stats/         # Statistics & charts
│   │   │   └── settings/      # User settings
│   │   ├── admin/             # Admin panel
│   │   ├── api/               # API routes
│   │   ├── login/
│   │   └── register/
│   ├── components/            # React components
│   ├── lib/                   # Auth, grades logic, Prisma client
│   ├── styles/                # Global CSS
│   └── types/                 # TypeScript types
└── .env                       # Environment variables (not committed)
```

## Customization

### Logo & Favicon

Place your images in the `public/` folder and update the paths:

- **Logo** (shown in the app header): `public/logo.png`
- **Favicon** (browser tab icon): `public/favicon.png`

To change the favicon path, edit `src/app/layout.tsx`:
```tsx
const FAVICON_PATH = '/favicon.png'  // ← your path here
```

### Default Subjects

Edit `src/types/index.ts` to change which subjects are suggested when creating a new school year:

```ts
export const DEFAULT_YEAR_SUBJECTS = [
  'Mathematik', 'Deutsch', 'Englisch', ...
]
```

### Lock Timeout (Android only)

The biometric lock timeout is set to **2 minutes** by default. Change it in `MainActivity.java`:

```java
private static final long LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
```

## Admin Panel

Access the admin panel at `/admin` using the credentials set in your `.env` file. From there you can manage users, view sessions, and reset passwords.

## Database

The app uses SQLite stored at `prisma/dev.db`. Back this file up regularly — it contains all user data.

To reset the database completely:

```bash
npx prisma db push --force-reset
npm run db:seed
```

## Android App

A native Android wrapper is available separately: [notafix-android](https://github.com/Its-Maeae/NotafixAndroid.git)

## Troubleshooting

**Port already in use** — Change the port by setting `PORT=3001` in your `.env`.

**Database errors after schema change** — Run `npx prisma generate` and `npx prisma db push` again.

**Styles missing offline** — Open the app once while online on all pages so the service worker can cache all assets.

**Offline changes not syncing** — Tap the sync button in Settings (Android app) or wait for the banner to disappear after reconnecting.

## License

MIT
