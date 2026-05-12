# TravelLogik Deployment

## Stack

TravelLogik is currently a static HTML/CSS/JavaScript app:

- Main entry: `TravelLogik.html`
- Browser modules: `modules/*.js`
- Runtime storage: browser `localStorage`
- Production server: Nginx container on port `80`
- Healthcheck: `/healthz`

There is no backend, database, JWT session layer, or build step in this repository at the moment.

## Environment Variables

No server-side environment variables are required for the current static deployment.

Do not commit secrets. The app stores optional provider configuration in the browser via the settings modal:

- Google Places API key: entered in the TravelLogik UI and stored in localStorage
- Uber client/backend settings: entered in the TravelLogik UI and stored in localStorage

If a backend is added later, keep provider secrets server-side only.

## Local Docker Test

```powershell
docker compose up -d --build
```

Open:

- App: `http://localhost:8080`
- Healthcheck: `http://localhost:8080/healthz`

Stop locally:

```powershell
docker compose down
```

## Recommended Coolify Deployment

Use Git-based deployment.

1. Push this project to a private Git repository.
2. In Coolify, create a new resource from that Git repository.
3. Select Dockerfile-based build.
4. Set the exposed port to `80`.
5. Configure the public domain or temporary Coolify URL.
6. Deploy.
7. Check the deployment logs.
8. Test:
   - `/healthz` returns `ok`
   - `/` loads the TravelLogik UI

For direct IP access without a domain, Coolify may still expose the app through its generated proxy URL or configured HTTP route. For HTTPS, connect a domain/subdomain to the resource and let Coolify issue the certificate.
