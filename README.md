# Psychic Giggle CAP

Eine minimale CAP-App auf SAP BTP Cloud Foundry.

## Endpoints

Nach dem Deploy erreichst du den Service unter:
- `https://<app-route>/api/Messages` - Liste aller Messages

## CI/CD

Bei jedem Push auf `main` wird automatisch nach SAP BTP deployed.

## Lokal testen

```bash
npm install
npx cds watch
```

Dann: http://localhost:4004
