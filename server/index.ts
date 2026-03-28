import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { ClientToServerEvents, ServerToClientEvents, Player, GameConfig, PlayerCanvas, Stroke, Room, ChatMessage, Achievement } from './types';
import { createRoom, getRoom, rooms, deleteRoom, cleanupStaleRooms } from './store';
import { verifyToken, registerUser, loginUser, loginAsGuest, getUser, createUser, sanitizeName, recordGame, recordParticipant, getLeaderboard, getPlayerHistory, getPlayerAchievements, unlockAchievement } from './db';
import { calculateRewards } from './economy';
import { getWordPair, getDrawGuessWord, getSoloDrawing, getSpeedRoundWord } from './words';
import { getShopItems, buyItem, getInventory, equipItem, playerOwnsBrush } from './shop';

const app = express();
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003'
    ],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3001;

// ===================== RATE LIMITING =====================
const rateLimiters = {
    strokes: new Map<string, number[]>(),    // userId -> timestamps
    events: new Map<string, number[]>(),     // userId -> timestamps
    guesses: new Map<string, number[]>(),    // userId -> timestamps
};

const RATE_LIMITS = {
    STROKES_PER_SECOND: 60,
    MAX_STROKES_PER_ROUND: 500,
    EVENTS_PER_SECOND: 10,
    GUESSES_PER_SECOND: 3,
    CANVAS_MAX_COORD: 2000,  // reasonable max canvas dimension
};

function checkRateLimit(map: Map<string, number[]>, userId: string, maxPerSecond: number): boolean {
    const now = Date.now();
    const timestamps = map.get(userId) || [];
    const recent = timestamps.filter(t => now - t < 1000);
    if (recent.length >= maxPerSecond) return false;
    recent.push(now);
    map.set(userId, recent);
    return true;
}

// ===================== TIMERS =====================
const roomTimers: Map<string, NodeJS.Timeout> = new Map();

// Maps socketId -> persistent userId
const socketToUser: Map<string, { userId: string; username: string }> = new Map();
// Maps persistent userId -> socketId (for reconnection)
const userToSocket: Map<string, string> = new Map();

// Reconnection grace period (30 seconds)
const RECONNECT_GRACE_MS = 30000;

// ===================== ROOM CLEANUP =====================
// Clean up stale rooms every 5 minutes
setInterval(() => {
    const cleaned = cleanupStaleRooms(roomTimers);
    if (cleaned > 0) console.log(`Cleaned up ${cleaned} stale rooms`);
}, 5 * 60 * 1000);

// Clean up old rate limiter entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, map] of Object.entries(rateLimiters)) {
        (map as Map<string, number[]>).forEach((timestamps, userId) => {
            const recent = timestamps.filter(t => now - t < 5000);
            if (recent.length === 0) (map as Map<string, number[]>).delete(userId);
            else (map as Map<string, number[]>).set(userId, recent);
        });
    }
}, 60 * 1000);

// ===================== HELPER: getUserId from socket =====================
function getUserId(socket: Socket): string | null {
    return socketToUser.get(socket.id)?.userId || null;
}

function getUsername(socket: Socket): string {
    return socketToUser.get(socket.id)?.username || 'Unknown';
}

// ===================== ACHIEVEMENTS SYSTEM =====================
const ALL_ACHIEVEMENTS: Achievement[] = [
    { id: 'first_win', name: 'First Victory', description: 'Win your first game', icon: '🏆', requirement: 1, type: 'wins' },
    { id: 'wins_10', name: 'Rising Star', description: 'Win 10 games', icon: '⭐', requirement: 10, type: 'wins' },
    { id: 'wins_50', name: 'Champion', description: 'Win 50 games', icon: '👑', requirement: 50, type: 'wins' },
    { id: 'wins_100', name: 'Legend', description: 'Win 100 games', icon: '🏅', requirement: 100, type: 'wins' },
    { id: 'games_10', name: 'Regular', description: 'Play 10 games', icon: '🎮', requirement: 10, type: 'games' },
    { id: 'games_50', name: 'Veteran', description: 'Play 50 games', icon: '🎯', requirement: 50, type: 'games' },
    { id: 'games_100', name: 'Addict', description: 'Play 100 games', icon: '🔥', requirement: 100, type: 'games' },
    { id: 'streak_3', name: 'On Fire', description: 'Get a 3 win streak', icon: '🔥', requirement: 3, type: 'streak' },
    { id: 'streak_5', name: 'Unstoppable', description: 'Get a 5 win streak', icon: '💪', requirement: 5, type: 'streak' },
    { id: 'streak_10', name: 'Godlike', description: 'Get a 10 win streak', icon: '⚡', requirement: 10, type: 'streak' },
    { id: 'coins_1000', name: 'Wealthy', description: 'Earn 1,000 total coins', icon: '💰', requirement: 1000, type: 'coins' },
    { id: 'coins_5000', name: 'Rich', description: 'Earn 5,000 total coins', icon: '💎', requirement: 5000, type: 'coins' },
    { id: 'level_5', name: 'Leveling Up', description: 'Reach level 5', icon: '📈', requirement: 5, type: 'level' },
    { id: 'level_10', name: 'Experienced', description: 'Reach level 10', icon: '🌟', requirement: 10, type: 'level' },
    { id: 'level_25', name: 'Master', description: 'Reach level 25', icon: '💫', requirement: 25, type: 'level' },
    { id: 'fake_wins_5', name: 'Master of Disguise', description: 'Win 5 games as Fake Artist', icon: '🕵️', requirement: 5, type: 'fake_wins' },
    { id: 'fake_wins_20', name: 'Invisible', description: 'Win 20 games as Fake Artist', icon: '👻', requirement: 20, type: 'fake_wins' },
    { id: 'guesses_10', name: 'Sharp Eye', description: 'Guess correctly 10 times', icon: '👁️', requirement: 10, type: 'guesses' },
    { id: 'guesses_50', name: 'Mind Reader', description: 'Guess correctly 50 times', icon: '🧠', requirement: 50, type: 'guesses' },
    { id: 'drawings_100', name: 'Prolific Artist', description: 'Draw 100 rounds', icon: '🎨', requirement: 100, type: 'drawings' },
];

function checkAchievements(playerId: string): Achievement[] {
    const user = getUser(playerId);
    if (!user) return [];

    const unlocked: Achievement[] = [];
    const existing = getPlayerAchievements(playerId) as any[];
    const existingIds = new Set(existing.map((a: any) => a.achievement_id));

    for (const achievement of ALL_ACHIEVEMENTS) {
        if (existingIds.has(achievement.id)) continue;

        let current = 0;
        switch (achievement.type) {
            case 'wins': current = user.wins; break;
            case 'games': current = user.games_played || (user.wins + user.losses); break;
            case 'streak': current = user.best_streak || user.win_streak; break;
            case 'coins': current = user.coins; break;
            case 'level': current = user.level; break;
            case 'fake_wins': current = user.fake_wins || 0; break;
            case 'guesses': current = user.correct_guesses || 0; break;
            case 'drawings': current = user.total_strokes || 0; break;
        }

        if (current >= achievement.requirement) {
            if (unlockAchievement(playerId, achievement.id)) {
                unlocked.push(achievement);
            }
        }
    }

    return unlocked;
}

// ===================== HELPER: Find room a player is in =====================
function findPlayerRoom(userId: string): Room | undefined {
    for (const room of rooms.values()) {
        if (room.players.some(p => p.id === userId)) return room;
    }
    return undefined;
}

// ===================== HELPER: Emit to a player by persistent ID =====================
function emitToPlayer(playerId: string, event: string, ...args: any[]) {
    const socketId = userToSocket.get(playerId);
    if (socketId) {
        (io.to(socketId) as any).emit(event, ...args);
    }
}

// ===================== GAME LOGIC HELPERS =====================

function startDrawGuessRound(roomId: string) {
    const room = getRoom(roomId);
    if (!room || room.players.length < 2) return;

    const connectedPlayers = room.players.filter(p => p.connected);
    const drawerIndex = (room.currentRound - 1) % connectedPlayers.length;
    const drawerId = connectedPlayers[drawerIndex].id;

    room.currentDrawer = drawerId;
    room.phase = 'DRAWING';
    room.roundStartTime = Date.now();
    room.correctGuess = false;
    room.lastActivity = Date.now();

    // Speed round uses simpler words
    const word = room.config.gameMode === 'speed-round' ? getSpeedRoundWord() : getDrawGuessWord();
    room.word = word;
    room.playerCanvases.set(drawerId, []);
    room.undoStacks.set(drawerId, []);

    const drawingTime = room.config.drawingTime;
    const timerEnd = Date.now() + drawingTime * 1000;
    room.timerEndTime = timerEnd;

    // Send word to drawer, ??? to everyone else
    connectedPlayers.forEach(p => {
        if (p.id === drawerId) {
            emitToPlayer(p.id, 'draw_phase_started', drawerId, word, room.currentRound, timerEnd);
        } else {
            emitToPlayer(p.id, 'draw_phase_started', drawerId, '???', room.currentRound, timerEnd);
        }
    });

    const existingTimer = roomTimers.get(roomId);
    if (existingTimer) clearInterval(existingTimer);

    let remainingTime = drawingTime;
    const timerInterval = setInterval(() => {
        remainingTime--;
        io.to(roomId).emit('timer_update', remainingTime);
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            roomTimers.delete(roomId);
            endDrawGuessRound(roomId);
        }
    }, 1000);
    roomTimers.set(roomId, timerInterval);

    console.log(`Draw-Guess Round ${room.currentRound} in ${roomId}: drawer=${connectedPlayers[drawerIndex].name}`);
}

function endDrawGuessRound(roomId: string) {
    const room = getRoom(roomId);
    if (!room) return;

    const timer = roomTimers.get(roomId);
    if (timer) { clearInterval(timer); roomTimers.delete(roomId); }

    if (!room.correctGuess) {
        io.to(roomId).emit('guess_result', false, room.word || '', 0);
    }

    io.to(roomId).emit('round_scores', room.scores || []);

    if (room.currentRound >= (room.config.totalRounds || 5)) {
        finishDrawGuessGame(roomId);
    } else {
        setTimeout(() => {
            if (room.phase !== 'LOBBY') {
                room.currentRound++;
                startDrawGuessRound(roomId);
            }
        }, 3000);
    }
}

function finishDrawGuessGame(roomId: string) {
    const room = getRoom(roomId);
    if (!room || !room.scores) return;

    const sorted = [...room.scores].sort((a, b) => b.score - a.score);
    const winnerId = sorted[0]?.playerId;
    const winnerName = room.players.find(p => p.id === winnerId)?.name || 'Unknown';

    // Record game history & rewards
    const duration = room.gameStartTime ? Math.floor((Date.now() - room.gameStartTime) / 1000) : 0;
    const gameId = recordGame(roomId, 'draw-guess', winnerName, room.word || '', duration, room.players.length);

    room.players.forEach(p => {
        const isWinner = p.id === winnerId;
        const reward = calculateRewards(p.id, isWinner ? 'WIN' : 'LOSS', duration);
        recordParticipant(gameId, p.id, 'player', isWinner ? 'WIN' : 'LOSS', reward.coins, reward.xp);
        emitToPlayer(p.id, 'reward_earned', reward);

        // Update detailed stats
        const user = getUser(p.id);
        if (user) {
            const { updateUserStats } = require('./db');
            const updates: any = { games_played: (user.games_played || 0) + 1 };
            if (user.win_streak > (user.best_streak || 0)) {
                updates.best_streak = user.win_streak;
            }
            updateUserStats(p.id, updates);
        }

        // Check achievements
        const newAchievements = checkAchievements(p.id);
        newAchievements.forEach(a => emitToPlayer(p.id, 'achievement_unlocked', a));
    });

    room.phase = 'RESULT';
    io.to(roomId).emit('game_over', winnerName, sorted);
}

function startDrawingRound(roomId: string) {
    const room = getRoom(roomId);
    if (!room) return;

    room.roundStartTime = Date.now();
    room.lastActivity = Date.now();
    const drawingTime = room.config.drawingTime;
    const timerEnd = Date.now() + drawingTime * 1000;
    room.timerEndTime = timerEnd;

    const existingTimer = roomTimers.get(roomId);
    if (existingTimer) clearInterval(existingTimer);

    // Send absolute end timestamp for client-side timer sync
    io.to(roomId).emit('round_started', room.currentRound, timerEnd);

    let remainingTime = drawingTime;
    const timerInterval = setInterval(() => {
        remainingTime--;
        io.to(roomId).emit('timer_update', remainingTime);
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            roomTimers.delete(roomId);
            endDrawingRound(roomId);
        }
    }, 1000);
    roomTimers.set(roomId, timerInterval);
}

function endDrawingRound(roomId: string) {
    const room = getRoom(roomId);
    if (!room) return;

    // Check minimum strokes and warn
    room.players.forEach(p => {
        const strokes = room.playerCanvases.get(p.id) || [];
        if (strokes.length < room.config.minStrokes) {
            io.to(roomId).emit('low_strokes_warning', p.name);
        }
    });

    if (room.currentRound < room.config.totalRounds) {
        room.phase = 'REVEAL';
        revealCanvases(roomId);

        setTimeout(() => {
            if (room.phase === 'REVEAL') {
                room.currentRound++;
                room.players.forEach(p => {
                    room.playerCanvases.set(p.id, []);
                });
                room.phase = 'DRAWING';
                startDrawingRound(roomId);
            }
        }, 8000);
    } else {
        room.phase = 'REVEAL';
        revealCanvases(roomId);

        setTimeout(() => {
            if (room.phase === 'REVEAL') {
                room.phase = 'VOTING';
                room.votes = {};
                room.hasVoted = new Set();
                io.to(roomId).emit('voting_started');
            }
        }, 10000);
    }
}

function revealCanvases(roomId: string) {
    const room = getRoom(roomId);
    if (!room) return;

    const canvases: PlayerCanvas[] = room.players.filter(p => p.connected).map(p => ({
        playerId: p.id,
        playerName: p.name,
        strokes: room.playerCanvases.get(p.id) || []
    }));

    io.to(roomId).emit('reveal_canvases', canvases);
}

function cleanupRoom(roomId: string) {
    const timer = roomTimers.get(roomId);
    if (timer) { clearInterval(timer); roomTimers.delete(roomId); }
    deleteRoom(roomId);
    console.log(`Room ${roomId} deleted`);
}

// ===================== REST API ENDPOINTS =====================

app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Fake Artist server is running' });
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const result = await registerUser(username, email, password);
    res.json(result);
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json(result);
});

app.post('/api/auth/guest', (req, res) => {
    const { username } = req.body;
    const result = loginAsGuest(username);
    res.json(result);
});

// ===================== SOCKET.IO CONNECTION =====================

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('Socket connected:', socket.id);

    // ===== AUTHENTICATION =====
    socket.on('authenticate', (token: string) => {
        const authResult = verifyToken(token);
        if (authResult.valid && authResult.userId && authResult.username) {
            socketToUser.set(socket.id, { userId: authResult.userId, username: authResult.username });
            userToSocket.set(authResult.userId, socket.id);
            socket.emit('auth_result', { success: true, userId: authResult.userId, username: authResult.username });

            // Check if user was in a room (reconnection)
            const existingRoom = findPlayerRoom(authResult.userId);
            if (existingRoom) {
                const player = existingRoom.players.find(p => p.id === authResult.userId);
                if (player) {
                    player.connected = true;
                    player.socketId = socket.id;
                    player.disconnectedAt = undefined;
                    socket.join(existingRoom.id);

                    // Send current game state for reconnection
                    socket.emit('reconnected', {
                        roomId: existingRoom.id,
                        phase: existingRoom.phase,
                        players: existingRoom.players,
                        role: player.role,
                        word: player.role === 'FAKE' ? existingRoom.fakeWord : existingRoom.word,
                        currentRound: existingRoom.currentRound,
                        timerEndTime: existingRoom.timerEndTime,
                        config: existingRoom.config,
                        scores: existingRoom.scores,
                    });

                    io.to(existingRoom.id).emit('player_joined', existingRoom.players);
                    console.log(`Player ${authResult.username} reconnected to room ${existingRoom.id}`);
                }
            }
        } else {
            socket.emit('auth_result', { success: false, error: 'Invalid or expired token' });
        }
    });

    socket.on('register', async (username: string, email: string, password: string) => {
        const result = await registerUser(username, email, password);
        if (result.success && result.userId && result.token) {
            socketToUser.set(socket.id, { userId: result.userId, username: sanitizeName(username) });
            userToSocket.set(result.userId, socket.id);
        }
        socket.emit('auth_result', result);
    });

    socket.on('login', async (email: string, password: string) => {
        const result = await loginUser(email, password);
        if (result.success && result.userId && result.username) {
            socketToUser.set(socket.id, { userId: result.userId, username: result.username });
            userToSocket.set(result.userId, socket.id);
        }
        socket.emit('auth_result', result);
    });

    socket.on('guest_login', (username: string) => {
        const result = loginAsGuest(username);
        if (result.success && result.userId) {
            socketToUser.set(socket.id, { userId: result.userId, username: sanitizeName(username) });
            userToSocket.set(result.userId, socket.id);
        }
        socket.emit('auth_result', result);
    });

    // ===== ROOM MANAGEMENT =====
    socket.on('join_room', (roomId: string) => {
        const userId = getUserId(socket);
        const username = getUsername(socket);
        if (!userId) { socket.emit('error', 'Not authenticated'); return; }

        // Rate limit
        if (!checkRateLimit(rateLimiters.events, userId, RATE_LIMITS.EVENTS_PER_SECOND)) {
            socket.emit('error', 'Too many requests'); return;
        }

        // Sanitize roomId
        const safeRoomId = roomId.replace(/[^A-Za-z0-9]/g, '').substring(0, 10).toUpperCase();
        if (!safeRoomId) { socket.emit('error', 'Invalid room ID'); return; }

        let room = getRoom(safeRoomId);
        if (!room) {
            room = createRoom(safeRoomId, userId);
            console.log(`Created room ${safeRoomId}`);
        }

        // Check player limit
        if (room.players.length >= room.config.maxPlayers && !room.players.some(p => p.id === userId)) {
            socket.emit('error', `Room is full (max ${room.config.maxPlayers} players)`);
            return;
        }

        // Can't join mid-game (unless reconnecting)
        if (room.phase !== 'LOBBY' && room.phase !== 'RESULT' && !room.players.some(p => p.id === userId)) {
            socket.emit('error', 'Game in progress. Cannot join now.');
            return;
        }

        // Ensure user exists in DB
        createUser(userId, username);

        // Check if player already in room (reconnection)
        const existingPlayer = room.players.find(p => p.id === userId);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.connected = true;
            existingPlayer.disconnectedAt = undefined;
        } else {
            const newPlayer: Player = {
                id: userId,
                socketId: socket.id,
                name: username,
                role: null,
                score: 0,
                connected: true
            };
            room.players.push(newPlayer);
            room.playerCanvases.set(userId, []);
        }

        room.lastActivity = Date.now();
        socket.join(safeRoomId);
        io.to(safeRoomId).emit('player_joined', room.players);
        console.log(`${username} joined room ${safeRoomId}`);
    });

    socket.on('leave_room', (roomId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;
        handlePlayerLeave(userId, roomId);
    });

    // ===== GAME CONFIGURATION =====
    socket.on('configure_game', (roomId: string, config: Partial<GameConfig>) => {
        const userId = getUserId(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room) return;

        // Only host can configure, and ONLY in LOBBY phase
        if (room.hostId !== userId) { socket.emit('error', 'Only host can configure'); return; }
        if (room.phase !== 'LOBBY' && room.phase !== 'RESULT') { socket.emit('error', 'Cannot change config during game'); return; }

        // Validate each field separately
        if (config.drawingTime !== undefined) {
            if ([15, 30, 60, 90].includes(config.drawingTime)) room.config.drawingTime = config.drawingTime;
        }
        if (config.totalRounds !== undefined) {
            const r = Math.floor(config.totalRounds);
            if (r >= 1 && r <= 5) room.config.totalRounds = r;
        }
        if (config.minStrokes !== undefined) {
            const m = Math.floor(config.minStrokes);
            if (m >= 1 && m <= 20) room.config.minStrokes = m;
        }
        if (config.gameMode !== undefined) {
            if (['fake-artist', 'draw-guess', 'speed-round', 'team-mode'].includes(config.gameMode)) room.config.gameMode = config.gameMode;
        }
        if (config.difficulty !== undefined) {
            if (['easy', 'medium', 'hard'].includes(config.difficulty)) room.config.difficulty = config.difficulty;
        }
        if (config.wordPack !== undefined) {
            if (['mixed', 'animals', 'food', 'objects', 'nature', 'sports', 'movies', 'tech', 'music', 'places'].includes(config.wordPack)) {
                room.config.wordPack = config.wordPack;
            }
        }

        io.to(roomId).emit('room_config_updated', room.config);
    });

    // ===== START GAME (with race condition lock) =====
    socket.on('start_game', (roomId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room) return;

        // Only host can start
        if (room.hostId !== userId) { socket.emit('error', 'Only host can start'); return; }

        // Race condition lock
        if (room.locked) { socket.emit('error', 'Game is already starting'); return; }

        if (room.phase !== 'LOBBY' && room.phase !== 'RESULT') { socket.emit('error', 'Game already in progress'); return; }

        room.locked = true;

        try {
            const connectedPlayers = room.players.filter(p => p.connected);

            // Handle 2-player draw & guess mode
            if (room.config.gameMode === 'draw-guess') {
                if (connectedPlayers.length !== 2) {
                    socket.emit('error', '2-player mode requires exactly 2 players!');
                    return;
                }

                room.currentRound = 1;
                room.gameStartTime = Date.now();
                room.scores = connectedPlayers.map(p => ({ playerId: p.id, playerName: p.name, score: 0 }));
                room.config.totalRounds = 5;
                room.tiebreakersUsed = 0;

                startDrawGuessRound(roomId);
                console.log(`2-player game started in room ${roomId}`);
                return;
            }

            // Handle Speed Round mode (draw & guess but fast, 2+ players)
            if (room.config.gameMode === 'speed-round') {
                if (connectedPlayers.length < 2) {
                    socket.emit('error', 'Speed Round needs at least 2 players!');
                    return;
                }

                room.currentRound = 1;
                room.gameStartTime = Date.now();
                room.scores = connectedPlayers.map(p => ({ playerId: p.id, playerName: p.name, score: 0 }));
                room.config.totalRounds = connectedPlayers.length * 2; // Everyone draws twice
                room.config.drawingTime = 15; // 15 seconds per round
                room.tiebreakersUsed = 0;

                startDrawGuessRound(roomId);
                console.log(`Speed Round started in room ${roomId}`);
                return;
            }

            // Handle Team Mode (4+ players, 2v2 with fake artists)
            if (room.config.gameMode === 'team-mode') {
                if (connectedPlayers.length < 4) {
                    socket.emit('error', 'Team mode needs at least 4 players!');
                    return;
                }

                // Shuffle and split into two teams
                const shuffled = [...connectedPlayers].sort(() => Math.random() - 0.5);
                const half = Math.ceil(shuffled.length / 2);
                const team0 = shuffled.slice(0, half).map(p => p.id);
                const team1 = shuffled.slice(half).map(p => p.id);
                room.teams = [team0, team1];

                // Assign team numbers to players
                room.players.forEach(p => {
                    p.team = team0.includes(p.id) ? 0 : 1;
                });

                // One fake artist per team
                const fake0 = team0[Math.floor(Math.random() * team0.length)];
                const fake1 = team1[Math.floor(Math.random() * team1.length)];
                room.fakeArtistIds = [fake0, fake1];
                room.fakeArtistId = fake0; // Primary for compatibility

                const { realWord, fakeWord, category } = getWordPair(room.config.difficulty, room.config.wordPack);
                room.word = realWord;
                room.fakeWord = fakeWord;
                room.category = category;
                room.phase = 'DRAWING';
                room.currentRound = 1;
                room.gameStartTime = Date.now();
                room.tiebreakersUsed = 0;
                room.votes = {};
                room.hasVoted = new Set();

                room.players.forEach(p => {
                    room.playerCanvases.set(p.id, []);
                    room.undoStacks.set(p.id, []);
                });

                // Assign roles
                room.players.forEach(player => {
                    const isFake = room.fakeArtistIds!.includes(player.id);
                    player.role = isFake ? 'FAKE' : 'ARTIST';
                    const wordToSend = isFake ? fakeWord : realWord;
                    emitToPlayer(player.id, 'role_assigned', player.role, wordToSend);
                });

                startDrawingRound(roomId);
                console.log(`Team Mode started in ${roomId}. Teams: ${team0.length}v${team1.length}`);
                return;
            }

            // Handle fake artist mode (3+ players)
            if (connectedPlayers.length < 3) {
                socket.emit('error', 'Need at least 3 players for Fake Artist mode!');
                return;
            }

            // 1. Select Fake Artist
            const fakeIndex = Math.floor(Math.random() * connectedPlayers.length);
            const fakePlayerId = connectedPlayers[fakeIndex].id;
            room.fakeArtistId = fakePlayerId;

            // 2. Select Word Pair with difficulty filtering
            const { realWord, fakeWord, category } = getWordPair(room.config.difficulty, room.config.wordPack);
            room.word = realWord;
            room.fakeWord = fakeWord;
            room.category = category;
            room.phase = 'DRAWING';
            room.currentRound = 1;
            room.gameStartTime = Date.now();
            room.tiebreakersUsed = 0;
            room.votes = {};
            room.hasVoted = new Set();

            // Clear canvases
            room.players.forEach(p => {
                room.playerCanvases.set(p.id, []);
                room.undoStacks.set(p.id, []);
            });

            // 3. Assign Roles - NEVER send real word to fake
            room.players.forEach(player => {
                const isFake = player.id === fakePlayerId;
                player.role = isFake ? 'FAKE' : 'ARTIST';

                // CRITICAL FIX: Fake only sees their word, real word is NEVER sent
                const wordToSend = isFake ? fakeWord : realWord;
                emitToPlayer(player.id, 'role_assigned', player.role, wordToSend);
            });

            // 4. Start first round
            startDrawingRound(roomId);

            console.log(`Fake Artist started in ${roomId}. Fake: ${connectedPlayers[fakeIndex].name}`);
        } finally {
            // Release lock after 1 second
            setTimeout(() => { room.locked = false; }, 1000);
        }
    });

    // ===== DRAWING (with validation) =====
    socket.on('draw_stroke', (roomId: string, stroke: Stroke) => {
        const userId = getUserId(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room || room.phase !== 'DRAWING') return;

        // Verify player is in this room
        const player = room.players.find(p => p.id === userId);
        if (!player || !player.connected) return;

        // In draw-guess mode, only drawer can draw
        if (room.config.gameMode === 'draw-guess' && room.currentDrawer !== userId) return;

        // Rate limit strokes
        if (!checkRateLimit(rateLimiters.strokes, userId, RATE_LIMITS.STROKES_PER_SECOND)) return;

        // Validate stroke coordinates - must be finite numbers within bounds
        if (typeof stroke.x !== 'number' || typeof stroke.y !== 'number' ||
            typeof stroke.prevX !== 'number' || typeof stroke.prevY !== 'number' ||
            !isFinite(stroke.x) || !isFinite(stroke.y) ||
            !isFinite(stroke.prevX) || !isFinite(stroke.prevY)) {
            return;
        }

        // Bounds check
        const maxCoord = RATE_LIMITS.CANVAS_MAX_COORD;
        if (stroke.x < 0 || stroke.x > maxCoord || stroke.y < 0 || stroke.y > maxCoord ||
            stroke.prevX < 0 || stroke.prevX > maxCoord || stroke.prevY < 0 || stroke.prevY > maxCoord) {
            return;
        }

        // Validate color is a valid hex or named color
        if (typeof stroke.color !== 'string' || stroke.color.length > 20) return;

        // Validate brush type - check ownership if premium
        if (stroke.brushType && stroke.brushType !== 'normal') {
            if (!playerOwnsBrush(userId, stroke.brushType)) {
                stroke.brushType = 'normal'; // Force default if not owned
            }
        }

        // Max strokes per round
        const playerStrokes = room.playerCanvases.get(userId);
        if (!playerStrokes) return;
        if (playerStrokes.length >= RATE_LIMITS.MAX_STROKES_PER_ROUND) return;

        // Store sanitized stroke
        playerStrokes.push({
            x: Math.round(stroke.x),
            y: Math.round(stroke.y),
            prevX: Math.round(stroke.prevX),
            prevY: Math.round(stroke.prevY),
            color: stroke.color.substring(0, 20),
            brushType: stroke.brushType,
            brushSize: typeof stroke.brushSize === 'number' ? Math.min(Math.max(1, Math.round(stroke.brushSize)), 30) : undefined,
            opacity: typeof stroke.opacity === 'number' ? Math.min(Math.max(0.1, stroke.opacity), 1) : undefined,
            tool: stroke.tool === 'eraser' ? 'eraser' : 'brush',
        });

        room.lastActivity = Date.now();

        // In draw-guess or speed-round mode, broadcast strokes to others in real-time
        if (room.config.gameMode === 'draw-guess' || room.config.gameMode === 'speed-round') {
            const otherPlayers = room.players.filter(p => p.id !== room.currentDrawer && p.connected);
            otherPlayers.forEach(other => {
                const otherSocketId = userToSocket.get(other.id);
                if (otherSocketId) {
                    io.to(otherSocketId).emit('stroke_drawn' as any, {
                        x: Math.round(stroke.x),
                        y: Math.round(stroke.y),
                        prevX: Math.round(stroke.prevX),
                        prevY: Math.round(stroke.prevY),
                        color: stroke.color.substring(0, 20),
                        brushType: stroke.brushType,
                        brushSize: typeof stroke.brushSize === 'number' ? Math.min(Math.max(1, Math.round(stroke.brushSize)), 30) : undefined,
                        opacity: typeof stroke.opacity === 'number' ? Math.min(Math.max(0.1, stroke.opacity), 1) : undefined,
                        tool: stroke.tool === 'eraser' ? 'eraser' : 'brush',
                    });
                }
            });
        }
    });

    // ===== 2-PLAYER / SPEED ROUND GUESS =====
    socket.on('submit_guess', (roomId: string, guess: string) => {
        const userId = getUserId(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room || room.phase !== 'DRAWING') return;
        if (room.config.gameMode !== 'draw-guess' && room.config.gameMode !== 'speed-round') return;

        // Rate limit guesses
        if (!checkRateLimit(rateLimiters.guesses, userId, RATE_LIMITS.GUESSES_PER_SECOND)) return;

        // Only non-drawer can submit
        if (userId === room.currentDrawer) return;
        const guesser = room.players.find(p => p.id === userId);
        if (!guesser) return;

        // Sanitize guess
        if (typeof guess !== 'string' || guess.length > 100) return;

        const correctWord = (room.word || '').toLowerCase().trim();
        const guessedWord = guess.toLowerCase().trim();

        if (!guessedWord) return;

        if (correctWord === guessedWord && !room.correctGuess) {
            room.correctGuess = true;

            const elapsed = room.roundStartTime ? (Date.now() - room.roundStartTime) / 1000 : 999;
            let guesserPoints = 0;
            let drawerPoints = 30;

            // Speed round gives more points for faster guesses
            if (room.config.gameMode === 'speed-round') {
                if (elapsed < 5) guesserPoints = 80;
                else if (elapsed < 10) guesserPoints = 50;
                else guesserPoints = 20;
                drawerPoints = 40;
            } else {
                if (elapsed < 10) guesserPoints = 50;
                else if (elapsed < 20) guesserPoints = 30;
                else if (elapsed < 40) guesserPoints = 15;
            }

            if (room.scores) {
                const ds = room.scores.find(s => s.playerId === room.currentDrawer);
                const gs = room.scores.find(s => s.playerId === userId);
                if (ds) ds.score += drawerPoints;
                if (gs) gs.score += guesserPoints;
            }

            // Update correct_guesses stat
            const user = getUser(userId);
            if (user) {
                const { updateUserStats } = require('./db');
                updateUserStats(userId, { correct_guesses: (user.correct_guesses || 0) + 1 });
            }

            io.to(roomId).emit('guess_result', true, correctWord, guesserPoints);

            const timer = roomTimers.get(roomId);
            if (timer) { clearInterval(timer); roomTimers.delete(roomId); }

            setTimeout(() => endDrawGuessRound(roomId), 2000);
        } else {
            // Wrong guess - notify only guesser
            socket.emit('guess_result', false, '', 0);
        }
    });

    // ===== VOTING (with double-vote prevention) =====
    socket.on('submit_vote', (roomId: string, suspectId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room || room.phase !== 'VOTING') return;

        // Prevent self-votes
        if (userId === suspectId) { socket.emit('error', 'Cannot vote for yourself!'); return; }

        // Verify suspect is a valid player in the room
        if (!room.players.some(p => p.id === suspectId)) { socket.emit('error', 'Invalid player'); return; }

        // Prevent double voting (even across reconnections)
        if (room.hasVoted.has(userId)) { socket.emit('error', 'Already voted!'); return; }

        room.votes[userId] = suspectId;
        room.hasVoted.add(userId);
        room.lastActivity = Date.now();

        const connectedPlayers = room.players.filter(p => p.connected);
        const totalNeeded = connectedPlayers.length;

        // Notify all of vote progress
        io.to(roomId).emit('vote_cast', userId, room.hasVoted.size, totalNeeded);

        // Check if everyone voted
        if (room.hasVoted.size >= totalNeeded) {
            const voteCounts: Record<string, number> = {};
            Object.values(room.votes).forEach(id => {
                voteCounts[id] = (voteCounts[id] || 0) + 1;
            });

            let maxVotes = 0;
            let mostVotedId: string | null = null;
            let tieCount = 0;

            Object.entries(voteCounts).forEach(([id, count]) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    mostVotedId = id;
                    tieCount = 1;
                } else if (count === maxVotes) {
                    tieCount++;
                }
            });

            // TIE HANDLING: Max 1 tiebreaker, then random elimination
            if (tieCount > 1) {
                if (room.tiebreakersUsed >= 1) {
                    // Already used tiebreaker - pick randomly from tied players
                    const tiedIds = Object.entries(voteCounts)
                        .filter(([, count]) => count === maxVotes)
                        .map(([id]) => id);
                    mostVotedId = tiedIds[Math.floor(Math.random() * tiedIds.length)];
                    // Fall through to result
                } else {
                    // First tie - allow one more round
                    room.tiebreakersUsed++;
                    room.votes = {};
                    room.hasVoted = new Set();
                    room.currentRound++;

                    room.players.forEach(p => room.playerCanvases.set(p.id, []));
                    io.to(roomId).emit('game_result', '', 'TIE', room.word || '', room.fakeWord || '');

                    setTimeout(() => {
                        if (room.phase !== 'LOBBY') {
                            room.phase = 'DRAWING';
                            startDrawingRound(roomId);
                        }
                    }, 5000);
                    return;
                }
            }

            const fakeCaught = mostVotedId === room.fakeArtistId;
            const winner = fakeCaught ? 'ARTISTS' : 'FAKE';

            const duration = room.gameStartTime ? Math.floor((Date.now() - room.gameStartTime) / 1000) : 0;
            const gameId = recordGame(roomId, 'fake-artist', winner, room.word || '', duration, room.players.length);

            room.players.forEach(p => {
                let resultType: 'WIN' | 'LOSS' = 'LOSS';
                if (winner === 'ARTISTS' && p.role === 'ARTIST') resultType = 'WIN';
                if (winner === 'FAKE' && p.role === 'FAKE') resultType = 'WIN';

                const reward = calculateRewards(p.id, resultType, duration);

                // Fake gets 1.5x coins if they win
                if (p.role === 'FAKE' && resultType === 'WIN') {
                    reward.coins = Math.floor(reward.coins * 1.5);
                }

                // Update detailed stats
                const user = getUser(p.id);
                if (user) {
                    const { updateUserStats } = require('./db');
                    const updates: any = {
                        games_played: (user.games_played || 0) + 1,
                    };
                    if (resultType === 'WIN' && p.role === 'FAKE') {
                        updates.fake_wins = (user.fake_wins || 0) + 1;
                    }
                    if (resultType === 'WIN' && p.role === 'ARTIST') {
                        updates.artist_wins = (user.artist_wins || 0) + 1;
                    }
                    if (user.win_streak > (user.best_streak || 0)) {
                        updates.best_streak = user.win_streak;
                    }
                    updateUserStats(p.id, updates);
                }

                recordParticipant(gameId, p.id, p.role || 'ARTIST', resultType, reward.coins, reward.xp);
                emitToPlayer(p.id, 'reward_earned', reward);

                // Check achievements
                const newAchievements = checkAchievements(p.id);
                newAchievements.forEach(a => emitToPlayer(p.id, 'achievement_unlocked', a));
            });

            room.phase = 'RESULT';
            io.to(roomId).emit('game_result', room.fakeArtistId!, winner, room.word!, room.fakeWord || '');
        }
    });

    // ===== UNDO / REDO =====
    socket.on('undo', (roomId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;
        const room = getRoom(roomId);
        if (!room || room.phase !== 'DRAWING') return;

        const strokes = room.playerCanvases.get(userId);
        if (!strokes || strokes.length === 0) return;

        // Save current state for redo
        const undoStack = room.undoStacks.get(userId) || [];
        const removed = strokes.pop()!;
        undoStack.push([removed]);
        room.undoStacks.set(userId, undoStack);

        // Notify all clients (for draw-guess/speed mode, broadcast)
        io.to(roomId).emit('undo_stroke', userId);
    });

    socket.on('redo', (roomId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;
        const room = getRoom(roomId);
        if (!room || room.phase !== 'DRAWING') return;

        const undoStack = room.undoStacks.get(userId);
        if (!undoStack || undoStack.length === 0) return;

        const restored = undoStack.pop()!;
        const strokes = room.playerCanvases.get(userId);
        if (!strokes) return;

        restored.forEach(s => {
            strokes.push(s);
            io.to(roomId).emit('redo_stroke', userId, s);
        });
    });

    // ===== CHAT =====
    socket.on('send_chat', (roomId: string, message: string) => {
        const userId = getUserId(socket);
        const username = getUsername(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room) return;

        if (!checkRateLimit(rateLimiters.events, userId, RATE_LIMITS.EVENTS_PER_SECOND)) return;

        // Sanitize message
        if (typeof message !== 'string' || message.length > 200 || !message.trim()) return;
        const cleanMsg = message.replace(/<[^>]*>/g, '').trim().substring(0, 200);

        // Don't allow chat that reveals the word during drawing phase
        if (room.phase === 'DRAWING' && room.word) {
            const lower = cleanMsg.toLowerCase();
            if (lower.includes(room.word.toLowerCase())) return;
        }

        const chatMsg: ChatMessage = {
            id: uuidv4(),
            playerId: userId,
            playerName: username,
            message: cleanMsg,
            timestamp: Date.now(),
            type: 'chat',
        };

        room.chatMessages.push(chatMsg);
        // Keep only last 100 messages
        if (room.chatMessages.length > 100) room.chatMessages.shift();

        io.to(roomId).emit('chat_message', chatMsg);
    });

    // ===== REACTIONS (Emoji) =====
    socket.on('send_reaction', (roomId: string, emoji: string) => {
        const userId = getUserId(socket);
        const username = getUsername(socket);
        if (!userId) return;

        const room = getRoom(roomId);
        if (!room) return;

        if (!checkRateLimit(rateLimiters.events, userId, RATE_LIMITS.EVENTS_PER_SECOND)) return;

        // Only allow specific emojis
        const ALLOWED_EMOJIS = ['👍', '👎', '😂', '😮', '🔥', '❤️', '👏', '🎨', '🤔', '😱', '💀', '🥳'];
        if (!ALLOWED_EMOJIS.includes(emoji)) return;

        io.to(roomId).emit('reaction_received', {
            playerId: userId,
            playerName: username,
            emoji,
            timestamp: Date.now(),
        });
    });

    // ===== ACHIEVEMENTS =====
    socket.on('get_achievements', () => {
        const userId = getUserId(socket);
        if (!userId) return;
        socket.emit('achievements_data', getPlayerAchievements(userId));
    });

    socket.on('get_all_achievements', () => {
        socket.emit('all_achievements', ALL_ACHIEVEMENTS);
    });

    // ===== SOLO MODE =====
    socket.on('start_solo_game', () => {
        const userId = getUserId(socket);
        if (!userId) { socket.emit('error', 'Not authenticated'); return; }

        const drawing = getSoloDrawing();

        // Send the word and pre-recorded strokes for the client to replay
        socket.emit('draw_phase_started', 'computer', '???', 1, Date.now() + 30000);

        // Send strokes one by one with delays to simulate drawing
        let i = 0;
        const interval = setInterval(() => {
            if (i >= drawing.strokes.length) {
                clearInterval(interval);
                return;
            }
            socket.emit('stroke_drawn' as any, drawing.strokes[i]);
            i++;
        }, 200); // One stroke every 200ms

        // Store the word for guess checking in a temporary map
        const soloGames = (global as any).__soloGames || new Map();
        soloGames.set(userId, { word: drawing.word, interval, startTime: Date.now() });
        (global as any).__soloGames = soloGames;
    });

    // ===== PROFILE & ECONOMY =====
    socket.on('get_user_stats', () => {
        const userId = getUserId(socket);
        if (!userId) return;
        const user = getUser(userId);
        if (user) socket.emit('user_stats', user);
    });

    socket.on('get_shop_items', () => {
        socket.emit('shop_items', getShopItems());
    });

    socket.on('buy_item', (itemId: string) => {
        const userId = getUserId(socket);
        if (!userId) { socket.emit('error', 'Not authenticated'); return; }

        if (typeof itemId !== 'string' || itemId.length > 50) return;

        const result = buyItem(userId, itemId);
        socket.emit('purchase_result', result);

        if (result.success) {
            const user = getUser(userId);
            if (user) socket.emit('user_stats', user);
        }
    });

    socket.on('get_inventory', () => {
        const userId = getUserId(socket);
        if (!userId) return;
        socket.emit('inventory_data', getInventory(userId));
    });

    socket.on('equip_item', (itemId: string) => {
        const userId = getUserId(socket);
        if (!userId) return;

        if (typeof itemId !== 'string' || itemId.length > 50) return;

        const result = equipItem(userId, itemId);
        if (result.success) {
            socket.emit('inventory_data', getInventory(userId));
        }
    });

    socket.on('get_leaderboard', (timeframe?: string) => {
        const tf = (timeframe === 'daily' || timeframe === 'weekly') ? timeframe : 'all';
        socket.emit('leaderboard_data', getLeaderboard(20, tf));
    });

    socket.on('get_game_history', () => {
        const userId = getUserId(socket);
        if (!userId) return;
        socket.emit('game_history_data', getPlayerHistory(userId));
    });

    // ===== DISCONNECT with grace period =====
    socket.on('disconnect', () => {
        const userData = socketToUser.get(socket.id);
        if (!userData) {
            console.log('Unauthenticated socket disconnected:', socket.id);
            return;
        }

        const { userId, username } = userData;
        console.log(`User ${username} (${userId}) disconnected`);

        socketToUser.delete(socket.id);
        // Don't remove from userToSocket immediately - allow reconnection

        // Find all rooms this player is in
        rooms.forEach((room, roomId) => {
            const player = room.players.find(p => p.id === userId);
            if (!player) return;

            player.connected = false;
            player.disconnectedAt = Date.now();

            io.to(roomId).emit('player_joined', room.players);

            // Set grace period timer
            setTimeout(() => {
                // Check if they reconnected
                const currentSocket = userToSocket.get(userId);
                if (currentSocket && socketToUser.has(currentSocket)) {
                    return; // They reconnected, do nothing
                }

                // Grace period expired - remove from room
                handlePlayerLeave(userId, roomId);
            }, RECONNECT_GRACE_MS);
        });
    });
});

// ===================== HELPER: Handle player leaving =====
function handlePlayerLeave(userId: string, roomId: string) {
    const room = getRoom(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) return;

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    room.playerCanvases.delete(userId);
    userToSocket.delete(userId); // Immediately allow reconnection logic to claim this if mapped

    if (room.players.length === 0) {
        cleanupRoom(roomId);
        return;
    }

    // If host left, assign new host
    if (room.hostId === userId) {
        const newHost = room.players.find(p => p.connected);
        if (newHost) {
            room.hostId = newHost.id;
            emitToPlayer(newHost.id, 'new_host', newHost.id);
        }
    }

    io.to(roomId).emit('player_left', room.players, userId);

    // If game is in progress
    if (room.phase !== 'LOBBY' && room.phase !== 'RESULT') {
        // CRITICAL FIX: If Fake Artist leaves, game is over (Artists win)
        if (room.config.gameMode === 'fake-artist' && room.fakeArtistId === userId) {
            const timer = roomTimers.get(roomId);
            if (timer) { clearInterval(timer); roomTimers.delete(roomId); }

            room.phase = 'RESULT';
            // Artists win by default if Fake leaves
            const winner = 'ARTISTS';

            // Calculate rewards
            const duration = room.gameStartTime ? Math.floor((Date.now() - room.gameStartTime) / 1000) : 0;
            const gameId = recordGame(roomId, 'fake-artist', winner, room.word || '', duration, room.players.length);

            room.players.forEach(p => {
                const resultType = 'WIN'; // All remaining artists win
                const reward = calculateRewards(p.id, resultType, duration);
                recordParticipant(gameId, p.id, p.role || 'ARTIST', resultType, reward.coins, reward.xp);
                emitToPlayer(p.id, 'reward_earned', reward);
            });

            io.to(roomId).emit('game_result', userId, winner, room.word || '', room.fakeWord || '');
            io.to(roomId).emit('error', 'Fake Artist disconnected! Game over.');
            return;
        }

        const connectedPlayers = room.players.filter(p => p.connected);
        if (connectedPlayers.length < 2) {
            const timer = roomTimers.get(roomId);
            if (timer) { clearInterval(timer); roomTimers.delete(roomId); }
            room.phase = 'RESULT';
            io.to(roomId).emit('error', 'Not enough players to continue. Game ended.');
            io.to(roomId).emit('game_ended_early'); // New event for clean client handling
        }
    }
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
