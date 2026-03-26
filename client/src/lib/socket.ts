"use client";

import { io, Socket } from "socket.io-client";

// In development, the server is on port 3001
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export const socket: Socket = io(SERVER_URL, {
    autoConnect: false,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 10000,
});

// Auth helpers
const AUTH_TOKEN_KEY = 'fake_artist_token';
const AUTH_USER_KEY = 'fake_artist_user';

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getStoredUser(): { userId: string; username: string } | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(AUTH_USER_KEY);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
}

export function setStoredUser(userId: string, username: string): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ userId, username }));
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

export function authenticateSocket(): void {
    const token = getAuthToken();
    if (token && socket.connected) {
        socket.emit('authenticate', token);
    }
}

// Re-authenticate on reconnect
socket.on('connect', () => {
    const token = getAuthToken();
    if (token) {
        socket.emit('authenticate', token);
    }
});
