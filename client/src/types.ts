export interface Player {
    id: string;        // persistent userId (from auth)
    socketId: string;  // current socket.id
    name: string;
    role: 'ARTIST' | 'FAKE' | null;
    score: number;
    connected: boolean;
    disconnectedAt?: number;
    team?: number;
}

export interface UserStats {
    id: string;
    username: string;
    coins: number;
    xp: number;
    level: number;
    wins: number;
    losses: number;
    win_streak: number;
    games_played: number;
    best_streak: number;
    total_strokes: number;
    correct_guesses: number;
    fake_wins: number;
    artist_wins: number;
}

export interface ShopItem {
    type: 'brush' | 'color' | 'avatar' | 'title';
    name: string;
    price: number;
}

export interface Stroke {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    color: string;
    brushType?: string;
    brushSize?: number;
    opacity?: number;
    tool?: 'brush' | 'eraser';
}

export interface PlayerCanvas {
    playerId: string;
    playerName: string;
    strokes: Stroke[];
}

export interface GameConfig {
    drawingTime: 15 | 30 | 60 | 90;
    totalRounds: number;
    minStrokes: number;
    gameMode: 'fake-artist' | 'draw-guess' | 'speed-round' | 'team-mode';
    difficulty: 'easy' | 'medium' | 'hard';
    maxPlayers: number;
    wordPack: 'mixed' | 'animals' | 'food' | 'objects' | 'nature' | 'sports' | 'movies' | 'tech' | 'music' | 'places';
    turnTimeLimit?: number;
}

export interface PlayerScore {
    playerId: string;
    playerName: string;
    score: number;
    role?: 'drawer' | 'guesser';
    team?: number;
}

export interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
    type: 'chat' | 'system' | 'reaction';
}

export interface Reaction {
    playerId: string;
    playerName: string;
    emoji: string;
    timestamp: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: number;
    type: string;
}

export interface PlayerAchievement {
    achievement_id: string;
    unlocked_at: string;
}

export interface AuthResult {
    success: boolean;
    userId?: string;
    username?: string;
    token?: string;
    error?: string;
}

export interface ReconnectState {
    roomId: string;
    phase: string;
    players: Player[];
    role: string | null;
    word: string | null;
    currentRound: number;
    timerEndTime?: number;
    config: GameConfig;
    scores?: PlayerScore[];
}
