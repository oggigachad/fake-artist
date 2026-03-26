"use client";

import { useEffect, useState, useCallback } from "react";
import { socket, getAuthToken, setAuthToken, setStoredUser, getStoredUser, clearAuth, authenticateSocket } from "../lib/socket";
import { AuthResult } from "@/types";

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        // Restore stored auth state
        const stored = getStoredUser();
        if (stored) {
            setUserId(stored.userId);
            setUsername(stored.username);
        }

        function onConnect() {
            setIsConnected(true);
            setIsReconnecting(false);
            setReconnectAttempt(0);
            authenticateSocket();
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onReconnectAttempt(attempt: number) {
            setIsReconnecting(true);
            setReconnectAttempt(attempt);
        }

        function onReconnectFailed() {
            setIsReconnecting(false);
            setReconnectAttempt(0);
        }

        function onAuthResult(result: AuthResult) {
            if (result.success && result.userId && result.username) {
                setIsAuthenticated(true);
                setUserId(result.userId);
                setUsername(result.username);
                setStoredUser(result.userId, result.username);
                if (result.token) {
                    setAuthToken(result.token);
                }
            } else {
                setIsAuthenticated(false);
            }
        }

        function onError(msg: string) {
            console.error('Socket error:', msg);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("auth_result", onAuthResult);
        socket.on("error", onError);
        socket.io.on("reconnect_attempt", onReconnectAttempt);
        socket.io.on("reconnect_failed", onReconnectFailed);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("auth_result", onAuthResult);
            socket.off("error", onError);
            socket.io.off("reconnect_attempt", onReconnectAttempt);
            socket.io.off("reconnect_failed", onReconnectFailed);
        };
    }, []);

    const loginAsGuest = useCallback((name: string) => {
        if (!socket.connected) socket.connect();
        // Wait for connection then authenticate
        const tryAuth = () => {
            socket.emit('guest_login', name);
        };
        if (socket.connected) {
            tryAuth();
        } else {
            socket.once('connect', tryAuth);
        }
    }, []);

    const login = useCallback((email: string, password: string) => {
        if (!socket.connected) socket.connect();
        const tryAuth = () => {
            socket.emit('login', email, password);
        };
        if (socket.connected) tryAuth();
        else socket.once('connect', tryAuth);
    }, []);

    const register = useCallback((username: string, email: string, password: string) => {
        if (!socket.connected) socket.connect();
        const tryAuth = () => {
            socket.emit('register', username, email, password);
        };
        if (socket.connected) tryAuth();
        else socket.once('connect', tryAuth);
    }, []);

    const logout = useCallback(() => {
        clearAuth();
        setIsAuthenticated(false);
        setUserId(null);
        setUsername(null);
    }, []);

    return { socket, isConnected, isAuthenticated, isReconnecting, reconnectAttempt, userId, username, loginAsGuest, login, register, logout };
};
