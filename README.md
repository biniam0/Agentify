# AgentX Backend - Sales Meeting Automation Service

AgentX Backend is a Node.js/TypeScript REST API service designed to automate sales meeting follow-ups and pre-meeting preparations. The backend integrates with BarrierX (mock), ElevenLabs, and Twilio to orchestrate AI-powered voice calls, manage meeting data, and provide automated scheduling capabilities.

## Backend Overview

### Problem Statement
Sales representatives often miss pre- or post-meeting follow-ups, resulting in lost engagement opportunities, incomplete CRM updates, and inconsistent customer communication.

### Solution
The AgentX backend automates pre- and post-meeting outreach using AI voice calls via ElevenLabs, synchronizes meeting data from BarrierX, manages user authentication, and provides both automated (scheduled) and manual meeting call triggers.

## Backend Architecture

```
AgentX/
├── backend/  
    |── prisma/
    │   └── schema.prisma          # Database schema (User model)
    ├── src/
    │   ├── config/                # Configuration modules
    │   │   ├── database.ts        # Prisma client setup
    │   │   └── env.ts             # Environment variables
    │   ├── controllers/           # Request handlers
    │   │   ├── authController.ts  # Authentication logic
    │   │   ├── meetingController.ts # Meeting operations
    │   │   ├── userController.ts  # User management
    │   │   └── webhookController.ts # Webhook handlers
    │   ├── middlewares/           # Express middlewares
    │   │   ├── auth.ts            # JWT authentication
    │   │   └── errorHandler.ts    # Error handling
    │   ├── routes/                # API route definitions
    │   │   ├── authRoutes.ts
    │   │   ├── meetingRoutes.ts
    │   │   ├── userRoutes.ts
    │   │   └── webhookRoutes.ts
    │   ├── services/              # Business logic services
    │   │   ├── barrierxService.ts # Mock BarrierX API
    │   │   ├── meetingService.ts  # ElevenLabs call triggers
    │   │   └── schedulerService.ts # Automated scheduling
    │   ├── utils/                 # Utility functions
    │   │   ├── jwt.ts             # JWT token management
    │   │   ├── riskGenerator.ts   # Risk score utilities
    │   │   ├── timeHelpers.ts     # Time manipulation
    │   │   └── webhookVerification.ts # Webhook security
    │   ├── data/                  # Mock data
    │   │   └── mockUsers.json     # Test user/deal/meeting data
    │   ├── app.ts                 # Express app setup
    │   └── server.ts              # Server initialization
    ├── package.json
    └── tsconfig.json
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT (jsonwebtoken)
- **Scheduling**: node-cron
- **HTTP Client**: Axios
- **Password Hashing**: bcryptjs

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or yarn

### Installation

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
BARRIERX_BASE_URL=https://dummy-barrierx-api.com
ELEVENLABS_KEY=your-elevenlabs-api-key
ELEVENLABS_PRE_AGENT_ID=your-pre-meeting-agent-id
ELEVENLABS_POST_AGENT_ID=your-post-meeting-agent-id
ELEVENLABS_PHONE_NUMBER_ID=your-phone-number-id
ELEVENLABS_WEBHOOK_SECRET=your-webhook-secret
```

4. **Set up database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

5. **Start the server**
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

The backend server will run on `http://localhost:4000` (or the port specified in `.env`)

### Health Check
```bash
curl http://localhost:4000/health
```

## Backend Features

### Authentication & Authorization
- **JWT-based authentication**: Secure token-based user authentication
- **BarrierX mock integration**: Simulates BarrierX login API
- **User management**: Database-backed user storage with Prisma
- **Protected routes**: Middleware-based route protection

### Meeting Management
- **Meeting retrieval**: Fetch all meetings for authenticated users
- **Deal integration**: Meetings linked to deals with full context
- **Contact management**: Participant information for each meeting
- **Status tracking**: Support for scheduled, in-progress, and completed meetings

### Automated Call Triggers
- **Pre-meeting calls (T-15)**: Automatically trigger calls 15 minutes before meeting start
- **Post-meeting calls (T+5)**: Automatically trigger calls 5 minutes after meeting end
- **Scheduled automation**: Cron job runs every 10 minutes to check for eligible meetings
- **Manual triggers**: API endpoints for on-demand call triggering

### ElevenLabs Integration
- **Voice AI calls**: Integration with ElevenLabs Conversational AI
- **Dynamic variables**: Context-aware call variables (customer name, deal info, risks, recommendations)
- **Pre and post agents**: Separate AI agents for pre-meeting and post-meeting scenarios
- **Twilio integration**: Phone call orchestration via Twilio

### BarrierX Mock Service
- **User authentication**: Mock login endpoint
- **Deal retrieval**: Fetch user deals with meetings and contacts
- **Risk analysis**: Get deal risk scores and categories
- **Recommendations**: AI-generated action recommendations based on risks
- **CRM operations**: Mock endpoints for notes, contacts, deals, and companies

## API Endpoints

### Authentication
- `POST /api/auth/login`
  - **Description**: Authenticate user via BarrierX (mock)
  - **Body**: `{ email: string, password: string }`
  - **Response**: `{ success: boolean, token: string, user: User }`

### Meetings (Protected - Requires JWT)
- `GET /api/meetings`
  - **Description**: Get all meetings for authenticated user
  - **Headers**: `Authorization: Bearer <token>`
  - **Response**: `{ success: boolean, meetings: Meeting[] }`

- `POST /api/meetings/trigger/pre-call`
  - **Description**: Manually trigger pre-meeting call
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ meetingId: string, dealId: string }`
  - **Response**: `{ success: boolean, conversationId: string, callSid: string }`

- `POST /api/meetings/trigger/post-call`
  - **Description**: Manually trigger post-meeting call
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**: `{ meetingId: string, dealId: string }`
  - **Response**: `{ success: boolean, conversationId: string, callSid: string }`

### User Management (Protected)
- `GET /api/user/deals`
  - **Description**: Get user's deals with full context
  - **Headers**: `Authorization: Bearer <token>`
  - **Response**: `{ success: boolean, deals: Deal[] }`

### Webhooks
- `POST /api/webhook/elevenlabs`
  - **Description**: Receive webhook events from ElevenLabs
  - **Headers**: `X-ElevenLabs-Signature` (for verification)
  - **Body**: ElevenLabs webhook payload
  - **Response**: `{ success: boolean }`

### Health Check
- `GET /health`
  - **Description**: Server health status
  - **Response**: `{ status: 'ok', timestamp: string }`

## Demo Credentials

The backend includes mock users for testing. Use these credentials:

- **Email**: tamiratkebede@gmail.com | **Password**: any password
- **Email**: alex.johnson@example.com | **Password**: any password
- **Email**: sarah.williams@company.com | **Password**: any password
- **Email**: james.martinez@enterprise.com | **Password**: any password

All mock users have `isAuth: true` and `isEnabled: true` for full functionality testing.

## Database Schema

### User Model
The backend uses Prisma ORM with PostgreSQL. The current schema includes:

```prisma
model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  isAuth     Boolean  @default(false)  // BarrierX authentication status
  isEnabled  Boolean  @default(true)   // User account enabled status
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**User States**:
- `isAuth: true` - User has authenticated with BarrierX
- `isEnabled: true` - User account is active and can receive automated calls
- Only users with both `isAuth: true` AND `isEnabled: true` are processed by the scheduler

## Mock BarrierX Service

The backend includes a comprehensive mock BarrierX service (`src/services/barrierxService.ts`) that simulates the BarrierX API without requiring external dependencies.

### Features:
- **User Authentication**: `login(email, password)` - Returns JWT tokens and user data
- **User Lookup**: `getUserById(userId)` - Fetch user by ID
- **Deal Retrieval**: `getUserDeals(userId)` - Get all deals with meetings and contacts
- **Risk Analysis**: `getRisks(dealId)` - Get deal risk scores and descriptions
- **Recommendations**: `getRecommendations(dealId)` - Get AI-generated action recommendations
- **CRM Operations**: 
  - `createNote()` - Create deal notes
  - `createContact()` - Create contacts
  - `createDeal()` - Create deals
  - `createCompany()` - Create companies

### Mock Data Structure:
- **4 test users** with different authentication states
- **Multiple deals** per user with associated meetings
- **Contacts** with phone numbers, emails, and company info
- **Meetings** with dynamic timestamps using `{{T+X}}` and `{{T-X}}` templates for testing
- **Risk scores** including CompetitionRisks, ChampionRisks, ContractualLegalRisks, DealVelocity, and arenaRisk

### Time Templates:
Meetings in mock data use time templates that are processed at runtime:
- `{{T-15}}` - 15 minutes in the past
- `{{T+5}}` - 5 minutes in the future
- These are converted to actual ISO timestamps by the scheduler service

## Core Services

### 1. BarrierX Service (`src/services/barrierxService.ts`)
Mock implementation of BarrierX API providing:
- User authentication and management
- Deal and meeting data retrieval
- Risk score analysis
- Action recommendations
- CRM operation stubs

### 2. Meeting Service (`src/services/meetingService.ts`)
Handles ElevenLabs API integration for voice calls:
- **Pre-meeting calls**: Triggers calls 15 minutes before meeting start
  - Uses pre-meeting agent ID
  - Includes deal context, risks, and recommendations
  - Calls the sales rep (owner), not the customer
- **Post-meeting calls**: Triggers calls 5 minutes after meeting end
  - Uses post-meeting agent ID
  - Includes meeting summary context
  - Calls the sales rep for follow-up actions

### 3. Scheduler Service (`src/services/schedulerService.ts`)
Automated meeting call scheduler:
- **Cron job**: Runs every 10 minutes (`*/10 * * * *`)
- **T-15 logic**: Finds meetings starting within next 15 minutes
- **T+5 logic**: Finds meetings that ended within last 5 minutes
- **User filtering**: Only processes authenticated and enabled users
- **Concurrency protection**: Prevents overlapping job executions
- **Time template processing**: Converts `{{T+X}}` templates to actual timestamps

### 4. Authentication Middleware (`src/middlewares/auth.ts`)
JWT token validation:
- Extracts token from `Authorization` header
- Verifies token signature and expiration
- Attaches user data to request object
- Protects routes requiring authentication

## Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload (tsx watch)
npm run build        # Compile TypeScript to JavaScript
npm start            # Run production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio (database GUI)
```

### Development Workflow
1. **Start the database**: Ensure PostgreSQL is running and accessible
2. **Set environment variables**: Copy `.env.example` to `.env` and configure
3. **Run migrations**: `npm run prisma:migrate` to set up database schema
4. **Start dev server**: `npm run dev` - server runs on port 4000 (or configured port)
5. **Test endpoints**: Use Postman, curl, or the frontend to test API endpoints

### Enabling the Scheduler
To enable automated meeting calls, uncomment the scheduler in `src/server.ts`:
```typescript
// Start the automated meeting calls scheduler
startScheduler();
```

The scheduler will:
- Run every 10 minutes
- Process all authenticated and enabled users
- Trigger pre-meeting calls (T-15) and post-meeting calls (T+5)
- Log all activities to console

## Testing the Backend

### Manual API Testing

1. **Start the backend server**
```bash
npm run dev
```

2. **Test authentication**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tamiratkebede@gmail.com","password":"test"}'
```

3. **Get meetings (use token from login response)**
```bash
curl -X GET http://localhost:4000/api/meetings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

4. **Trigger pre-meeting call**
```bash
curl -X POST http://localhost:4000/api/meetings/trigger/pre-call \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"meetingId":"meeting-id","dealId":"deal-id"}'
```

5. **Check health endpoint**
```bash
curl http://localhost:4000/health
```

### Testing the Scheduler
1. Ensure scheduler is enabled in `server.ts`
2. Check console logs for scheduler activity
3. Meetings with `{{T-15}}` or `{{T+5}}` templates will be processed
4. Verify calls are triggered (or mocked if ElevenLabs not configured)

## Configuration

### Environment Variables

Required environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Server
PORT=4000
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-here

# BarrierX (mock - can be dummy URL)
BARRIERX_BASE_URL=https://dummy-barrierx-api.com

# ElevenLabs (optional - for actual voice calls)
ELEVENLABS_KEY=your-api-key
ELEVENLABS_PRE_AGENT_ID=pre-meeting-agent-id
ELEVENLABS_POST_AGENT_ID=post-meeting-agent-id
ELEVENLABS_PHONE_NUMBER_ID=twilio-phone-number-id
ELEVENLABS_WEBHOOK_SECRET=webhook-secret
```

### ElevenLabs Configuration
- If ElevenLabs credentials are not provided, the service will log mock calls instead of making actual API requests
- This allows development and testing without API costs
- All call data and variables are still logged for debugging

## Future Enhancements

- Real BarrierX API integration (replace mock service)
- Enhanced webhook handling for ElevenLabs call events
- Call transcript storage and retrieval
- Meeting analytics and reporting
- User preferences and notification settings
- Rate limiting and API throttling
- Database models for calls, transcripts, and analytics
- Admin API endpoints for user management
- Background job queue (Bull/BullMQ) for better scalability

## Error Handling

The backend includes comprehensive error handling:

- **Global error handler**: `src/middlewares/errorHandler.ts` catches all unhandled errors
- **Validation errors**: Returns 400 with validation details
- **Authentication errors**: Returns 401 for unauthorized requests
- **Not found errors**: Returns 404 for missing resources
- **Server errors**: Returns 500 with error details (in development mode)

## Security Features

- **JWT token validation**: All protected routes verify JWT tokens
- **Password hashing**: Uses bcryptjs for secure password storage (if implemented)
- **CORS configuration**: Configurable CORS for frontend integration
- **Webhook verification**: ElevenLabs webhook signature verification (optional)
- **Environment-based secrets**: Sensitive data stored in environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ for sales automation**

