# AgentX Frontend

Modern React frontend for AgentX sales meeting automation platform.

## Features

- User authentication with JWT
- Meetings dashboard with real-time data
- Pre-meeting and post-meeting call triggers
- Responsive design with Tailwind CSS
- Protected routes and authentication flow
- Clean, modern UI with confirmation modals

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router v6
- Tailwind CSS
- Axios

## Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Backend server running on port 4000

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the frontend root directory:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Development

Run the development server:

```bash
npm run dev
```

The app will start on `http://localhost:5173`

### Production

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/               # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── LoginPage.tsx
│   │   ├── MeetingsPage.tsx
│   │   └── ProtectedRoute.tsx
│   ├── services/        # API services
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   └── meetingService.ts
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript types
│   ├── config/          # Configuration
│   ├── App.tsx          # Main app component
│   ├── router.tsx       # Route definitions
│   └── index.tsx        # Entry point
├── .env                 # Environment variables
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## Available Routes

- `/` - Redirects to `/meetings` if authenticated, else `/login`
- `/login` - User login page
- `/meetings` - Protected meetings dashboard

## Features & Usage

### Login

- Use your BarrierX credentials (email & password)
- Account will be automatically created on first login
- JWT token stored in localStorage
- Automatic redirect on successful login

### Meetings Dashboard

- View all your meetings in a table format
- See meeting details: title, date, deal, contact, status
- Trigger pre-meeting or post-meeting calls
- Confirmation modal before triggering calls
- Logout functionality

### Authentication Flow

- Token-based authentication using JWT
- Automatic token refresh on API calls
- Protected routes redirect to login if unauthenticated
- Auto-logout on 401 responses

## API Integration

The frontend communicates with the backend API:

- `POST /api/auth/login` - User login
- `GET /api/meetings` - Fetch meetings
- `POST /api/meetings/trigger/pre-call` - Trigger pre-meeting call
- `POST /api/meetings/trigger/post-call` - Trigger post-meeting call

## Styling

- Tailwind CSS for utility-first styling
- Custom color scheme with blue primary colors
- Responsive design for mobile and desktop
- Gradient backgrounds and modern shadows
- Animated loading states

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:4000/api)

## Development Notes

- Hot module replacement (HMR) enabled
- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Axios interceptors handle token injection and errors
- localStorage used for token and user persistence

