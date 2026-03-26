# Fake Artist Game 🎨

A multiplayer drawing game where players must identify the fake artist among them!

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd fake-artist
   ```

2. **Install dependencies for both client and server**
   ```bash
   # Install server dependencies
   cd server
   npm install
   cd ..

   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   copy .env.example .env
   # Edit .env and update JWT_SECRET with a secure random string
   ```

### Running the Application

#### Option 1: Using the start script (Windows)
```bash
start.bat
```

#### Option 2: Manual start (two terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The game will be available at:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

## 🎮 How to Play

1. **Create or Join a Room**
   - Sign in as a guest or create an account
   - Create a new room or join with a room code

2. **Game Modes**
   - **Fake Artist (3+ players):** Everyone draws on the same canvas. Find the fake artist!
   - **Draw & Guess (2 players):** Take turns drawing and guessing words

3. **Earn Rewards**
   - Win games to earn coins and XP
   - Level up and unlock shop items
   - Buy custom brushes and colors

## 🛠️ Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Socket.io Client
- Framer Motion

### Backend
- Node.js
- Express
- Socket.io
- TypeScript
- Better-SQLite3
- JWT Authentication

## 📁 Project Structure

```
fake-artist/
├── client/          # Next.js frontend
│   ├── src/
│   │   ├── app/     # Pages and routes
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── package.json
├── server/          # Express backend
│   ├── index.ts     # Main server file
│   ├── db.ts        # Database operations
│   ├── economy.ts   # Rewards system
│   ├── shop.ts      # Shop items
│   ├── store.ts     # Room management
│   └── package.json
└── .env             # Environment variables
```

## 🔧 Development

### Server Development
```bash
cd server
npm run dev          # Start with nodemon (auto-reload)
npm run build        # Build TypeScript
npm start            # Start production build
```

### Client Development
```bash
cd client
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm start            # Start production server
```

## 🌟 Features

- **Real-time Multiplayer** with Socket.io
- **Persistent User Accounts** with JWT authentication
- **Economy System** with coins, XP, and leveling
- **Cosmetic Shop** with custom brushes and colors
- **Reconnection Support** - Rejoin games after disconnect
- **Game History & Leaderboards**
- **Responsive Design** - Works on desktop and mobile

## 🐛 Troubleshooting

### Port already in use
If ports 3000 or 3001 are in use:
- Change `PORT` in `.env`
- Update `NEXT_PUBLIC_SERVER_URL` in `client/.env.local`

### Database locked
- Close any other processes accessing `game.db`
- Delete `game.db-shm` and `game.db-wal` files

### Socket connection failed
- Ensure backend is running on port 3001
- Check CORS settings in `server/index.ts`
- Verify `NEXT_PUBLIC_SERVER_URL` in client

## 📝 License

MIT
