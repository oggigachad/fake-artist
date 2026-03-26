"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { Player, GameConfig } from "@/types";
import { Button } from "@/components/ui/Button";
import { Users, Play, Copy, Palette, Clock, Layers, Zap, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface LobbyClientProps {
    roomId: string;
    initialName: string;
}

const WORD_PACKS = [
    { value: 'mixed', label: 'Mixed (All)' },
    { value: 'animals', label: '🐾 Animals' },
    { value: 'food', label: '🍕 Food' },
    { value: 'objects', label: '📦 Objects' },
    { value: 'actions', label: '🏃 Actions' },
    { value: 'places', label: '🌍 Places' },
    { value: 'movies', label: '🎬 Movies' },
    { value: 'tech', label: '💻 Tech' },
    { value: 'music', label: '🎵 Music' },
];

export default function LobbyClient({ roomId, initialName }: LobbyClientProps) {
    const { socket, isConnected, isAuthenticated, userId } = useSocket();
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [showConfig, setShowConfig] = useState(false);
    const [gameConfig, setGameConfig] = useState<GameConfig>({
        drawingTime: 60,
        totalRounds: 2,
        minStrokes: 5,
        gameMode: 'fake-artist',
        difficulty: 'easy',
        maxPlayers: 8,
        wordPack: 'mixed',
    });

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        // Join room once authenticated and request updated stats
        const joinRoom = () => {
            if (isAuthenticated) {
                socket.emit("join_room", roomId);
                socket.emit('get_user_stats'); // Refresh stats when entering lobby
            }
        };

        if (isAuthenticated && socket.connected) {
            joinRoom();
        }

        function onPlayerJoined(updatedPlayers: Player[]) {
            setPlayers(updatedPlayers);
        }

        function onRoleAssigned(role: string, word: string) {
            // Store only role + word in sessionStorage for the game page
            // Word is already server-filtered (fake gets fakeWord, not realWord)
            sessionStorage.setItem('game_role', role);
            sessionStorage.setItem('game_word', word);

            toast.success("Game Starting!", { icon: "🎨", duration: 2000 });
            // Dismiss all toasts before navigation to prevent persistence
            setTimeout(() => {
                toast.dismiss();
                router.push(`/game/${roomId}`);
            }, 500);
        }

        function onDrawPhaseStarted(drawerId: string, word: string, round: number, timerEnd: number) {
            // Multi-player draw modes: go directly to game page
            sessionStorage.setItem('game_role', drawerId === userId ? 'DRAWER' : 'GUESSER');
            sessionStorage.setItem('game_word', word);
            sessionStorage.setItem('game_mode', gameConfig.gameMode === 'speed-round' ? 'speed-round' : 'draw-guess');
            toast.success("Game Starting!", { icon: "🎯", duration: 2000 });
            setTimeout(() => {
                toast.dismiss();
                router.push(`/game/${roomId}`);
            }, 500);
        }

        function onRoomConfigUpdated(config: GameConfig) {
            setGameConfig(config);
        }

        function onPlayerLeft(updatedPlayers: Player[], leftId: string) {
            setPlayers(updatedPlayers);
            const leftPlayer = players.find(p => p.id === leftId);
            if (leftPlayer) toast(`${leftPlayer.name} left the room`, { icon: "👋" });
        }

        function onNewHost(hostId: string) {
            if (hostId === userId) {
                toast.success("You are now the host!", { icon: "👑" });
            }
        }

        function onError(msg: string) {
            toast.error(msg);
        }

        socket.on("player_joined", onPlayerJoined);
        socket.on("role_assigned", onRoleAssigned);
        socket.on("draw_phase_started", onDrawPhaseStarted);
        socket.on("room_config_updated", onRoomConfigUpdated);
        socket.on("player_left", onPlayerLeft);
        socket.on("new_host", onNewHost);
        socket.on("error", onError);

        return () => {
            socket.off("player_joined", onPlayerJoined);
            socket.off("role_assigned", onRoleAssigned);
            socket.off("draw_phase_started", onDrawPhaseStarted);
            socket.off("room_config_updated", onRoomConfigUpdated);
            socket.off("player_left", onPlayerLeft);
            socket.off("new_host", onNewHost);
            socket.off("error", onError);
        };
    }, [socket, roomId, router, isAuthenticated, userId]); // Removed 'players' dependency to prevent churning

    const copyRoomLink = () => {
        navigator.clipboard.writeText(roomId);
        toast.success("Room Code copied!");
    };

    // Host is first player in the list (assigned by server)
    const isHost = players.length > 0 && players[0]?.id === userId;

    const connectedPlayers = players.filter(p => p.connected);
    const getMinPlayers = () => {
        switch (gameConfig.gameMode) {
            case 'draw-guess': return 2;
            case 'speed-round': return 2;
            case 'team-mode': return 4;
            default: return 3; // fake-artist
        }
    };
    const minPlayers = getMinPlayers();
    const canStart = gameConfig.gameMode === 'draw-guess'
        ? connectedPlayers.length === 2
        : connectedPlayers.length >= minPlayers;

    const startGame = () => {
        if (!canStart) {
            const needed = gameConfig.gameMode === 'draw-guess' ? 'exactly 2'
                : gameConfig.gameMode === 'team-mode' ? 'at least 4'
                : gameConfig.gameMode === 'speed-round' ? 'at least 2'
                : 'at least 3';
            toast.error(`Need ${needed} players for this mode!`);
            return;
        }

        if (isHost) {
            socket.emit("configure_game", roomId, gameConfig);
            setTimeout(() => {
                socket.emit("start_game", roomId);
            }, 100);
        } else {
            socket.emit("start_game", roomId);
        }
    };

    const leaveRoom = () => {
        socket.emit("leave_room", roomId);
        router.push('/');
    };

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-white/50 animate-pulse">Authenticating...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen min-h-[100dvh] p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

            <div className="w-full max-w-2xl space-y-6 sm:space-y-8 z-10">
                <div className="text-center space-y-2">
                    <h2 className="text-white/60 uppercase tracking-widest text-xs sm:text-sm font-semibold">Lobby</h2>
                    <h1 className="text-2xl sm:text-4xl font-bold flex items-center justify-center gap-2 sm:gap-3">
                        Room: <span className="font-mono text-purple-400">{roomId}</span>
                        <Button size="icon" variant="ghost" onClick={copyRoomLink}>
                            <Copy className="w-5 h-5" />
                        </Button>
                    </h1>
                </div>

                <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 min-h-[350px] sm:min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-medium flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" /> Players ({connectedPlayers.length}/{gameConfig.maxPlayers})
                        </h3>
                        <button onClick={leaveRoom} className="text-xs text-white/30 hover:text-red-400 transition">Leave Room</button>
                    </div>

                    <div className="flex-1 space-y-3">
                        {players.length === 0 && (
                            <div className="text-center text-white/30 py-10 animate-pulse">Connecting to server...</div>
                        )}
                        {players.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 ${!p.connected ? 'opacity-40' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="font-medium text-lg flex items-center gap-2">
                                    {p.name}
                                    {p.id === userId && <span className="text-white/40 text-sm">(You)</span>}
                                    {i === 0 && <span className="text-yellow-400 text-xs">HOST</span>}
                                    {!p.connected && <span className="text-red-400 text-xs">Disconnected</span>}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/10 mt-4 space-y-4">
                        {/* Game Configuration (Host Only) */}
                        {isHost && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowConfig(!showConfig)}
                                    className="w-full text-sm text-white/60 hover:text-white/90 flex items-center justify-center gap-2 mb-3"
                                >
                                    <Palette className="w-4 h-4" />
                                    {showConfig ? 'Hide' : 'Show'} Game Settings
                                </button>

                                {showConfig && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10"
                                    >
                                        {/* Game Mode Selection */}
                                        <div>
                                            <label className="text-xs text-white/60 flex items-center gap-2 mb-2">
                                                <Users className="w-4 h-4" /> Game Mode
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setGameConfig({ ...gameConfig, gameMode: 'fake-artist', totalRounds: 2 })}
                                                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.gameMode === 'fake-artist'
                                                            ? 'bg-pink-500 text-white'
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    🎨 Fake Artist<br />
                                                    <span className="text-xs opacity-60">(3+ players)</span>
                                                </button>
                                                <button
                                                    onClick={() => setGameConfig({ ...gameConfig, gameMode: 'draw-guess', totalRounds: 5 })}
                                                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.gameMode === 'draw-guess'
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    🎯 Draw & Guess<br />
                                                    <span className="text-xs opacity-60">(2 players)</span>
                                                </button>
                                                <button
                                                    onClick={() => setGameConfig({ ...gameConfig, gameMode: 'speed-round', totalRounds: 8, drawingTime: 15 as any })}
                                                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.gameMode === 'speed-round'
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    ⚡ Speed Round<br />
                                                    <span className="text-xs opacity-60">(2+ players, 15s)</span>
                                                </button>
                                                <button
                                                    onClick={() => setGameConfig({ ...gameConfig, gameMode: 'team-mode', totalRounds: 2 })}
                                                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.gameMode === 'team-mode'
                                                            ? 'bg-cyan-500 text-white'
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    👥 Team Mode<br />
                                                    <span className="text-xs opacity-60">(4+ players, 2v2+)</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Difficulty Selection */}
                                        {gameConfig.gameMode === 'fake-artist' && (
                                            <div>
                                                <label className="text-xs text-white/60 flex items-center gap-2 mb-2">
                                                    <Zap className="w-4 h-4" /> Difficulty
                                                </label>
                                                <div className="flex gap-2">
                                                    {(['easy', 'medium', 'hard'] as const).map(diff => (
                                                        <button
                                                            key={diff}
                                                            onClick={() => setGameConfig({ ...gameConfig, difficulty: diff })}
                                                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${gameConfig.difficulty === diff
                                                                    ? diff === 'easy' ? 'bg-green-500 text-white'
                                                                        : diff === 'medium' ? 'bg-yellow-500 text-white'
                                                                            : 'bg-red-500 text-white'
                                                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {diff}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {gameConfig.gameMode === 'fake-artist' && (
                                            <>
                                                {/* Drawing Time */}
                                                <div>
                                                    <label className="text-xs text-white/60 flex items-center gap-2 mb-2">
                                                        <Clock className="w-4 h-4" /> Drawing Time per Round
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {[30, 60, 90].map(time => (
                                                            <button
                                                                key={time}
                                                                onClick={() => setGameConfig({ ...gameConfig, drawingTime: time as 30 | 60 | 90 })}
                                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.drawingTime === time
                                                                        ? 'bg-purple-500 text-white'
                                                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {time}s
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Number of Rounds */}
                                                <div>
                                                    <label className="text-xs text-white/60 flex items-center gap-2 mb-2">
                                                        <Layers className="w-4 h-4" /> Number of Rounds
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3].map(rounds => (
                                                            <button
                                                                key={rounds}
                                                                onClick={() => setGameConfig({ ...gameConfig, totalRounds: rounds })}
                                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${gameConfig.totalRounds === rounds
                                                                        ? 'bg-indigo-500 text-white'
                                                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {rounds} {rounds === 1 ? 'Round' : 'Rounds'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="text-xs text-white/40 text-center pt-2">
                                                    {gameConfig.drawingTime * gameConfig.totalRounds}s total drawing time
                                                </div>
                                            </>
                                        )}

                                        {gameConfig.gameMode === 'draw-guess' && (
                                            <div className="text-xs text-white/40 text-center py-2">
                                                5 rounds - Take turns drawing & guessing<br />
                                                Faster guess = More points!
                                            </div>
                                        )}

                                        {gameConfig.gameMode === 'speed-round' && (
                                            <div className="text-xs text-white/40 text-center py-2">
                                                ⚡ 15 seconds per round - Simple words<br />
                                                Faster correct guess = More points!
                                            </div>
                                        )}

                                        {gameConfig.gameMode === 'team-mode' && (
                                            <div className="text-xs text-white/40 text-center py-2">
                                                👥 Players split into 2 teams<br />
                                                Each team has a fake artist to find!
                                            </div>
                                        )}

                                        {/* Word Pack Selection (for fake-artist and team-mode) */}
                                        {(gameConfig.gameMode === 'fake-artist' || gameConfig.gameMode === 'team-mode') && (
                                            <div>
                                                <label className="text-xs text-white/60 flex items-center gap-2 mb-2">
                                                    <BookOpen className="w-4 h-4" /> Word Pack
                                                </label>
                                                <select
                                                    value={gameConfig.wordPack || 'mixed'}
                                                    onChange={(e) => setGameConfig({ ...gameConfig, wordPack: e.target.value as GameConfig['wordPack'] })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-purple-500"
                                                >
                                                    {WORD_PACKS.map(wp => (
                                                        <option key={wp.value} value={wp.value} className="bg-neutral-900">{wp.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={startGame}
                            variant="gradient"
                            size="lg"
                            className="w-full text-lg h-16 font-bold tracking-wide shadow-xl shadow-purple-500/20"
                            disabled={!canStart || !isHost}
                        >
                            <Play className="mr-2 w-5 h-5 fill-current" />
                            {isHost ? 'START GAME' : 'Waiting for host...'}
                        </Button>
                        <p className="text-center text-white/30 text-xs mt-3">
                            {gameConfig.gameMode === 'draw-guess'
                                ? 'Need exactly 2 players'
                                : gameConfig.gameMode === 'team-mode'
                                    ? 'Need 4+ players for teams'
                                    : gameConfig.gameMode === 'speed-round'
                                        ? 'Need 2+ players'
                                        : 'Need 3+ players to start'}
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
