# KIIT Admin Frontend Production Notes

Frontend is a standalone Vite + React SPA in `KIIT_ADMIN_FRONTED`.
Build output is generated into `dist/` and should be served by a static host (Nginx/CDN/object storage).

## Runtime/Build Requirements
- Node.js (validated here with `v24.10.0`)
- npm (validated here with `11.6.0`)

## Environment Variables
Use `KIIT_ADMIN_FRONTED/.env.example`.

| Key | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Yes (production build) | Backend API base URL, must include `/api` |

Important:
- `VITE_API_BASE_URL` is injected at build time.
- If backend URL changes, rebuild and redeploy frontend.

## Commands
From `KIIT_ADMIN_FRONTED`:

```bash
npm ci
npm run lint
VITE_API_BASE_URL=https://api.example.com/api npm run build
npm run preview
```

## API URL Behavior
`src/services/api.js` resolves API URL from:
1. `import.meta.env.VITE_API_BASE_URL`
2. Dev-only fallback: `http://localhost:5000/api`

There is no production runtime fallback to backend URL config. Production builds must set `VITE_API_BASE_URL` explicitly.

## Nginx SPA Hosting Example
```nginx
server {
  listen 80;
  server_name admin.example.com;
  root /var/www/kiit-admin-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

If API is reverse proxied via same domain, route `/api` to backend service in your edge proxy config.
