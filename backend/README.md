# AgentX Backend

Intelligent backend service for automating sales meeting follow-ups and pre-meeting preparations.

## Features

- User authentication via BarrierX integration (mock)
- Meeting management and retrieval
- Pre-meeting and post-meeting call triggers
- ElevenLabs webhook handling
- HubSpot data synchronization via BarrierX APIs

## Tech Stack

- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Neon)
- JWT Authentication

## Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the backend root directory:

```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"
PORT=4000
NODE_ENV=development
BARRIERX_BASE_URL="https://dummy-barrierx-api.com"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
ELEVENLABS_WEBHOOK_SECRET="dummy-secret"
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run database migrations:

```bash
npm run prisma:migrate
```

### Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:4000`

### Production

Build and run:

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
  ```json
  {
    "email": "john@example.com",
    "password": "any-password"
  }
  ```

### Users (Protected) **NEW**

- `POST /api/users` - Get specific users by IDs with their deals, meetings, contacts
- `GET /api/users/all` - Get all users
- `POST /api/users/filtered` - Get users with T-15/T+5 filtered meetings (for automation)

**Example:**
```bash
POST /api/users
Body: {
  "userIds": ["b7a7c13d-d164-4267-bbf1-b2f08032d2a5"],
  "filterMeetings": true
}
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed docs.

### Meetings (Protected)

- `GET /api/meetings` - Get user's meetings
- `POST /api/meetings/trigger/pre-call` - Trigger pre-meeting call
- `POST /api/meetings/trigger/post-call` - Trigger post-meeting call

### Webhooks

- `POST /api/webhook/elevenlabs` - Receive ElevenLabs webhook

### Health Check

- `GET /health` - Server health status

## Database Schema

### User Model

```prisma
model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  isAuth     Boolean  @default(false)
  isEnabled  Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## Mock BarrierX Service

The backend includes a mock BarrierX service (`src/services/barrierxService.ts`) that simulates:

- User authentication
- Deal and meeting retrieval
- Batch user deals fetching
- CRM operations (notes, contacts, deals, companies)

### Test Users

- **john@example.com** - Authenticated, 2 deals with meetings
- **jane@example.com** - Authenticated, 1 deal with meetings
- **bob@example.com** - Not authenticated

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Custom middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server initialization
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

## Development Notes

- JWT tokens expire in 7 days
- Mock BarrierX service uses in-memory data
- Meetings are generated with dynamic timestamps for testing
- All endpoints use proper error handling and validation

