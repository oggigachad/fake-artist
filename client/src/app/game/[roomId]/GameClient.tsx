"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { Player, PlayerCanvas, PlayerScore, Stroke, ChatMessage, Reaction, Achievement, PlayerAchievement } from "@/types";
import CanvasBoard, { CanvasBoardHandle } from "@/components/CanvasBoard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Clock, AlertCircle, Send, Trophy, MessageSquare, X, Award } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { drawStroke } from "@/lib/canvas-utils";

interface GameClientProps {
    roomId: string;
}

const COLORS = ["#000000", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#ffffff"];

const REACTION_EMOJIS = ["👏", "😂", "🔥", "❤️", "😮", "💀", "🎨", "✨", "🤔", "👀", "💯", "🙈"];

export default function GameClient({ roomId }: GameClientProps) {
    const { socket, userId, isConnected, isReconnecting } = useSocket();
    const router = useRouter();
    const canvasBoardRef = useRef<CanvasBoardHandle>(null);

    const [role, setRole] = useState<string | null>(null);
    const [word, setWord] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [brushStyle, setBrushStyle] = useState<{ type: string, color?: string }>({ type: 'normal' });
    const [brushSize, setBrushSize] = useState(4);
    const [opacity, setOpacity] = useState(1);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [gamePhase, setGamePhase] = useState<'DRAWING' | 'REVEAL' | 'VOTING' | 'RESULT' | 'GUESSING'>('DRAWING');
    const [currentRound, setCurrentRound] = useState(1);
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [revealedCanvases, setRevealedCanvases] = useState<PlayerCanvas[]>([]);
    const [result, setResult] = useState<{
        fakeId: string;
        winner: string;
        word: string;
        fakeWord?: string;
    } | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voteProgress, setVoteProgress] = useState({ voted: 0, total: 0 });

    // 2-player / speed mode state
    const [gameMode, setGameMode] = useState<'fake-artist' | 'draw-guess' | 'speed-round' | 'team-mode'>('fake-artist');
    const [drawerId, setDrawerId] = useState<string | null>(null);
    const [guess, setGuess] = useState("");
    const [scores, setScores] = useState<PlayerScore[]>([]);
    const [liveStrokes, setLiveStrokes] = useState<Stroke[]>([]);
    const liveCanvasRef = useRef<HTMLCanvasElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [showChat, setShowChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Reactions state
    const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

    useEffect(() => {
        const savedRole = sessionStorage.getItem('game_role');
        const savedWord = sessionStorage.getItem('game_word');
        const savedMode = sessionStorage.getItem('game_mode');

        if (savedRole) setRole(savedRole);
        if (savedWord) setWord(savedWord);
        if (savedMode) setGameMode(savedMode as typeof gameMode);

        if (!socket.connected) {
            socket.connect();
        }
        socket.emit('get_inventory');

        // Re-join room on reconnect
        const onReconnect = () => {
            socket.emit('join_room', roomId);
            socket.emit('get_inventory');
            toast.success("Reconnected!", { icon: "🔄", duration: 2000 });
        };
        socket.on('connect', onReconnect);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            socket.off('connect', onReconnect);
        };
    }, [socket, roomId]);

    // Handle inventory for brush styles
    useEffect(() => {
        const onInventory = (items: any[]) => {
            const equippedBrush = items.find((i: any) => i.type === 'brush' && i.equipped);
            const equippedColor = items.find((i: any) => i.type === 'color' && i.equipped);

            const style: { type: string; color?: string } = { type: 'normal' };
            if (equippedBrush) {
                if (equippedBrush.item_id === 'brush_neon') style.type = 'neon';
                if (equippedBrush.item_id === 'brush_fire') style.type = 'fire';
                if (equippedBrush.item_id === 'brush_pixel') style.type = 'pixel';
            }
            if (equippedColor) {
                if (equippedColor.item_id === 'color_gold') style.color = '#FFD700';
                if (equippedColor.item_id === 'color_plasma') style.color = 'plasma';
                if (equippedColor.item_id === 'color_galaxy') style.color = 'galaxy';
            }
            setBrushStyle(style);
        };

        socket.on('inventory_data', onInventory);
        return () => { socket.off('inventory_data', onInventory); };
    }, [socket]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Sync client timer from absolute timerEndTime
    const startClientTimer = useCallback((timerEndTime: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
            setTimeRemaining(remaining);
            if (remaining <= 0 && timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    // Game event handlers
    useEffect(() => {
        const onPlayerJoined = (updatedPlayers: Player[]) => setPlayers(updatedPlayers);
        const onPlayerLeft = (updatedPlayers: Player[]) => setPlayers(updatedPlayers);

        const onRoundStarted = (roundNumber: number, timerEndTime: number) => {
            setCurrentRound(roundNumber);
            setGamePhase('DRAWING');
            setRevealedCanvases([]);
            setHasVoted(false);
            startClientTimer(timerEndTime);
            toast(`Round ${roundNumber} - Draw!`, { icon: "🎨", duration: 3000 });
        };

        const onTimerUpdate = (remainingSeconds: number) => {
            setTimeRemaining(remainingSeconds);
        };

        const onRevealCanvases = (canvases: PlayerCanvas[]) => {
            setGamePhase('REVEAL');
            setRevealedCanvases(canvases);
            toast("Revealing all drawings!", { icon: "👀", duration: 3000 });
        };

        const onVotingStarted = () => {
            setGamePhase('VOTING');
            setHasVoted(false);
            toast("Who is the Fake?", { icon: "🗳️", duration: 4000 });
        };

        const onVoteCast = (_voterId: string, votedCount: number, totalNeeded: number) => {
            setVoteProgress({ voted: votedCount, total: totalNeeded });
        };

        const onGameResult = (fakeId: string, winner: 'FAKE' | 'ARTISTS' | 'TIE', word: string, fakeWord: string) => {
            if (winner === 'TIE') {
                toast.error("TIE VOTE! One final round!", { icon: "⚖️", duration: 4000 });
                return;
            }

            setGamePhase('RESULT');
            setResult({ fakeId, winner, word, fakeWord });
            const fakeName = players.find(p => p.id === fakeId)?.name || 'Unknown';

            if (winner === 'ARTISTS') {
                toast.success(`Artists Win! Fake was ${fakeName}`, { duration: 5000 });
            } else {
                toast.error(`Fake Wins! It was ${fakeName}`, { duration: 5000 });
            }
        };

        // 2-player / speed-round draw events
        const onDrawPhaseStarted = (drawer: string, wordForMe: string, round: number, timerEnd: number) => {
            setDrawerId(drawer);
            setWord(wordForMe);
            setCurrentRound(round);
            setLiveStrokes([]);
            startClientTimer(timerEnd);

            if (drawer === userId) {
                setRole('DRAWER');
                setGamePhase('DRAWING');
            } else {
                setRole('GUESSER');
                setGamePhase('GUESSING');
            }
        };

        const onStrokeDrawn = (stroke: Stroke) => {
            setLiveStrokes(prev => [...prev, stroke]);
        };

        const onGuessResult = (correct: boolean, correctWord: string, points: number) => {
            if (correct) {
                toast.success(`Correct! "${correctWord}" (+${points} pts)`, { duration: 3000 });
            }
        };

        const onRoundScores = (updatedScores: PlayerScore[]) => {
            setScores(updatedScores);
        };

        const onGameOver = (winner: string, finalScores: PlayerScore[]) => {
            setGamePhase('RESULT');
            setScores(finalScores);
            setResult({ fakeId: '', winner, word: '', fakeWord: '' });
            toast.success(`${winner} wins!`, { duration: 5000 });
        };

        const onRewardEarned = (reward: { coins: number; xp: number; newLevel?: number }) => {
            socket.emit('get_user_stats');
            
            toast.custom((t) => (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-linear-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl p-4 shadow-2xl"
                >
                    <div className="text-xl mb-2">Rewards!</div>
                    <div className="text-sm">+{reward.coins} Coins | +{reward.xp} XP</div>
                    {reward.newLevel && <div className="text-xs mt-1">Level {reward.newLevel}!</div>}
                </motion.div>
            ), { duration: 4000 });
        };

        const onLowStrokesWarning = (playerName: string) => {
            toast(`${playerName} drew very few strokes!`, { icon: "⚠️" });
        };

        const onError = (msg: string) => {
            toast.error(msg);
        };

        const onGameEndedEarly = () => {
            toast.error("Game ended early due to lack of players.", { duration: 5000 });
            setTimeout(() => router.push('/'), 3000);
        };

        // Chat
        const onChatMessage = (msg: ChatMessage) => {
            setChatMessages(prev => [...prev.slice(-99), msg]);
        };

        // Reactions
        const onReactionReceived = (reaction: Reaction) => {
            const id = `${Date.now()}-${Math.random()}`;
            const x = 10 + Math.random() * 80; // random horizontal position %
            setFloatingReactions(prev => [...prev, { id, emoji: reaction.emoji, x }]);
            setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== id));
            }, 2000);
        };

        // Achievement unlock
        const onAchievementUnlocked = (achievement: Achievement) => {
            toast.custom(() => (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-linear-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl p-4 shadow-2xl flex items-center gap-3"
                >
                    <Award className="w-8 h-8" />
                    <div>
                        <div className="text-sm opacity-70">Achievement Unlocked!</div>
                        <div className="text-lg">{achievement.name}</div>
                        <div className="text-xs opacity-60">{achievement.description}</div>
                    </div>
                </motion.div>
            ), { duration: 5000 });
        };

        // Reconnection: server sends full room state
        const onReconnected = (roomState: { players: Player[]; gamePhase?: string; timeRemaining?: number }) => {
            if (roomState.players) setPlayers(roomState.players);
            toast.success("Reconnected to game!", { icon: "✅", duration: 2000 });
        };

        socket.on("player_joined", onPlayerJoined);
        socket.on("player_left", onPlayerLeft);
        socket.on("round_started", onRoundStarted);
        socket.on("timer_update", onTimerUpdate);
        socket.on("reveal_canvases", onRevealCanvases);
        socket.on("voting_started", onVotingStarted);
        socket.on("vote_cast", onVoteCast);
        socket.on("game_result", onGameResult);
        socket.on("draw_phase_started", onDrawPhaseStarted);
        socket.on("stroke_drawn" as any, onStrokeDrawn);
        socket.on("guess_result", onGuessResult);
        socket.on("round_scores", onRoundScores);
        socket.on("game_over", onGameOver);
        socket.on("reward_earned", onRewardEarned);
        socket.on("low_strokes_warning", onLowStrokesWarning);
        socket.on("error", onError);
        socket.on("game_ended_early", onGameEndedEarly);
        socket.on("chat_message", onChatMessage);
        socket.on("reaction_received", onReactionReceived);
        socket.on("achievement_unlocked", onAchievementUnlocked);
        socket.on("reconnected", onReconnected);

        return () => {
            socket.off("player_joined", onPlayerJoined);
            socket.off("player_left", onPlayerLeft);
            socket.off("round_started", onRoundStarted);
            socket.off("timer_update", onTimerUpdate);
            socket.off("reveal_canvases", onRevealCanvases);
            socket.off("voting_started", onVotingStarted);
            socket.off("vote_cast", onVoteCast);
            socket.off("game_result", onGameResult);
            socket.off("draw_phase_started", onDrawPhaseStarted);
            socket.off("stroke_drawn" as any, onStrokeDrawn);
            socket.off("guess_result", onGuessResult);
            socket.off("round_scores", onRoundScores);
            socket.off("game_over", onGameOver);
            socket.off("reward_earned", onRewardEarned);
            socket.off("low_strokes_warning", onLowStrokesWarning);
            socket.off("error", onError);
            socket.off("game_ended_early", onGameEndedEarly);
            socket.off("chat_message", onChatMessage);
            socket.off("reaction_received", onReactionReceived);
            socket.off("achievement_unlocked", onAchievementUnlocked);
            socket.off("reconnected", onReconnected);
        };
    }, [socket, players, userId, startClientTimer, router]);

    // Draw live strokes on canvas for guesser
    useEffect(() => {
        if (gamePhase !== 'GUESSING') return;
        const canvas = liveCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        liveStrokes.forEach(stroke => {
            drawStroke({
                ctx,
                start: { x: stroke.prevX, y: stroke.prevY },
                end: { x: stroke.x, y: stroke.y },
                color: stroke.color,
                brushType: stroke.brushType,
                brushSize: stroke.brushSize,
                opacity: stroke.opacity,
                tool: stroke.tool,
            });
        });
    }, [liveStrokes, gamePhase]);

    const handleVote = (suspectId: string) => {
        if (hasVoted) return;
        socket.emit('submit_vote', roomId, suspectId);
        setHasVoted(true);
        toast.success("Vote submitted!");
    };

    const handleGuess = () => {
        if (!guess.trim()) return;
        socket.emit('submit_guess', roomId, guess.trim());
        setGuess("");
    };

    const sendChat = () => {
        if (!chatInput.trim()) return;
        socket.emit('send_chat', roomId, chatInput.trim());
        setChatInput("");
    };

    const sendReaction = (emoji: string) => {
        socket.emit('send_reaction', roomId, emoji);
    };

    const leaveGame = () => {
        socket.emit('leave_room', roomId);
        sessionStorage.removeItem('game_role');
        sessionStorage.removeItem('game_word');
        sessionStorage.removeItem('game_mode');
        router.push('/');
    };

    // ====== Floating reactions overlay ======
    const ReactionsOverlay = () => (
        <AnimatePresence>
            {floatingReactions.map(r => (
                <motion.div
                    key={r.id}
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -200, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="fixed text-4xl pointer-events-none z-50"
                    style={{ bottom: '20%', left: `${r.x}%` }}
                >
                    {r.emoji}
                </motion.div>
            ))}
        </AnimatePresence>
    );

    // ====== Chat panel component ======
    const ChatPanel = () => (
        <AnimatePresence>
            {showChat && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="fixed right-0 top-14 sm:top-16 bottom-0 w-full sm:w-80 bg-neutral-900/95 backdrop-blur-md border-l border-white/10 z-30 flex flex-col"
                >
                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                        <h3 className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chat</h3>
                        <button onClick={() => setShowChat(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`${msg.playerId === userId ? 'text-right' : ''}`}>
                                <span className="text-white/40 text-xs">{msg.playerName}: </span>
                                <span className="text-white/90">{msg.message}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-white/10 flex gap-2">
                        <Input
                            placeholder="Type message..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                            className="flex-1 text-sm bg-neutral-800 border-neutral-700"
                            maxLength={200}
                        />
                        <Button onClick={sendChat} size="icon" variant="ghost"><Send className="w-4 h-4" /></Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    // ====== Reaction bar ======
    const ReactionBar = () => (
        <div className="flex gap-1 flex-wrap justify-center">
            {REACTION_EMOJIS.map(emoji => (
                <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform active:scale-90"
                    title={emoji}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );

    // ============= 2-PLAYER GUESSING PHASE =============
    if (gamePhase === 'GUESSING' && (gameMode === 'draw-guess' || gameMode === 'speed-round')) {
        return (
            <main className="flex flex-col h-screen h-[100dvh] bg-neutral-950 text-white overflow-hidden">
                <Toaster position="top-center" />
                <ReactionsOverlay />
                <ChatPanel />

                {/* Top Bar */}
                <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b border-white/10 bg-white/5 backdrop-blur-md z-20 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <h1 className="font-bold text-lg sm:text-xl tracking-tighter">
                            {gameMode === 'speed-round'
                                ? <>Speed<span className="text-amber-500">Round</span></>
                                : <>Draw<span className="text-emerald-500">&Guess</span></>
                            }
                        </h1>
                        <div className="bg-white/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-mono">R{currentRound}</div>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-emerald-400 hidden sm:block">Guess the drawing!</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowChat(!showChat)} className="p-2 text-white/50 hover:text-white touch-target">
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${timeRemaining <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-mono font-bold text-sm">{timeRemaining}s</span>
                        </div>
                    </div>
                </header>

                {/* Live Canvas (read-only) */}
                <div className="flex-1 relative p-4">
                    <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden">
                        <canvas ref={liveCanvasRef} className="block w-full h-full" />
                    </div>
                </div>

                {/* Guess Input + Reactions */}
                <footer className="p-3 sm:p-4 bg-neutral-900 border-t border-white/10 z-20 safe-bottom shrink-0">
                    <div className="flex gap-2 max-w-lg mx-auto">
                        <Input
                            placeholder="Type your guess..."
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                            className="flex-1 bg-neutral-800 border-neutral-700 text-base sm:text-lg"
                            maxLength={100}
                        />
                        <Button onClick={handleGuess} variant="gradient" disabled={!guess.trim()} className="touch-target">
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="mt-2 max-w-lg mx-auto hidden sm:block">
                        <ReactionBar />
                    </div>
                    {scores.length > 0 && (
                        <div className="flex justify-center gap-6 mt-3">
                            {scores.map(s => (
                                <div key={s.playerId} className="text-sm text-white/60">
                                    {s.playerName}: <span className="font-bold text-white">{s.score}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </footer>
            </main>
        );
    }

    // ============= VOTING PHASE =============
    if (gamePhase === 'VOTING') {
        return (
            <main className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-neutral-950 text-white p-4 space-y-6 sm:space-y-8">
                <Toaster position="top-center" />
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500 text-center">
                    Who is the Fake?
                </h1>

                {/* Vote progress */}
                {voteProgress.total > 0 && (
                    <div className="text-sm text-white/50">
                        Votes: {voteProgress.voted} / {voteProgress.total}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
                    {players.filter(p => p.connected).map(p => (
                        <motion.button
                            key={p.id}
                            whileHover={{ scale: hasVoted ? 1 : 1.05 }}
                            whileTap={{ scale: hasVoted ? 1 : 0.95 }}
                            onClick={() => handleVote(p.id)}
                            disabled={p.id === userId || hasVoted}
                            className={`p-6 rounded-2xl text-xl font-bold transition-all ${p.id === userId
                                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                    : hasVoted
                                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                        : 'bg-linear-to-br from-purple-600 to-pink-600 hover:shadow-2xl hover:shadow-purple-500/50'
                                }`}
                        >
                            {p.name}
                        </motion.button>
                    ))}
                </div>
                <div className="text-white/40 text-sm">{hasVoted ? 'Waiting for others...' : 'Tap to vote'}</div>
            </main>
        );
    }

    // ============= RESULT PHASE =============
    if (gamePhase === 'RESULT') {
        // 2-player mode results
        if (gameMode === 'draw-guess' && scores.length > 0) {
            const sorted = [...scores].sort((a, b) => b.score - a.score);
            return (
                <main className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-neutral-950 text-white p-4 space-y-6 sm:space-y-8">
                    <Toaster position="top-center" />
                    <motion.h1 initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl sm:text-5xl md:text-7xl font-black">
                        <Trophy className="inline w-10 h-10 sm:w-16 sm:h-16 text-yellow-400 mr-2 sm:mr-3" /> Game Over!
                    </motion.h1>

                    <div className="space-y-4 w-full max-w-md">
                        {sorted.map((s, i) => (
                            <motion.div
                                key={s.playerId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className={`flex items-center justify-between p-4 rounded-xl ${i === 0 ? 'bg-linear-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{i === 0 ? '🥇' : '🥈'}</span>
                                    <span className="font-bold text-lg">{s.playerName}</span>
                                </div>
                                <span className="text-2xl font-bold">{s.score}</span>
                            </motion.div>
                        ))}
                    </div>

                    <Button onClick={leaveGame} variant="gradient" size="lg" className="mt-8">
                        Back to Home
                    </Button>
                </main>
            );
        }

        // Fake Artist mode results
        if (result) {
            const fakeName = players.find(p => p.id === result.fakeId)?.name || "Unknown";
            return (
                <main className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-neutral-950 text-white p-4 space-y-6 sm:space-y-8">
                    <Toaster position="top-center" />
                    <motion.h1 initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl sm:text-5xl md:text-7xl font-black text-center">
                        {result.winner === 'ARTISTS' ? 'Artists Win!' : 'Fake Wins!'}
                    </motion.h1>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center space-y-4">
                        <div className="text-2xl text-white/70">
                            The Fake was: <span className="font-bold text-pink-500 text-3xl">{fakeName}</span>
                        </div>
                        <div className="text-2xl text-white/70">
                            Real Word: <span className="font-bold text-emerald-400 text-3xl">{result.word}</span>
                        </div>
                        {result.fakeWord && (
                            <div className="text-lg text-white/50">
                                Fake&apos;s Word: <span className="font-medium text-yellow-400">{result.fakeWord}</span>
                            </div>
                        )}
                    </motion.div>

                    <Button onClick={leaveGame} variant="gradient" size="lg" className="mt-8">
                        Back to Home
                    </Button>
                </main>
            );
        }
    }

    // ============= REVEAL PHASE =============
    if (gamePhase === 'REVEAL') {
        return (
            <main className="min-h-screen min-h-[100dvh] bg-neutral-950 text-white p-4 sm:p-8">
                <Toaster position="top-center" />
                <h1 className="text-2xl sm:text-4xl font-bold text-center mb-6 sm:mb-8">All Drawings Revealed!</h1>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 max-w-6xl mx-auto">
                    {revealedCanvases.map((playerCanvas, index) => (
                        <motion.div
                            key={playerCanvas.playerId}
                            initial={{ opacity: 0, rotateY: 90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            transition={{ delay: index * 0.3, duration: 0.6 }}
                            className="bg-white/10 rounded-xl p-4 border border-white/20"
                        >
                            <div className="text-center mb-2 font-bold">
                                {playerCanvas.playerName || 'Unknown'}
                            </div>
                            <div className="bg-white rounded-lg aspect-square relative overflow-hidden">
                                <RevealCanvas strokes={playerCanvas.strokes} />
                            </div>
                            <div className="text-xs text-white/40 text-center mt-2">
                                {playerCanvas.strokes.length} strokes
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="text-center mt-8 text-white/60">
                    Analyzing drawings...
                </div>
            </main>
        );
    }

    // ============= DRAWING PHASE (Default) =============
    const isDrawer = gameMode === 'draw-guess' || gameMode === 'speed-round' ? drawerId === userId : true;
    const isSpeedRound = gameMode === 'speed-round';
    const isTeamMode = gameMode === 'team-mode';

    return (
        <main className="flex flex-col h-screen h-[100dvh] bg-neutral-950 text-white overflow-hidden">
            <Toaster position="top-center" />
            <ReactionsOverlay />
            <ChatPanel />

            {/* Top Bar */}
            <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b border-white/10 bg-white/5 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <h1 className="font-bold text-base sm:text-xl tracking-tighter whitespace-nowrap">
                        {isSpeedRound
                            ? <>Speed<span className="text-amber-500">Round</span></>
                            : isTeamMode
                                ? <>Team<span className="text-cyan-500">Mode</span></>
                                : gameMode === 'draw-guess'
                                    ? <>Draw<span className="text-emerald-500">&Guess</span></>
                                    : <>Fake<span className="text-pink-500">Artist</span></>
                        }
                    </h1>
                    <div className="bg-white/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-mono">
                        R{currentRound}
                    </div>
                    {isTeamMode && (
                        <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs font-bold hidden sm:block">
                            Team {players.find(p => p.id === userId)?.team || '?'}
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center min-w-0 px-2">
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest">Word</span>
                    <span className="font-bold text-sm sm:text-lg text-emerald-400 truncate max-w-[100px] sm:max-w-none">
                        {word || "???"}
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                    <button onClick={() => setShowChat(!showChat)} className="p-2 text-white/50 hover:text-white transition touch-target relative">
                        <MessageSquare className="w-5 h-5" />
                        {chatMessages.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
                        )}
                    </button>

                    <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${timeRemaining <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm">{timeRemaining}s</span>
                    </div>

                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                        {role === 'FAKE' ? '🕵️ Fake' : role === 'DRAWER' ? '✏️ Drawing' : '🎨 Artist'}
                    </span>
                </div>
            </header>

            {/* Main Canvas Area */}
            <div className="flex-1 relative p-2 sm:p-4 min-h-0">
                <CanvasBoard
                    ref={canvasBoardRef}
                    roomId={roomId}
                    isMyTurn={isDrawer}
                    color={selectedColor}
                    brushStyle={brushStyle}
                    brushSize={brushSize}
                    opacity={opacity}
                    tool={tool}
                    onBrushSizeChange={setBrushSize}
                    onOpacityChange={setOpacity}
                    onToolChange={setTool}
                />

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-2xl border border-white/20 z-10 text-sm sm:text-base ${
                        isSpeedRound ? 'bg-linear-to-r from-amber-600 to-red-600' : 'bg-linear-to-r from-purple-600 to-pink-600'
                    }`}
                >
                    <div className="text-center font-bold">
                        {isSpeedRound ? '⚡ SPEED ROUND! Draw fast!' : gameMode === 'draw-guess' ? 'Draw the word!' : 'Everyone draws NOW!'} ✏️
                    </div>
                </motion.div>

                {/* Scores overlay */}
                {scores.length > 0 && (
                    <div className="absolute top-8 right-8 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10 space-y-1">
                        {scores.map(s => (
                            <div key={s.playerId} className="text-sm">
                                {s.playerName}: <span className="font-bold">{s.score}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Team mode player indicators */}
                {isTeamMode && (
                    <div className="absolute top-8 left-8 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10 space-y-1">
                        <div className="text-xs text-white/50 uppercase font-bold mb-1">Teams</div>
                        {players.filter(p => p.connected).map(p => (
                            <div key={p.id} className="text-xs flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${p.team === 1 ? 'bg-blue-500' : 'bg-red-500'}`} />
                                <span className={p.id === userId ? 'font-bold' : ''}>{p.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            {isDrawer && (
                <footer className="shrink-0 flex items-center justify-center gap-2 sm:gap-4 p-2 sm:p-4 bg-neutral-900 border-t border-white/10 z-20 safe-bottom">
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10 gap-0.5 sm:gap-1 overflow-x-auto max-w-[60vw] sm:max-w-none color-scroll">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { setSelectedColor(c); setTool('brush'); }}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all shrink-0 touch-target ${selectedColor === c && tool === 'brush' ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(255,255,255,0.3)' : undefined }}
                            />
                        ))}
                    </div>
                    <div className="border-l border-white/20 h-8 hidden sm:block" />
                    <div className="hidden sm:block">
                        <ReactionBar />
                    </div>
                </footer>
            )}

            {/* Non-drawer footer with reactions */}
            {!isDrawer && (
                <footer className="shrink-0 flex items-center justify-center gap-2 p-2 sm:p-4 bg-neutral-900 border-t border-white/10 z-20 safe-bottom">
                    <ReactionBar />
                </footer>
            )}
        </main>
    );
}

// Mini canvas for revealed drawings
function RevealCanvas({ strokes }: { strokes: Stroke[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        strokes.forEach(stroke => {
            drawStroke({
                ctx,
                start: { x: stroke.prevX, y: stroke.prevY },
                end: { x: stroke.x, y: stroke.y },
                color: stroke.color,
                brushType: stroke.brushType,
                brushSize: stroke.brushSize,
                opacity: stroke.opacity,
                tool: stroke.tool,
            });
        });
    }, [strokes]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
}
