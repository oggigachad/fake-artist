"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Palette, Users, Eye, Zap, Trophy, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const TUTORIAL_STEPS = [
    {
        icon: Palette,
        title: "Welcome to Fake Artist!",
        description: "A social deduction drawing game where everyone draws together — but one player is the imposter!",
        color: "from-pink-500 to-purple-500",
        tips: ["Create or join a room with friends", "Share the room code to invite others", "The host configures the game settings"],
    },
    {
        icon: Users,
        title: "How It Works",
        description: "All players receive the same word to draw — except the Fake Artist, who gets a different (or no) word!",
        color: "from-purple-500 to-indigo-500",
        tips: ["Everyone draws on the same canvas simultaneously", "Try to draw enough to prove you know the word", "But don't make it too obvious for the fake!"],
    },
    {
        icon: Eye,
        title: "Find the Fake",
        description: "After drawing, everyone votes on who they think the Fake Artist is. If the majority is correct, the Artists win!",
        color: "from-indigo-500 to-blue-500",
        tips: ["Watch how others draw — do they seem unsure?", "The fake will try to mimic others' drawings", "Discuss and vote wisely!"],
    },
    {
        icon: Zap,
        title: "Game Modes",
        description: "Choose from multiple game modes for variety!",
        color: "from-blue-500 to-cyan-500",
        tips: [
            "🎨 Fake Artist — classic mode (3+ players)",
            "🎯 Draw & Guess — take turns drawing (2 players)",
            "⚡ Speed Round — 15 seconds per round!",
            "👥 Team Mode — 2v2+ team play",
        ],
    },
    {
        icon: Trophy,
        title: "Earn & Unlock",
        description: "Play games to earn coins and XP. Level up and unlock special items in the shop!",
        color: "from-cyan-500 to-emerald-500",
        tips: [
            "Earn coins & XP after each game",
            "Buy special brushes and color packs",
            "Complete achievements for bonus rewards",
            "Climb the leaderboard!",
        ],
    },
];

const TUTORIAL_KEY = "fake_artist_tutorial_seen";

export default function TutorialModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [manualOpen, setManualOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const seen = localStorage.getItem(TUTORIAL_KEY);
            if (!seen) {
                setIsOpen(true);
            }
        }
    }, []);

    const closeTutorial = () => {
        setIsOpen(false);
        setStep(0);
        if (!manualOpen) {
            localStorage.setItem(TUTORIAL_KEY, "true");
        }
        setManualOpen(false);
    };

    const openTutorial = () => {
        setManualOpen(true);
        setStep(0);
        setIsOpen(true);
    };

    const nextStep = () => {
        if (step < TUTORIAL_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            closeTutorial();
        }
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const currentStep = TUTORIAL_STEPS[step];

    return (
        <>
            {/* Help button to reopen tutorial */}
            <button
                onClick={openTutorial}
                className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white transition-all touch-target"
                title="How to Play"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={(e) => e.target === e.currentTarget && closeTutorial()}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            {/* Header gradient */}
                            <div className={`bg-gradient-to-r ${currentStep.color} p-6 sm:p-8 relative`}>
                                <button
                                    onClick={closeTutorial}
                                    className="absolute top-3 right-3 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <motion.div
                                    key={step}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", duration: 0.5 }}
                                    className="flex flex-col items-center text-center"
                                >
                                    <div className="p-3 rounded-full bg-white/20 mb-3">
                                        <currentStep.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white">{currentStep.title}</h2>
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="p-5 sm:p-6 space-y-4">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p className="text-white/70 text-sm sm:text-base mb-4">{currentStep.description}</p>
                                        <ul className="space-y-2">
                                            {currentStep.tips.map((tip, i) => (
                                                <motion.li
                                                    key={i}
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="flex items-start gap-2 text-sm text-white/60"
                                                >
                                                    <span className="text-white/30 mt-0.5">•</span>
                                                    {tip}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Step indicators */}
                                <div className="flex justify-center gap-1.5 pt-2">
                                    {TUTORIAL_STEPS.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setStep(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${
                                                i === step ? "bg-white w-6" : "bg-white/20 hover:bg-white/40"
                                            }`}
                                        />
                                    ))}
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={prevStep}
                                        disabled={step === 0}
                                        className="text-white/50 hover:text-white disabled:opacity-20"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>

                                    <span className="text-xs text-white/30">
                                        {step + 1} / {TUTORIAL_STEPS.length}
                                    </span>

                                    <Button
                                        variant="gradient"
                                        onClick={nextStep}
                                    >
                                        {step === TUTORIAL_STEPS.length - 1 ? "Let's Play!" : "Next"}
                                        {step < TUTORIAL_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
