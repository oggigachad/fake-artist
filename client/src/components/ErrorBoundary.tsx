"use client";

import React from "react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-8">
                    <div className="text-center space-y-4 max-w-md">
                        <h1 className="text-4xl font-bold text-red-400">Something went wrong</h1>
                        <p className="text-white/60">{this.state.error?.message || "An unexpected error occurred."}</p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.href = '/';
                            }}
                            className="px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
