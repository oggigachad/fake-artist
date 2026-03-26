"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function ReconnectionBanner() {
    const { socket, isConnected, isReconnecting, reconnectAttempt } = useSocket();

    const showBanner = !isConnected || isReconnecting;

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="fixed top-0 left-0 right-0 z-[100] safe-top"
                >
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${
                        isReconnecting
                            ? "bg-yellow-500/90 text-yellow-950"
                            : "bg-red-500/90 text-white"
                    }`}>
                        {isReconnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Reconnecting... (attempt {reconnectAttempt}/10)</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" />
                                <span>Connection lost</span>
                                <button
                                    onClick={() => socket.connect()}
                                    className="ml-2 px-3 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition"
                                >
                                    Retry
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
