"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";
import { UserStats, Achievement, PlayerAchievement } from "@/types";
import ShopModal from "@/components/ShopModal";
import UserProfile from "@/components/UserProfile";
import TutorialModal from "@/components/TutorialModal";
import { ShoppingBag, ArrowRight, Palette, LogIn, UserPlus, User, Trophy, Award, Calendar, Clock, Infinity } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { socket, isConnected, isAuthenticated, userId, username: authUsername, loginAsGuest, login, register, logout } = useSocket();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roomId, setRoomId] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [authMode, setAuthMode] = useState<"guest" | "login" | "register">("guest");
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'daily' | 'weekly' | 'all'>('all');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Achievements state
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    if (authUsername) setName(authUsername);

    const onUserStats = (stats: UserStats) => setUserStats(stats);
    const onReconnected = (state: any) => {
      toast.success("Reconnected to game!");
      router.push(`/game/${state.roomId}`);
    };
    const onLeaderboard = (data: UserStats[]) => setLeaderboard(data);
    const onAllAchievements = (data: Achievement[]) => setAchievements(data);
    const onAchievementsData = (data: PlayerAchievement[]) => setPlayerAchievements(data);

    socket.on('user_stats', onUserStats);
    socket.on('reconnected', onReconnected);
    socket.on('leaderboard_data', onLeaderboard);
    socket.on('all_achievements', onAllAchievements);
    socket.on('achievements_data', onAchievementsData);

    return () => {
      socket.off('user_stats', onUserStats);
      socket.off('reconnected', onReconnected);
      socket.off('leaderboard_data', onLeaderboard);
      socket.off('all_achievements', onAllAchievements);
      socket.off('achievements_data', onAchievementsData);
    };
  }, [socket, authUsername, router]);

  // Fetch stats when authenticated
  useEffect(() => {
    if (isAuthenticated && isConnected) {
      socket.emit('get_user_stats');
      socket.emit('get_all_achievements');
      socket.emit('get_achievements');
    }
  }, [isAuthenticated, isConnected, socket]);

  // Fetch leaderboard when timeframe changes
  useEffect(() => {
    if (isAuthenticated && isConnected && showLeaderboard) {
      socket.emit('get_leaderboard', leaderboardTimeframe);
    }
  }, [isAuthenticated, isConnected, socket, leaderboardTimeframe, showLeaderboard]);

  // Refresh stats periodically and on focus to keep them updated
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    const refreshStats = () => {
      socket.emit('get_user_stats');
    };

    // Refresh on window focus
    window.addEventListener('focus', refreshStats);
    
    // Refresh every 30 seconds while on home page
    const interval = setInterval(refreshStats, 30000);

    return () => {
      window.removeEventListener('focus', refreshStats);
      clearInterval(interval);
    };
  }, [isAuthenticated, isConnected, socket]);

  const handleAuth = () => {
    if (authMode === "guest") {
      if (!name.trim()) return toast.error("Enter a nickname!");
      loginAsGuest(name.trim());
    } else if (authMode === "login") {
      if (!email.trim() || !password.trim()) return toast.error("Enter email and password!");
      login(email.trim(), password.trim());
    } else {
      if (!name.trim() || !email.trim() || !password.trim()) return toast.error("Fill all fields!");
      if (password.length < 4) return toast.error("Password must be at least 4 characters!");
      register(name.trim(), email.trim(), password.trim());
    }
  };

  const handleCreateRoom = () => {
    if (!isAuthenticated) return toast.error("Please sign in first!");
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    socket.emit("join_room", newRoomId);
    router.push(`/lobby/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (!isAuthenticated) return toast.error("Please sign in first!");
    if (!roomId.trim()) return toast.error("Enter a Room ID!");
    socket.emit("join_room", roomId.toUpperCase());
    router.push(`/lobby/${roomId.toUpperCase()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950 pointer-events-none" />

      <div className="z-10 w-full max-w-md space-y-8">
        {/* Title */}
        <div className="space-y-2 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="inline-block p-4 rounded-full bg-white/5 mb-4 backdrop-blur-sm border border-white/10"
          >
            <Palette className="w-12 h-12 text-pink-500" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-white to-white/50">
            FAKE<span className="text-pink-500">ARTIST</span>
          </h1>
          <p className="text-neutral-400 font-medium tracking-wide">Deceive. Draw. Detect.</p>
        </div>

        {/* User Stats / Profile Summary */}
        <AnimatePresence>
          {userStats && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full flex justify-center"
            >
              <UserProfile stats={userStats} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Card */}
        <div className="glass-panel p-8 rounded-2xl space-y-6 bg-white/5 border border-white/10 backdrop-blur-md">
          {!isAuthenticated ? (
            /* AUTH FORMS */
            <div className="space-y-4">
              {/* Auth Mode Tabs */}
              <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                <button onClick={() => setAuthMode("guest")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${authMode === "guest" ? "bg-pink-500 text-white" : "text-white/50 hover:text-white/70"}`}>
                  <User className="w-3 h-3" /> Guest
                </button>
                <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${authMode === "login" ? "bg-purple-500 text-white" : "text-white/50 hover:text-white/70"}`}>
                  <LogIn className="w-3 h-3" /> Login
                </button>
                <button onClick={() => setAuthMode("register")} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${authMode === "register" ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white/70"}`}>
                  <UserPlus className="w-3 h-3" /> Register
                </button>
              </div>

              <AnimatePresence mode="wait">
                {authMode === "guest" && (
                  <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Input placeholder="Enter your artist name..." value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-900/50 border-neutral-800 text-center text-lg" maxLength={20} />
                  </motion.div>
                )}
                {authMode === "login" && (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900/50 border-neutral-800" />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900/50 border-neutral-800" />
                  </motion.div>
                )}
                {authMode === "register" && (
                  <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Input placeholder="Username" value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-900/50 border-neutral-800" maxLength={20} />
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900/50 border-neutral-800" />
                    <Input type="password" placeholder="Password (4+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900/50 border-neutral-800" />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button onClick={handleAuth} variant="gradient" className="w-full h-14 text-lg" disabled={authMode === "guest" ? !name.trim() : (!email.trim() || !password.trim())}>
                {authMode === "guest" ? "Play as Guest" : authMode === "login" ? "Sign In" : "Create Account"}
              </Button>

              {!isConnected && (
                <div className="text-center text-yellow-400/60 text-xs animate-pulse">Connecting to server...</div>
              )}
            </div>
          ) : (
            /* ROOM SELECTION (authenticated) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Playing as <span className="font-bold text-pink-400">{authUsername}</span>
                </span>
                <button onClick={logout} className="text-xs text-white/30 hover:text-white/60 transition">Sign Out</button>
              </div>

              <AnimatePresence mode="wait">
                {mode === "menu" ? (
                  <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3 pt-2">
                    <Button onClick={handleCreateRoom} variant="gradient" className="w-full h-14 text-lg">
                      Create Room
                    </Button>
                    <Button onClick={() => setMode("join")} variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5">
                      Join Existing Room
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 pt-2">
                    <Input placeholder="Room Code (e.g. ABCD)" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} maxLength={10} className="text-center tracking-[0.5em] font-mono text-lg uppercase bg-neutral-900/50 border-neutral-800" />
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="ghost" onClick={() => setMode("menu")} className="w-full">Back</Button>
                      <Button variant="gradient" onClick={handleJoinRoom} disabled={!roomId.trim()} className="w-full">
                        Join <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Shop Button */}
        {isAuthenticated && (
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setShopOpen(true)} className="gap-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10">
              <ShoppingBag className="w-4 h-4" />
              Shop
            </Button>
            <Button variant="ghost" onClick={() => { setShowLeaderboard(!showLeaderboard); if (!showLeaderboard) socket.emit('get_leaderboard', leaderboardTimeframe); }} className="gap-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Button>
            <Button variant="ghost" onClick={() => setShowAchievements(!showAchievements)} className="gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
              <Award className="w-4 h-4" />
              Achievements
            </Button>
          </div>
        )}

        {/* Leaderboard Panel */}
        <AnimatePresence>
          {showLeaderboard && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
                </h3>

                {/* Timeframe Tabs */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg mb-4">
                  {([
                    { value: 'daily' as const, label: 'Today', icon: Calendar },
                    { value: 'weekly' as const, label: 'This Week', icon: Clock },
                    { value: 'all' as const, label: 'All Time', icon: Infinity },
                  ]).map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setLeaderboardTimeframe(tab.value)}
                      className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                        leaderboardTimeframe === tab.value ? 'bg-yellow-500 text-black' : 'text-white/50 hover:text-white/70'
                      }`}
                    >
                      <tab.icon className="w-3 h-3" /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Leaderboard List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {leaderboard.length === 0 && (
                    <div className="text-center text-white/30 text-sm py-4">No data for this period</div>
                  )}
                  {leaderboard.map((entry, i) => (
                    <div key={entry.username} className={`flex items-center justify-between p-3 rounded-xl ${
                      i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                      i === 2 ? 'bg-orange-500/10 border border-orange-500/20' :
                      'bg-white/5'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold w-6 text-center">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </span>
                        <div>
                          <span className="font-medium text-sm">{entry.username}</span>
                          <span className="text-xs text-white/40 ml-2">Lvl {entry.level}</span>
                        </div>
                      </div>
                      <span className="font-bold text-yellow-400">{entry.wins} W</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievements Panel */}
        <AnimatePresence>
          {showAchievements && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Achievements
                  <span className="text-xs text-white/40 font-normal ml-auto">
                    {playerAchievements.length} / {achievements.length} unlocked
                  </span>
                </h3>

                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                  {achievements.map(achievement => {
                    const unlocked = playerAchievements.some(pa => pa.achievement_id === achievement.id);
                    return (
                      <div key={achievement.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        unlocked ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/5 opacity-50'
                      }`}>
                        <div className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>
                          {unlocked ? '🏆' : '🔒'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{achievement.name}</div>
                          <div className="text-xs text-white/40">{achievement.description}</div>
                        </div>
                        {unlocked && (
                          <span className="text-[10px] text-amber-400 font-medium shrink-0">UNLOCKED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ShopModal isOpen={shopOpen} onClose={() => setShopOpen(false)} userStats={userStats} />
      <TutorialModal />
    </main>
  );
}
