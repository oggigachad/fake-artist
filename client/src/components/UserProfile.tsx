import { UserStats } from '@/types';
import { Trophy, Flame, Coins, Star, Target, Paintbrush } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserProfileProps {
    stats: UserStats;
}

export default function UserProfile({ stats }: UserProfileProps) {
    const xpNeeded = 100 * Math.pow(stats.level, 1.5);
    const progress = Math.min(100, (stats.xp / xpNeeded) * 100);
    const gamesPlayed = stats.games_played ?? (stats.wins + stats.losses);
    const bestStreak = stats.best_streak ?? stats.win_streak;
    const correctGuesses = stats.correct_guesses ?? 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md w-full max-w-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-pink-500/20">
                    {stats.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-xl text-white">{stats.username}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono">Lvl {stats.level}</span>
                        <span>•</span>
                        <span className="text-yellow-400 flex items-center gap-1"><Coins className="w-3 h-3" /> {stats.coins}</span>
                    </div>
                </div>
            </div>

            {/* XP Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>XP Progress</span>
                    <span>{stats.xp} / {Math.floor(xpNeeded)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-linear-to-r from-blue-500 to-cyan-400"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <Trophy className="w-5 h-5 text-yellow-500 mb-1" />
                    <span className="text-lg font-bold text-white">{stats.wins}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Wins</span>
                </div>
                <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <Flame className="w-5 h-5 text-orange-500 mb-1" />
                    <span className="text-lg font-bold text-white">{bestStreak}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Best Streak</span>
                </div>
                <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <Star className="w-5 h-5 text-purple-500 mb-1" />
                    <span className="text-lg font-bold text-white">{gamesPlayed}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Games</span>
                </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-black/20 rounded-xl p-2 flex items-center justify-center gap-2 text-center">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <div>
                        <span className="text-sm font-bold text-white">{correctGuesses}</span>
                        <span className="text-[10px] text-white/40 ml-1">Correct Guesses</span>
                    </div>
                </div>
                <div className="bg-black/20 rounded-xl p-2 flex items-center justify-center gap-2 text-center">
                    <Paintbrush className="w-4 h-4 text-pink-500" />
                    <div>
                        <span className="text-sm font-bold text-white">{stats.total_strokes ?? 0}</span>
                        <span className="text-[10px] text-white/40 ml-1">Strokes</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
