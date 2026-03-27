# AgentX API Documentation

Interactive API documentation for the AgentX Logs API, built with Swagger UI and OpenAPI 3.0.

## Contents

- `openapi.yaml` - OpenAPI 3.0 specification for the Logs API
- `index.html` - Swagger UI interface for browsing and testing endpoints

## Viewing the Documentation

### Via the running server

When the backend is running, the Swagger UI is served at:

```
http://localhost:4000/docs
```

### Locally (static)

Open `index.html` directly in a browser. Note that the spec URL (`/docs/openapi.yaml`) expects the backend server to be running.

## API Overview

The Logs API provides external read access to AgentX system logs via API key authentication.

### Authentication

All endpoints require an `X-API-Key` header:

```http
X-API-Key: your_api_key
```

Use `GET /test` to verify your API key is valid.

### Available Endpoints

| Endpoint | Description |
|---|---|
| `GET /test` | Test API key authentication |
| `GET /users/{userId}/activity` | User activity logs (login, logout, etc.) |
| `GET /users/{userId}/calls` | Voice call and conversation logs |
| `GET /users/{userId}/crm-actions` | CRM operation logs (create deal, contact, note) |
| `GET /users/{userId}/webhooks` | Webhook event logs |
| `GET /users/{userId}/scheduler` | Scheduler and job execution logs |
| `GET /users/{userId}/errors` | Application error logs |
| `GET /users/{userId}/sms` | SMS notification logs |
| `GET /users/{userId}/all` | All log types in a single request |

**Note:** `userId` refers to the **BarrierX User ID** in all endpoints.

### Common Query Parameters

All log endpoints support:

- `limit` (default: 50, max: 100) - Number of records to return
- `offset` (default: 0) - Pagination offset
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)

Each endpoint also has type-specific filters (e.g., `callType`, `severity`, `status`).

## Servers

| Environment | URL |
|---|---|
| Development | `http://localhost:4000/api/external/v1/logs` |
| Production | `https://agentx-backend-swg5i.ondigitalocean.app/api/external/v1/logs` |

## Updating the Spec

Edit `openapi.yaml` directly. Changes are reflected in Swagger UI on the next page load (no build step required).
