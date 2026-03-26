import db, { getUser } from './db';

const SHOP_ITEMS: Record<string, { type: string; name: string; price: number }> = {
    // Brushes
    'brush_neon': { type: 'brush', name: 'Neon Brush', price: 200 },
    'brush_fire': { type: 'brush', name: 'Fire Stroke', price: 800 },
    'brush_pixel': { type: 'brush', name: 'Pixel Brush', price: 500 },
    // Colors
    'color_gold': { type: 'color', name: 'Gold Ink', price: 500 },
    'color_plasma': { type: 'color', name: 'Plasma Gradient', price: 1000 },
    'color_galaxy': { type: 'color', name: 'Galaxy Paint', price: 2000 },
    // Avatars
    'avatar_spy': { type: 'avatar', name: 'Spy Avatar', price: 300 },
    'avatar_ghost': { type: 'avatar', name: 'Ghost Avatar', price: 300 },
    'avatar_meme': { type: 'avatar', name: 'Meme Face', price: 300 },
    // Titles
    'title_fake_detector': { type: 'title', name: 'Fake Detector', price: 500 },
    'title_sketch_master': { type: 'title', name: 'Sketch Master', price: 1000 },
    'title_uncatchable': { type: 'title', name: 'Uncatchable', price: 2000 },
};

// Valid item IDs for server-side brush/color ownership checks
export const VALID_BRUSH_IDS = new Set(['brush_neon', 'brush_fire', 'brush_pixel']);
export const VALID_COLOR_IDS = new Set(['color_gold', 'color_plasma', 'color_galaxy']);

export const getShopItems = () => SHOP_ITEMS;

export const buyItem = (userId: string, itemId: string) => {
    const item = SHOP_ITEMS[itemId];
    if (!item) return { success: false, message: "Item not found" };

    const user = getUser(userId);
    if (!user) return { success: false, message: "User not found" };

    if (user.coins < item.price) {
        return { success: false, message: "Not enough coins" };
    }

    const owned = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);
    if (owned) return { success: false, message: "Item already owned" };

    try {
        const transaction = db.transaction(() => {
            db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(item.price, userId);
            db.prepare('INSERT INTO inventory (user_id, item_id, type) VALUES (?, ?, ?)').run(userId, itemId, item.type);
        });
        transaction();

        // Re-fetch to get accurate balance
        const updatedUser = getUser(userId);
        return { success: true, message: `Purchased ${item.name}`, remainingCoins: updatedUser?.coins ?? 0 };
    } catch (error) {
        console.error('Purchase error:', error);
        return { success: false, message: "Transaction failed" };
    }
};

export const getInventory = (userId: string) => {
    return db.prepare('SELECT * FROM inventory WHERE user_id = ?').all(userId);
};

export const equipItem = (userId: string, itemId: string) => {
    const item = SHOP_ITEMS[itemId];
    if (!item) return { success: false, message: "Item not found" };

    const owned = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId);
    if (!owned) return { success: false, message: "Item not owned" };

    const transaction = db.transaction(() => {
        db.prepare('UPDATE inventory SET equipped = 0 WHERE user_id = ? AND type = ?').run(userId, item.type);
        db.prepare('UPDATE inventory SET equipped = 1 WHERE user_id = ? AND item_id = ?').run(userId, itemId);
    });
    transaction();

    return { success: true, message: `Equipped ${item.name}` };
};

// Server-side brush ownership verification
export const playerOwnsBrush = (userId: string, brushType: string): boolean => {
    const brushId = `brush_${brushType}`;
    if (!VALID_BRUSH_IDS.has(brushId)) return false;
    const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 1').get(userId, brushId);
    return !!owned;
};

export const playerOwnsColor = (userId: string, colorName: string): boolean => {
    const colorId = `color_${colorName}`;
    if (!VALID_COLOR_IDS.has(colorId)) return false;
    const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 1').get(userId, colorId);
    return !!owned;
};
