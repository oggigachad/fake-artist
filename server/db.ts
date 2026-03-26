import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const dbPath = path.resolve(__dirname, 'game.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create indexes for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
  CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_game_participants_user ON game_participants(user_id);
`);

const JWT_SECRET = process.env.JWT_SECRET || 'fake-artist-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

// Initialize Schema with auth support
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    auth_provider TEXT DEFAULT 'guest',
    coins INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_strokes INTEGER DEFAULT 0,
    correct_guesses INTEGER DEFAULT 0,
    fake_wins INTEGER DEFAULT 0,
    artist_wins INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT,
    item_id TEXT,
    type TEXT,
    equipped BOOLEAN DEFAULT 0,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    PRIMARY KEY(user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    winner_team TEXT,
    word TEXT,
    duration_seconds INTEGER,
    player_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_participants (
    game_id INTEGER,
    user_id TEXT,
    role TEXT,
    result TEXT,
    coins_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    FOREIGN KEY(game_id) REFERENCES game_history(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    user_id TEXT,
    achievement_id TEXT,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    PRIMARY KEY(user_id, achievement_id)
  );
`);

// Migrations: Add columns that may be missing from older database schemas
const migrations: [string, string][] = [
  ['email', `ALTER TABLE users ADD COLUMN email TEXT`],
  ['password_hash', `ALTER TABLE users ADD COLUMN password_hash TEXT`],
  ['auth_provider', `ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'guest'`],
  ['coins', `ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0`],
  ['xp', `ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`],
  ['level', `ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`],
  ['wins', `ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0`],
  ['losses', `ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0`],
  ['win_streak', `ALTER TABLE users ADD COLUMN win_streak INTEGER DEFAULT 0`],
  ['games_played', `ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0`],
  ['created_at', `ALTER TABLE users ADD COLUMN created_at DATETIME`],
  ['last_login', `ALTER TABLE users ADD COLUMN last_login DATETIME`],
  ['best_streak', `ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0`],
  ['total_strokes', `ALTER TABLE users ADD COLUMN total_strokes INTEGER DEFAULT 0`],
  ['correct_guesses', `ALTER TABLE users ADD COLUMN correct_guesses INTEGER DEFAULT 0`],
  ['fake_wins', `ALTER TABLE users ADD COLUMN fake_wins INTEGER DEFAULT 0`],
  ['artist_wins', `ALTER TABLE users ADD COLUMN artist_wins INTEGER DEFAULT 0`],
];

for (const [colName, sql] of migrations) {
  try {
    db.exec(sql);
    console.log(`Migration: added column '${colName}' to users table`);
  } catch (e: any) {
    // 'duplicate column name' means it already exists — that's fine
    if (!e.message?.includes('duplicate column')) {
      console.error(`Migration error (${colName}):`, e.message);
    }
  }
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

// ===================== AUTH FUNCTIONS =====================

// Whitelist of allowed column names for updateUserStats - PREVENTS SQL INJECTION
const ALLOWED_USER_FIELDS = new Set([
    'username', 'coins', 'xp', 'level', 'wins', 'losses',
    'win_streak', 'games_played', 'last_login',
    'best_streak', 'total_strokes', 'correct_guesses', 'fake_wins', 'artist_wins'
]);

export const registerUser = async (username: string, email: string, password: string): Promise<{ success: boolean; token?: string; userId?: string; username?: string; error?: string }> => {
    const sanitizedUsername = sanitizeName(username);
    if (!sanitizedUsername) return { success: false, error: 'Invalid username' };
    if (!email || !email.includes('@')) return { success: false, error: 'Invalid email' };
    if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) return { success: false, error: 'Email already registered' };

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare('INSERT INTO users (id, username, email, password_hash, auth_provider) VALUES (?, ?, ?, ?, ?)').run(
        userId, sanitizedUsername, email.toLowerCase().trim(), passwordHash, 'email'
    );

    const token = jwt.sign({ userId, username: sanitizedUsername }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return { success: true, token, userId, username: sanitizedUsername };
};

export const loginUser = async (email: string, password: string): Promise<{ success: boolean; token?: string; userId?: string; username?: string; error?: string }> => {
    if (!email || !password) return { success: false, error: 'Email and password required' };

    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!user) return { success: false, error: 'Invalid credentials' };
    if (!user.password_hash) return { success: false, error: 'Account uses different login method' };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { success: false, error: 'Invalid credentials' };

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return { success: true, token, userId: user.id, username: user.username };
};

export const loginAsGuest = (username: string): { success: boolean; token?: string; userId?: string; username?: string; error?: string } => {
    const sanitizedUsername = sanitizeName(username);
    if (!sanitizedUsername) return { success: false, error: 'Invalid username' };

    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, username, auth_provider) VALUES (?, ?, ?)').run(
        userId, sanitizedUsername, 'guest'
    );

    const token = jwt.sign({ userId, username: sanitizedUsername }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return { success: true, token, userId, username: sanitizedUsername };
};

export const verifyToken = (token: string): { valid: boolean; userId?: string; username?: string } => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
        if (!user) return { valid: false };
        return { valid: true, userId: decoded.userId, username: decoded.username };
    } catch {
        return { valid: false };
    }
};

// ===================== USER FUNCTIONS =====================

export const getUser = (id: string): UserStats | undefined => {
    return db.prepare(
        'SELECT id, username, email, auth_provider, coins, xp, level, wins, losses, win_streak, games_played, COALESCE(best_streak, 0) as best_streak, COALESCE(total_strokes, 0) as total_strokes, COALESCE(correct_guesses, 0) as correct_guesses, COALESCE(fake_wins, 0) as fake_wins, COALESCE(artist_wins, 0) as artist_wins FROM users WHERE id = ?'
    ).get(id) as UserStats | undefined;
};

export const createUser = (id: string, username: string): UserStats => {
    const sanitized = sanitizeName(username);
    const stmt = db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)');
    stmt.run(id, sanitized);
    return getUser(id)!;
};

// FIXED: SQL Injection prevention - whitelist column names
export const updateUserStats = (id: string, updates: Partial<UserStats>) => {
    const safeUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_USER_FIELDS.has(key) && value !== undefined) {
            safeUpdates[key] = value;
        }
    }

    if (Object.keys(safeUpdates).length === 0) return;

    const fields = Object.keys(safeUpdates).map(key => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = @id`);
    stmt.run({ ...safeUpdates, id });
};

// ===================== NAME SANITIZATION =====================

export const sanitizeName = (name: string): string => {
    if (!name || typeof name !== 'string') return '';
    return name
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[^\w\s\-_.!]/g, '') // Only allow word chars, spaces, etc
        .trim()
        .substring(0, 20); // Max 20 chars
};

// ===================== GAME HISTORY =====================

export const recordGame = (roomId: string, gameMode: string, winnerTeam: string, word: string, durationSeconds: number, playerCount: number): number => {
    const result = db.prepare(
        'INSERT INTO game_history (room_id, game_mode, winner_team, word, duration_seconds, player_count) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(roomId, gameMode, winnerTeam, word, durationSeconds, playerCount);
    return result.lastInsertRowid as number;
};

export const recordParticipant = (gameId: number, userId: string, role: string, result: string, coinsEarned: number, xpEarned: number) => {
    db.prepare(
        'INSERT INTO game_participants (game_id, user_id, role, result, coins_earned, xp_earned) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(gameId, userId, role, result, coinsEarned, xpEarned);
};

export const getLeaderboard = (limit: number = 20, timeframe: string = 'all') => {
    if (timeframe === 'daily') {
        return db.prepare(`
            SELECT u.username, 
                   COUNT(CASE WHEN gp.result = 'WIN' THEN 1 END) as wins,
                   COUNT(CASE WHEN gp.result = 'LOSS' THEN 1 END) as losses,
                   u.level, u.coins,
                   SUM(COALESCE(gp.coins_earned, 0)) as daily_coins
            FROM users u
            JOIN game_participants gp ON u.id = gp.user_id
            JOIN game_history gh ON gp.game_id = gh.id
            WHERE gh.created_at >= datetime('now', '-1 day')
            GROUP BY u.id
            ORDER BY wins DESC
            LIMIT ?
        `).all(Math.min(limit, 100));
    } else if (timeframe === 'weekly') {
        return db.prepare(`
            SELECT u.username, 
                   COUNT(CASE WHEN gp.result = 'WIN' THEN 1 END) as wins,
                   COUNT(CASE WHEN gp.result = 'LOSS' THEN 1 END) as losses,
                   u.level, u.coins,
                   SUM(COALESCE(gp.coins_earned, 0)) as weekly_coins
            FROM users u
            JOIN game_participants gp ON u.id = gp.user_id
            JOIN game_history gh ON gp.game_id = gh.id
            WHERE gh.created_at >= datetime('now', '-7 days')
            GROUP BY u.id
            ORDER BY wins DESC
            LIMIT ?
        `).all(Math.min(limit, 100));
    }
    return db.prepare('SELECT username, wins, losses, level, coins FROM users ORDER BY wins DESC LIMIT ?').all(Math.min(limit, 100));
};

// ===================== ACHIEVEMENTS =====================

export const getPlayerAchievements = (userId: string): { achievement_id: string; unlocked_at: string }[] => {
    return db.prepare('SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?').all(userId) as any[];
};

export const unlockAchievement = (userId: string, achievementId: string): boolean => {
    const existing = db.prepare('SELECT 1 FROM achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);
    if (existing) return false;
    
    db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, achievementId);
    return true;
};

export const getPlayerHistory = (userId: string, limit: number = 20) => {
    return db.prepare(`
        SELECT gh.game_mode, gh.winner_team, gh.word, gh.duration_seconds, gh.created_at,
               gp.role, gp.result, gp.coins_earned, gp.xp_earned
        FROM game_participants gp
        JOIN game_history gh ON gp.game_id = gh.id
        WHERE gp.user_id = ?
        ORDER BY gh.created_at DESC
        LIMIT ?
    `).all(userId, Math.min(limit, 100));
};

export { JWT_SECRET };
export default db;
