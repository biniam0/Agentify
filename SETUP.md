# AgentX Setup Guide

Complete step-by-step guide to set up and run the AgentX application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **PostgreSQL Database** - Neon (recommended) or local PostgreSQL
- **Git** - [Download here](https://git-scm.com/)

## Step 1: Database Setup (Neon PostgreSQL)

### Option A: Using Neon (Recommended)

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up or log in
3. Create a new project
4. Copy the connection string (it should look like):
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Option B: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:
   ```bash
   createdb agentx
   ```
3. Your connection string will be:
   ```
   postgresql://postgres:password@localhost:5432/agentx
   ```

## Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   
   Create a `.env` file in the `backend` directory:
   ```bash
   # On Windows:
   copy .env.example .env
   
   # On Mac/Linux:
   cp .env.example .env
   ```

4. **Edit the `.env` file:**
   
   Open `backend/.env` and update with your database URL:
   ```env
   DATABASE_URL="your-neon-connection-string-here"
   PORT=4000
   NODE_ENV=development
   BARRIERX_BASE_URL="https://dummy-barrierx-api.com"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ELEVENLABS_WEBHOOK_SECRET="dummy-secret"
   ```

5. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

6. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```
   
   When prompted for a migration name, enter: `init`

7. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   ✅ Database connected successfully
   🚀 Server running on port 4000
   ```

8. **Test the backend:**
   
   Open a browser and go to: `http://localhost:4000/health`
   
   You should see: `{"status":"ok","timestamp":"..."}`

## Step 3: Frontend Setup

1. **Open a NEW terminal** (keep backend running)

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create environment file:**
   
   Create a `.env` file in the `frontend` directory:
   ```bash
   # On Windows:
   echo VITE_API_BASE_URL=http://localhost:4000/api > .env
   
   # On Mac/Linux:
   echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
   ```

5. **Start the frontend server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

## Step 4: Test the Application

1. **Open your browser** and go to: `http://localhost:5173`

2. **Login with your BarrierX credentials:**
   - **Email:** Your BarrierX account email
   - **Password:** Your BarrierX account password
   - Your AgentX account will be automatically created on first login

3. **Explore the dashboard:**
   - You should see a list of meetings
   - Try clicking "Pre-Call" or "Post-Call" buttons
   - Confirm the action in the modal
   - Check the success message

## Troubleshooting

### Backend Issues

**Issue: Database connection failed**
- Verify your `DATABASE_URL` is correct in `backend/.env`
- Ensure your database is running
- Check if you can connect to Neon from your location

**Issue: Port 4000 already in use**
- Change `PORT=4000` to another port in `backend/.env` (e.g., `PORT=4001`)
- Update frontend `.env` to match: `VITE_API_BASE_URL=http://localhost:4001/api`

**Issue: Prisma migration failed**
- Delete `prisma/migrations` folder
- Run `npm run prisma:migrate` again

### Frontend Issues

**Issue: Cannot connect to backend**
- Ensure backend is running on `http://localhost:4000`
- Check `frontend/.env` has correct `VITE_API_BASE_URL`
- Check browser console for CORS errors

**Issue: Port 5173 already in use**
- Vite will automatically use next available port (5174, 5175, etc.)
- Check terminal output for the actual port

**Issue: Blank page or errors**
- Open browser DevTools (F12)
- Check Console tab for errors
- Ensure all dependencies are installed: `npm install`

## Optional: Prisma Studio

View and edit your database with Prisma's GUI:

```bash
cd backend
npm run prisma:studio
```

This opens a browser interface at `http://localhost:5555`

## Optional: Build for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## Project Status Check

After setup, you should have:

- ✅ Backend running on `http://localhost:4000`
- ✅ Frontend running on `http://localhost:5173`
- ✅ Database connected and migrated
- ✅ Can login with BarrierX credentials
- ✅ Can view meetings dashboard
- ✅ Can trigger pre/post calls

## Next Steps

1. **Customize the application:**
   - Add your own user data
   - Modify the UI/styling
   - Integrate real ElevenLabs API

2. **Explore the code:**
   - Backend: `backend/src/`
   - Frontend: `frontend/src/`
   - Read the README files in each directory

3. **Deploy to production:**
   - Backend: Vercel, Railway, Render, or AWS
   - Frontend: Vercel, Netlify, or Cloudflare Pages
   - Database: Already on Neon!

## Support

If you encounter any issues:

1. Check the console logs (both backend and frontend terminals)
2. Review the README.md files
3. Check browser DevTools console (F12)
4. Verify all environment variables are set correctly

## Quick Reference

### Start Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Stop Servers
- Press `Ctrl + C` in each terminal

### Reset Database
```bash
cd backend
npx prisma migrate reset
```

### View Database
```bash
cd backend
npm run prisma:studio
```

---

**Congratulations! 🎉 Your AgentX application is now running!**

