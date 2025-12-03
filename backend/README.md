# AgentX Backend

AI-powered sales automation backend that triggers intelligent pre-meeting and post-meeting calls via ElevenLabs AI voice agents.

## 📚 Documentation

- **[BarrierX Integration](./BARRIERX_INTEGRATION.md)** - Hybrid authentication & API integration
- **[Bulk API Integration](./BULK_API_INTEGRATION.md)** - Modular architecture & data transformers
- **[Webhooks](./webhooks/README.md)** - ElevenLabs webhook payload storage

---

## ✨ Features

- 🔐 **Hybrid Authentication** - AgentX JWT (7-day) + BarrierX tokens (1-hour)
- 📞 **Automated Calls** - Pre-meeting (T-15) and post-meeting (T+5) via ElevenLabs
- 🔄 **Smart Call Retry** - Auto-retry on no-answer (3 attempts, 1 min interval)
- 📅 **Meeting Management** - Fetch and manage user meetings from BarrierX
- 🤖 **AI Voice Agents** - Pre-call preparation & post-call follow-up agents
- 🔄 **Scheduler Service** - Automated call triggering every 5 minutes
- 🎯 **Smart Data Handling** - Real API + dummy data fallback for resilience
- 📊 **Batch Processing** - Efficient multi-user data fetching (5x faster)
- 🔗 **BarrierX Integration** - Real-time deal, contact, and meeting data sync
- 📝 **Webhook Processing** - ElevenLabs call completion webhooks with payload storage

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: JWT (7-day validity)
- **External APIs**: 
  - BarrierX API (CRM data)
  - ElevenLabs API (AI voice calls)
- **Scheduler**: node-cron (3-minute intervals)

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- BarrierX API key
- ElevenLabs API key & agent IDs

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   
   Create `.env` file:
   ```env
   # Database
   DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
   
   # Server
   PORT=4000
   NODE_ENV=development
   
   # Authentication
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   
   # BarrierX Integration
   BARRIERX_BASE_URL="https://platform.barrierx.ai"
   BARRIERX_API_KEY="bx_live_YOUR_API_KEY"
   USE_MOCK_BARRIERX=false  # Set to 'true' for development with mock data
   
   # Automation Mode Configuration
   AUTOMATION_MODE=bulk                    # Options: 'authenticated' | 'bulk'
   DEAL_UPDATE_WINDOW_DAYS=60              # Only fetch deals updated in last 60 days (reduces payload ~67%)
   # TARGET_TENANT_SLUGS=agent-call        # Optional: comma-separated tenant slugs (leave empty for all)
   
   # ElevenLabs Integration
   ELEVENLABS_API_KEY="your_elevenlabs_api_key"
   ELEVENLABS_AGENT_ID_PRE="your_pre_call_agent_id"
   ELEVENLABS_AGENT_ID_POST="your_post_call_agent_id"
   ELEVENLABS_PHONE_NUMBER_ID="your_phone_number_id"
   ELEVENLABS_WEBHOOK_SECRET="your_webhook_secret"
   
   # Call Retry (when user doesn't answer)
   ENABLE_CALL_RETRY=true                # Enable/disable auto-retry
   CALL_RETRY_MAX_ATTEMPTS=3             # Total attempts (default: 3)
   CALL_RETRY_INTERVAL_MS=60000          # Interval between retries (default: 1 min)
   ```

3. **Setup database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000`

---

## 📡 API Endpoints

### Authentication

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "tamiratkebede120@gmail.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "YOUR_JWT_TOKEN",
  "user": { "id": "...", "name": "...", "email": "...", "isAuth": true, "isEnabled": true },
  "barrierx": {
    "accessToken": "BARRIERX_ACCESS_TOKEN",
    "refreshToken": "BARRIERX_REFRESH_TOKEN",
    "expiresAt": 1763936193,
    "tenants": [...]
  }
}
```

**Refresh Token**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "BARRIERX_REFRESH_TOKEN"
}
```

### Meetings (Protected)

All meeting endpoints require `Authorization: Bearer YOUR_JWT_TOKEN` header.

**Get User Meetings**
```http
GET /api/meetings
```

**Trigger Pre-Meeting Call (T-15 minutes)**
```http
POST /api/meetings/trigger/pre-call
Content-Type: application/json

{
  "meetingId": "meeting_id",
  "dealId": "deal_id"
}
```

**Trigger Post-Meeting Call (T+5 minutes)**
```http
POST /api/meetings/trigger/post-call
Content-Type: application/json

{
  "meetingId": "meeting_id",
  "dealId": "deal_id"
}
```

### Webhooks

**ElevenLabs Webhook** (receives call completion & failure data)
```http
POST /api/webhook/elevenlabs
```
Handles:
- `conversation.ended` - Call completed, creates HubSpot note
- `call_initiation_failed` - Call failed, triggers retry on "no-answer"

**ElevenLabs Server Tools**
```http
POST /api/webhook/create-contact
POST /api/webhook/create-note
POST /api/webhook/create-meeting
POST /api/webhook/create-deal
```

### Health Check

```http
GET /health
```

---

## 🗄️ Database Schema

```prisma
model User {
  id             String   @id @default(uuid())
  name           String
  email          String   @unique
  barrierxUserId String?  @unique  // Links to BarrierX user
  isAuth         Boolean  @default(false)
  isEnabled      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 🔄 Scheduler Service

Runs every **5 minutes** to automatically trigger calls.

### 🔀 Automation Modes

The scheduler supports **two modes** controlled by `AUTOMATION_MODE`:

#### **1. Authenticated Mode** (Default)
- Uses **database users** (logged in via frontend)
- Requires users to authenticate first
- Processes only enabled users
- Best for: User-specific, permission-based workflows

```env
AUTOMATION_MODE=authenticated
```

**Flow:**
1. Fetch authenticated & enabled users from database
2. Batch fetch their deals from BarrierX using user IDs
3. Process meetings for each user

#### **2. Bulk Mode** (Wildcard) ⭐ NEW
- Fetches **ALL users** from **ALL tenants** in **ONE API call**
- No database or login required
- Automatic user discovery
- Best for: Backend-only deployment, automated systems

```env
AUTOMATION_MODE=bulk
# TARGET_TENANT_SLUGS=agent-call,morphyn  # Optional: filter specific tenants
```

**Flow:**
1. Single API call: `GET /api/external/tenants/bulk` (no `user_ids` param)
2. Returns ALL tenants + ALL deals + ALL users
3. Process meetings for all discovered users

**Advantages of Bulk Mode:**
- ✅ **87.5% fewer API calls** (1 call vs 8 calls)
- ✅ **No user onboarding** required
- ✅ **Always fresh data** from source of truth
- ✅ **Auto-discovery** of new tenants/users
- ✅ **Simpler deployment** (backend-only)

### 📋 Processing Steps (Both Modes)

3. **Filters** meetings:
   - **Pre-call**: Meetings starting in 13-17 minutes (T-15 ±2 min buffer)
   - **Post-call**: Meetings ended 3-7 minutes ago (T+5 ±2 min buffer)
4. **Triggers** ElevenLabs calls to sales rep's phone
5. **Logs** results with detailed console output

**Configuration:**
- Interval: 5 minutes
- Concurrency protection: Built-in lock mechanism
- Error handling: Continues on individual failures
- Timeout: 60 seconds for bulk mode API calls

---

## 📂 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Database schema
├── src/
│   ├── config/
│   │   ├── database.ts            # Prisma client
│   │   └── env.ts                 # Environment config
│   ├── controllers/
│   │   ├── authController.ts      # Login & token refresh
│   │   ├── meetingController.ts   # Meeting endpoints
│   │   └── webhookController.ts   # Webhook handlers
│   ├── middlewares/
│   │   └── auth.ts                # JWT authentication
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── meetingRoutes.ts
│   │   └── webhookRoutes.ts
│   ├── services/
│   │   ├── barrierxService.ts     # BarrierX API integration
│   │   ├── meetingService.ts      # ElevenLabs call triggers
│   │   ├── schedulerService.ts    # Automated call scheduler
│   │   └── barrierx/
│   │       ├── dataTransformers.ts    # API format conversion
│   │       └── dummyDataGenerators.ts # Fallback data
│   ├── utils/
│   │   ├── jwt.ts                 # JWT utilities
│   │   └── riskGenerator.ts       # Mock risk data
│   ├── app.ts                     # Express app setup
│   └── server.ts                  # Server initialization
├── webhooks/
│   ├── README.md                  # Webhook payload docs
│   └── *.json                     # Latest webhook payloads (gitignored)
├── BARRIERX_INTEGRATION.md        # Hybrid auth documentation
├── BULK_API_INTEGRATION.md        # Modular architecture docs
└── README.md                      # This file
```

---

## 🧪 Development

### Scripts

```bash
npm run dev              # Start with hot reload
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio GUI
```

### Mock Mode

For development without real API calls:

```env
USE_MOCK_BARRIERX=true
```

- Uses `mockUsers.json` data
- No rate limits
- Fast development
- Automatic fallback on API errors (dev mode only)

### Testing Calls

1. **Manual Trigger**: Use Pre-Call/Post-Call buttons in frontend
2. **Scheduled Calls**: Wait for scheduler (runs every 5 minutes)
3. **Webhook Testing**: Send POST to `/api/webhook/elevenlabs`

### Console Logs

The backend provides detailed logging:

```
🌐 Fetching deals from BarrierX for user: userId
✅ Transforming 4 deals for user userId
  📝 No contacts for deal 123, generating dummy data
  📅 No meetings for deal 123, generating dummy data
  📞 Using default phone for owner: +251914373107
✅ Successfully fetched 4 deals for user userId

🔧 Manual PRE-CALL trigger by Tamirat Kebede
📋 Meeting: Product Demo Call
💼 Deal: Enterprise Deal
📞 Calling owner at: +251914373107
✅ ElevenLabs call initiated successfully
```

---

## 🔐 Security Notes

- **Never commit** `.env` files or API keys
- **Change** `JWT_SECRET` in production
- **Use HTTPS** in production
- **Validate** webhook signatures
- **Rate limit** API endpoints (recommended)

---

## 🐛 Troubleshooting

### "BarrierX login error"
- Verify `BARRIERX_API_KEY` is correct
- Check `BARRIERX_BASE_URL`
- In dev mode, automatically falls back to mock data

### "ElevenLabs API error"
- Check `ELEVENLABS_API_KEY`
- Verify agent IDs are correct
- Ensure phone number is valid

### "No owner phone number found"
- Owner phone missing from BarrierX API
- Default phone `+251914373107` is used as fallback

### "Database connection error"
- Verify `DATABASE_URL` in `.env`
- Check Neon database is running
- Run `npx prisma migrate deploy`

---

## 📖 Additional Documentation

- **[BarrierX Integration Guide](./BARRIERX_INTEGRATION.md)** - Comprehensive guide on hybrid authentication, token management, and API integration
- **[Bulk API Integration](./BULK_API_INTEGRATION.md)** - Modular architecture, data transformers, and performance optimization
- **[Webhooks Documentation](./webhooks/README.md)** - ElevenLabs webhook payload structure and storage

---

## 🚀 Deployment

### Environment Variables (Production)

Ensure all required variables are set:
- ✅ Database URL with SSL
- ✅ Strong JWT secret (min 32 characters)
- ✅ Production BarrierX API key
- ✅ Production ElevenLabs credentials
- ✅ `NODE_ENV=production`
- ✅ `USE_MOCK_BARRIERX=false`

### Build & Deploy

```bash
npm run build
npm start
```

Or deploy to platforms like:
- Render
- Railway
- Heroku
- AWS/GCP/Azure

---

## 📝 License

Proprietary - All rights reserved

---

## 👥 Support

For questions or issues, contact the development team.

**Built with ❤️ by the AgentX Team**
