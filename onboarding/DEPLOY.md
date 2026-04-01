# Onboarding Page - Deployment Guide

## DigitalOcean App Spec Changes

Add this entry under `static_sites` in the App Spec:

```yaml
- build_command: npm run build
  catchall_document: index.html
  environment_slug: node-js
  github:
    branch: main
    deploy_on_push: true
    repo: BarrierXai/AgentX-backend
  name: agentx-backend-onboarding
  output_dir: dist
  source_dir: onboarding
```

## Updated Ingress Rules

Replace the existing `ingress.rules` with:

```yaml
ingress:
  rules:
  - component:
      name: agentx-backend-onboarding
    match:
      path:
        prefix: /
  - component:
      name: agentx-backend-backend
    match:
      path:
        prefix: /api
  - component:
      name: agentx-backend-frontend
    match:
      path:
        prefix: /app
  - component:
      name: agentx-backend-docs
    match:
      path:
        prefix: /docs
```

> **Note:** The health check endpoint is now at `/api/health` (no longer `/health`), so it's covered by the `/api` prefix rule. DigitalOcean evaluates ingress rules by specificity (longest prefix match first), so `/api`, `/app`, and `/docs` will match before the catch-all `/`.

## Local Development

```bash
cd onboarding
npm install
npm run dev
# -> http://localhost:3001/
```

## Production Build

```bash
cd onboarding
npm run build
# Output: onboarding/dist/
```
