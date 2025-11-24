This frontend is a Svelte + Vite app for the Monopoly Companion.

Local dev:

1. Install dependencies in the frontend folder:

```bash
cd frontend
npm install
```

2. Run dev server (Vite) while running the backend server (root):

In one terminal (backend):
```bash
npm start
```

In another terminal (frontend):
```bash
cd frontend
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:3000` so the UI can call the existing Express APIs.

Production build:

```bash
cd frontend
npm run build
# this will output files into `public/`
# then start the server which serves `public/`
npm start
```

Root `npm run dev` also runs both server and vite concurrently (requires root deps installed: `npm install` in project root).
