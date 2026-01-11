import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CoinViewer from './CoinViewer';

export default function CoinModal({ milestone, isOpen, onClose }) {
    if (!milestone) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-24 z-50 flex flex-col"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Content container */}
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {/* 3D Viewer */}
                            <div className="w-full max-w-lg aspect-square">
                                <CoinViewer
                                    glbUrl={milestone.glbUrl}
                                    autoRotate={true}
                                    accentColor={milestone.color}
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-center mt-6 px-4"
                            >
                                <h2
                                    className="text-3xl sm:text-4xl font-light text-white mb-2"
                                    style={{ textShadow: `0 0 30px ${milestone.color}50` }}
                                >
                                    {milestone.name}
                                </h2>
                                <p className="text-zinc-400 text-lg mb-3">
                                    {milestone.description}
                                </p>
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{ backgroundColor: `${milestone.color}20` }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: milestone.color }}
                                    />
                                    <span
                                        className="text-sm font-medium"
                                        style={{ color: milestone.color }}
                                    >
                                        {milestone.days} {milestone.days === 1 ? 'Day' : 'Days'} Milestone
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Instructions */}
                        <p className="text-center text-zinc-600 text-sm pb-4">
                            Drag to rotate • Scroll to zoom
                        </p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}