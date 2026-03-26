export interface Player {
    id: string;       // persistent UUID from auth (NOT socket.id)
    socketId: string;  // current socket.id for routing
    name: string;
    role: 'ARTIST' | 'FAKE' | null;
    score: number;
    connected: boolean;  // for reconnection tracking
    disconnectedAt?: number; // timestamp of disconnect
    team?: number; // for team mode (0 or 1)
}

export interface UserStats {
    id: string;
    username: string;
    email?: string;
    auth_provider: string;
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
    type: 'wins' | 'games' | 'streak' | 'coins' | 'level' | 'fake_wins' | 'drawings' | 'guesses';
}

export interface PlayerAchievement {
    achievement_id: string;
    unlocked_at: string;
}

export interface Room {
    id: string;
    hostId: string;
    players: Player[];
    word: string | null;
    fakeWord: string | null;
    category: string | null;
    playerCanvases: Map<string, Stroke[]>;
    phase: 'LOBBY' | 'DRAWING' | 'GUESSING' | 'REVEAL' | 'VOTING' | 'RESULT';
    fakeArtistId: string | null;
    config: GameConfig;
    currentRound: number;
    roundStartTime: number | null;
    timerEndTime: number | null;
    votes: Record<string, string>;
    hasVoted: Set<string>;
    gameStartTime: number | null;
    lastActivity: number;
    tiebreakersUsed: number;
    locked: boolean;
    // 2-player mode
    scores: PlayerScore[];
    currentDrawer?: string;
    correctGuess?: boolean;
    // Chat & reactions
    chatMessages: ChatMessage[];
    // Team mode
    teams?: [string[], string[]];
    fakeArtistIds?: string[];
    // Undo support
    undoStacks: Map<string, Stroke[][]>;
}

// Events sent from server to clients
export interface ServerToClientEvents {
    // Auth
    auth_result: (result: { success: boolean; token?: string; userId?: string; username?: string; error?: string }) => void;
    // Room
    player_joined: (players: Player[]) => void;
    player_left: (players: Player[], leftPlayerId: string) => void;
    new_host: (hostId: string) => void;
    room_config_updated: (config: GameConfig) => void;
    room_error: (msg: string) => void;
    // Game - Fake Artist
    role_assigned: (role: 'ARTIST' | 'FAKE', word: string) => void;
    round_started: (roundNumber: number, timerEndTime: number) => void;
    timer_update: (remainingSeconds: number) => void;
    reveal_canvases: (canvases: PlayerCanvas[]) => void;
    voting_started: () => void;
    vote_cast: (voterId: string, totalVotes: number, needed: number) => void;
    game_result: (fakeId: string, winner: 'FAKE' | 'ARTISTS' | 'TIE', word: string, fakeWord: string) => void;
    reward_earned: (reward: { coins: number; xp: number; newLevel?: number }) => void;
    low_strokes_warning: (playerName: string) => void;
    // Economy/Profile
    user_stats: (stats: UserStats) => void;
    shop_items: (items: any) => void;
    purchase_result: (result: { success: boolean; message: string; remainingCoins?: number }) => void;
    inventory_data: (items: any[]) => void;
    leaderboard_data: (data: any[]) => void;
    game_history_data: (data: any[]) => void;
    // 2-Player Draw & Guess
    draw_phase_started: (drawerId: string, word: string, round: number, timerEndTime: number) => void;
    guess_result: (correct: boolean, word: string, points: number) => void;
    round_scores: (scores: PlayerScore[]) => void;
    game_over: (winner: string, finalScores: PlayerScore[]) => void;
    // Chat & Reactions
    chat_message: (message: ChatMessage) => void;
    reaction_received: (reaction: Reaction) => void;
    // Achievements
    achievement_unlocked: (achievement: Achievement) => void;
    achievements_data: (achievements: PlayerAchievement[]) => void;
    all_achievements: (achievements: Achievement[]) => void;
    // Undo
    undo_stroke: (playerId: string) => void;
    redo_stroke: (playerId: string, stroke: Stroke) => void;
    // General
    error: (msg: string) => void;
    reconnected: (gameState: any) => void;
    game_ended_early: () => void;
}

// Events sent from clients to server
export interface ClientToServerEvents {
    // Auth
    register: (username: string, email: string, password: string) => void;
    login: (email: string, password: string) => void;
    guest_login: (username: string) => void;
    authenticate: (token: string) => void;
    // Room
    join_room: (roomId: string) => void;
    leave_room: (roomId: string) => void;
    configure_game: (roomId: string, config: Partial<GameConfig>) => void;
    start_game: (roomId: string) => void;
    // Drawing
    draw_stroke: (roomId: string, stroke: Stroke) => void;
    undo: (roomId: string) => void;
    redo: (roomId: string) => void;
    // Voting
    submit_vote: (roomId: string, suspectId: string) => void;
    // 2-Player
    submit_guess: (roomId: string, guess: string) => void;
    // Chat & Reactions
    send_chat: (roomId: string, message: string) => void;
    send_reaction: (roomId: string, emoji: string) => void;
    // Economy
    get_user_stats: () => void;
    get_shop_items: () => void;
    buy_item: (itemId: string) => void;
    get_inventory: () => void;
    equip_item: (itemId: string) => void;
    get_leaderboard: (timeframe?: 'all' | 'weekly' | 'daily') => void;
    get_game_history: () => void;
    // Achievements
    get_achievements: () => void;
    get_all_achievements: () => void;
    // Solo
    start_solo_game: () => void;
}
