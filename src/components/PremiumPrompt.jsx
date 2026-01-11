import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, X, ExternalLink } from 'lucide-react';
import { isPremium } from '@/config/appVersion';

export default function PremiumPrompt() {
    const [showPopup, setShowPopup] = useState(false);

    // In premium version, return empty placeholder to maintain layout
    if (isPremium()) {
        return <div className="w-10" />;
    }

    return (
        <>
            {/* Diamond Icon Button */}
            <button
                onClick={() => setShowPopup(true)}
                className="p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
            >
                <Gem className="w-6 h-6 text-purple-400" />
            </button>

            {/* Popup Modal */}
            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                        onClick={() => setShowPopup(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-zinc-900 rounded-2xl border border-zinc-700/50 p-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setShowPopup(false)}
                                className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>

                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                                    <Gem className="w-10 h-10 text-purple-400" />
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-semibold text-white text-center mb-3">
                                Ad-Free by Design
                            </h2>

                            {/* Message */}
                            <p className="text-zinc-400 text-center text-sm leading-relaxed mb-6">
                                Like you, we are annoyed by flashy and distracting ads and decided to keep all our apps ad-free.
                                {'\n\n'}
                                To support our efforts and unlock unlimited habits and monthly coin collection, consider buying our affordable premium version.
                            </p>

                            {/* Premium benefits */}
                            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                                <h3 className="text-sm font-medium text-white mb-2">Premium Benefits:</h3>
                                <ul className="text-sm text-zinc-400 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> Unlimited habits
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> Monthly coin collection
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> Support indie development
                                    </li>
                                </ul>
                            </div>

                            {/* Get Premium Button */}
                            <button
                                onClick={() => {
                                    // Link to premium version on Play Store
                                    window.open('https://play.google.com/store/apps/details?id=app.cleancoin.premium', '_blank');
                                }}
                                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Get Premium
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
