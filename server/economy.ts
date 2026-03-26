import { updateUserStats, getUser } from './db';

// Leveling Formula: XP = 100 * (level ^ 1.5)
export const getXpForNextLevel = (level: number) => {
    return Math.floor(100 * Math.pow(level, 1.5));
};

export const calculateRewards = (
    playerId: string,
    result: 'WIN' | 'LOSS',
    matchDurationSeconds: number
): { coins: number; xp: number; newLevel?: number } => {
    // Anti-farming: minimum 30 seconds for draw-guess, 120 for fake-artist
    if (matchDurationSeconds < 30) {
        return { coins: 0, xp: 0 };
    }

    let coins = 0;
    let xp = 0;
    let winIncrement = 0;
    let lossIncrement = 0;

    switch (result) {
        case 'WIN':
            coins = 50;
            xp = 20;
            winIncrement = 1;
            break;
        case 'LOSS':
            coins = 10;
            xp = 5;
            lossIncrement = 1;
            break;
    }

    const user = getUser(playerId);
    if (!user) return { coins: 0, xp: 0 };

    // Win streak bonus: +10% XP per streak level, capped at 50%
    if (result === 'WIN' && user.win_streak > 0) {
        const streakBonus = Math.min(0.5, user.win_streak * 0.1);
        xp = Math.floor(xp * (1 + streakBonus));
    }

    // Level up calculation
    let newLevel = user.level;
    let currentXp = user.xp + xp;
    let xpNeeded = getXpForNextLevel(newLevel);

    let safetyCounter = 0;
    while (currentXp >= xpNeeded) {
        currentXp -= xpNeeded;
        newLevel++;
        xpNeeded = getXpForNextLevel(newLevel);

        // Safety Break
        safetyCounter++;
        if (safetyCounter > 100) break;

        // Prevent infinite loop if somehow xpNeeded is 0
        if (xpNeeded <= 0) break;
    }

    updateUserStats(playerId, {
        coins: user.coins + coins,
        xp: currentXp,
        level: newLevel,
        wins: user.wins + winIncrement,
        losses: user.losses + lossIncrement,
        win_streak: winIncrement > 0 ? user.win_streak + 1 : 0,
        games_played: user.games_played + 1
    });

    return { coins, xp, newLevel: newLevel > user.level ? newLevel : undefined };
};
