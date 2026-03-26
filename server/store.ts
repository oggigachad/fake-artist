import { Room, GameConfig } from './types';

export const rooms: Map<string, Room> = new Map();

const DEFAULT_CONFIG: GameConfig = {
    drawingTime: 60,
    totalRounds: 2,
    minStrokes: 5,
    gameMode: 'fake-artist',
    difficulty: 'easy',
    maxPlayers: 8,
    wordPack: 'mixed',
};

export const createRoom = (roomId: string, hostId: string): Room => {
    const room: Room = {
        id: roomId,
        hostId,
        players: [],
        word: null,
        fakeWord: null,
        category: null,
        playerCanvases: new Map(),
        phase: 'LOBBY',
        fakeArtistId: null,
        config: { ...DEFAULT_CONFIG },
        currentRound: 0,
        roundStartTime: null,
        timerEndTime: null,
        votes: {},
        hasVoted: new Set(),
        gameStartTime: null,
        lastActivity: Date.now(),
        tiebreakersUsed: 0,
        locked: false,
        scores: [],
        chatMessages: [],
        undoStacks: new Map(),
    };
    rooms.set(roomId, room);
    return room;
};

export const getRoom = (roomId: string): Room | undefined => {
    return rooms.get(roomId);
};

export const deleteRoom = (roomId: string) => {
    rooms.delete(roomId);
};

// Cleanup stale rooms (no activity for 2 hours)
export const cleanupStaleRooms = (roomTimers: Map<string, NodeJS.Timeout>): number => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    rooms.forEach((room, roomId) => {
        if (now - room.lastActivity > TWO_HOURS) {
            const timer = roomTimers.get(roomId);
            if (timer) {
                clearInterval(timer);
                roomTimers.delete(roomId);
            }
            rooms.delete(roomId);
            cleaned++;
        }
    });

    return cleaned;
};
