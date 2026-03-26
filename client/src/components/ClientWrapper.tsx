"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import ReconnectionBanner from "@/components/ReconnectionBanner";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary>
            <ReconnectionBanner />
            {children}
        </ErrorBoundary>
    );
}
