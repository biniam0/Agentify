# AgentX - AI-Powered Sales Automation

> Intelligent meeting automation platform that triggers AI voice calls before and after sales meetings to keep your sales team prepared and accountable.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-404D59?style=flat)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 🎯 What is AgentX?

AgentX automates sales meeting follow-ups using AI voice calls:

- **📞 Pre-Meeting Calls (T-15 min)** - AI calls sales rep to review deal context, risks, and recommendations
- **📞 Post-Meeting Calls (T+5 min)** - AI calls to capture meeting outcomes, next steps, and action items
- **🤖 AI Voice Agents** - Natural conversations powered by ElevenLabs Conversational AI
- **📊 CRM Integration** - Syncs with BarrierX for real-time deal, contact, and meeting data
- **⚡ Automated Scheduling** - Runs every 3 minutes to trigger timely calls
- **🎨 Modern UI** - Beautiful Spotify-inspired interface built with React & Shadcn UI

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Vite + Shadcn UI
│   (Port 5173)   │  Modern, responsive dashboard
└────────┬────────┘
         │ REST API
         │
┌────────▼────────┐
│   Backend       │  Node.js + Express + TypeScript
│   (Port 4000)   │  JWT Auth + Scheduler + Webhooks
└────────┬────────┘
         │
    ┌────┴────┬────────────┬──────────────┐
    │         │            │              │
┌───▼───┐ ┌──▼──────┐ ┌───▼─────────┐ ┌──▼──────┐
│ Neon  │ │BarrierX │ │ ElevenLabs  │ │ Twilio  │
│  DB   │ │   API   │ │ Voice AI    │ │  Phone  │
└───────┘ └─────────┘ └─────────────┘ └─────────┘
```

---

## 📁 Project Structure

```
AgentX/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/             # Database & env config
│   │   ├── controllers/        # Request handlers
│   │   ├── middlewares/        # Auth & error handling
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   │   ├── barrierxService.ts         # BarrierX API integration
│   │   │   ├── meetingService.ts          # ElevenLabs calls
│   │   │   ├── schedulerService.ts        # Automated scheduler
│   │   │   └── barrierx/
│   │   │       ├── dataTransformers.ts    # Data format conversion
│   │   │       └── dummyDataGenerators.ts # Fallback data
│   │   └── utils/              # Helper functions
│   ├── prisma/                 # Database schema
│   ├── webhooks/               # Webhook payload storage
│   ├── BARRIERX_INTEGRATION.md     # Auth & API integration docs
│   ├── BULK_API_INTEGRATION.md     # Modular architecture docs
│   └── README.md               # Backend documentation
│
├── frontend/                   # React + Vite + Shadcn UI (not tracked in git)
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── lib/                # Utilities
│   │   ├── styles/             # Tailwind CSS
│   │   └── types/              # TypeScript types
│   └── README.md
│
├── SETUP.md                    # Step-by-step setup guide
└── README.md                   # This file
```

---

## 🚀 Quick Start

### 📋 Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech/) recommended)
- BarrierX API key
- ElevenLabs API key (optional for testing)

### ⚡ Installation

Follow the **[detailed setup guide](./SETUP.md)** or use this quick start:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd AgentX

# 2. Setup Backend
cd backend
npm install
cp .env.example .env  # Edit with your credentials
npm run prisma:generate
npm run prisma:migrate
npm run dev

# 3. Setup Frontend (in a new terminal)
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
npm run dev
```

**Access the app:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

**Demo Login:**
- Email: `tamiratkebede120@gmail.com`
- Password: any password

---

## 📚 Documentation

### Backend Documentation

- **[Backend README](./backend/README.md)** - Complete backend documentation
- **[BarrierX Integration](./backend/BARRIERX_INTEGRATION.md)** - Hybrid authentication & API integration guide
- **[Bulk API Integration](./backend/BULK_API_INTEGRATION.md)** - Modular architecture & data transformers
- **[Webhooks](./backend/webhooks/README.md)** - ElevenLabs webhook payload structure

### Key Concepts

**Hybrid Authentication:**
- AgentX JWT tokens (7-day validity) for fast app authentication
- BarrierX access tokens (1-hour validity) for CRM data access
- Automatic token refresh in background

**Automated Scheduler:**
- Runs every 3 minutes
- Batch fetches deals for all users (5x faster)
- Triggers pre-calls (T-15 min) and post-calls (T+5 min)
- Smart data handling with dummy fallbacks

**Modular Architecture:**
- `barrierxService.ts` - API orchestration
- `dataTransformers.ts` - Format conversion
- `dummyDataGenerators.ts` - Fallback data when API fields missing

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based auth with 7-day token validity
- BarrierX integration for CRM user management
- Protected routes with middleware
- Automatic token refresh

### 📅 Meeting Management
- Real-time meeting sync from BarrierX
- Deal context with contacts, risks, and recommendations
- Meeting status tracking (scheduled, in-progress, completed)
- Search and filter capabilities

### 📞 Automated Calls
- **Pre-Meeting (T-15 min)**: Prepares sales rep with deal context
- **Post-Meeting (T+5 min)**: Captures outcomes and next steps
- ElevenLabs AI agents with natural conversation
- Dynamic variables for personalized calls
- Manual trigger option via dashboard

### 🤖 AI Voice Agents
- Pre-call agent reviews risks and recommendations
- Post-call agent captures meeting summary and action items
- Server tools for CRM updates (create contacts, notes, deals)
- Transcript storage and analysis

### 📊 Smart Data Handling
- Real BarrierX API with automatic fallback
- Dummy data generation for missing fields
- Graceful error handling
- Mock mode for development

### 🎨 Modern UI
- Spotify-inspired design with OKLCH colors
- Responsive layout for all devices
- Dark/light mode toggle
- Real-time meeting cards with rich data
- Search and filter functionality

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: JWT (jsonwebtoken)
- **Scheduler**: node-cron
- **HTTP**: Axios

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Shadcn UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: Sonner

### External Services
- **BarrierX**: CRM data (deals, contacts, meetings)
- **ElevenLabs**: AI voice conversations
- **Twilio**: Phone call infrastructure (via ElevenLabs)

---

## 🧪 Development

### Environment Variables

**Backend (`.env`):**
```env
DATABASE_URL=postgresql://...
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key

# BarrierX
BARRIERX_BASE_URL=https://platform.barrierx.ai
BARRIERX_API_KEY=bx_live_YOUR_KEY
USE_MOCK_BARRIERX=false

# ElevenLabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_AGENT_ID_PRE=pre_agent_id
ELEVENLABS_AGENT_ID_POST=post_agent_id
ELEVENLABS_PHONE_NUMBER_ID=phone_id
ELEVENLABS_WEBHOOK_SECRET=webhook_secret
```

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Running in Mock Mode

For development without real API calls:

```env
USE_MOCK_BARRIERX=true
```

- Uses `mockUsers.json` for test data
- No rate limits or API costs
- Fast development cycle

### Scripts

```bash
# Backend
cd backend
npm run dev          # Development with hot reload
npm run build        # Build for production
npm start            # Run production build
npm run prisma:studio # Database GUI

# Frontend
cd frontend
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns AgentX JWT + BarrierX tokens)
- `POST /api/auth/refresh` - Refresh BarrierX access token

### Meetings (Protected)
- `GET /api/meetings` - Get user's meetings
- `POST /api/meetings/trigger/pre-call` - Trigger pre-meeting call
- `POST /api/meetings/trigger/post-call` - Trigger post-meeting call

### Webhooks
- `POST /api/webhook/elevenlabs` - ElevenLabs call completion
- `POST /api/webhook/create-contact` - Create contact from AI
- `POST /api/webhook/create-note` - Create note from AI
- `POST /api/webhook/create-meeting` - Schedule meeting from AI
- `POST /api/webhook/create-deal` - Create deal from AI

### Health
- `GET /health` - Server health check

---

## 🎯 Roadmap

- [ ] Real-time notifications for call completion
- [ ] Call transcript storage and search
- [ ] Analytics dashboard with call metrics
- [ ] Custom AI agent prompts per user
- [ ] Multi-tenant support
- [ ] Mobile app (React Native)
- [ ] Advanced scheduling rules
- [ ] Integration with more CRMs (Salesforce, HubSpot)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

Proprietary - All rights reserved

---

## 🙋 Support

For questions or issues:
- Check the [SETUP.md](./SETUP.md) guide
- Review [backend documentation](./backend/README.md)
- Contact the development team

---

**Built with ❤️ by the AgentX Team**

*Automating sales excellence, one call at a time.* 🚀


