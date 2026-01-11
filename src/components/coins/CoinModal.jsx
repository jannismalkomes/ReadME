import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import CoinViewer from './CoinViewer';

export default function CoinModal({ milestone, isOpen, onClose, onRemove }) {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    if (!milestone) return null;

    const isMonthly = milestone.type === 'monthly';

    const handleRemoveClick = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmRemove = () => {
        onRemove(milestone.id);
        setShowConfirmDialog(false);
        onClose();
    };

    const handleCancelRemove = () => {
        setShowConfirmDialog(false);
    };

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
                            className="absolute top-8 right-0 z-10 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
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
                                        {isMonthly
                                            ? `${milestone.name}`
                                            : `${milestone.days} ${milestone.days === 1 ? 'Day' : 'Days'} Milestone`
                                        }
                                    </span>
                                </div>

                                {/* Remove button for monthly coins */}
                                {isMonthly && onRemove && (
                                    <button
                                        onClick={handleRemoveClick}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-300 transition-colors text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove Coin
                                    </button>
                                )}
                            </motion.div>
                        </div>

                        {/* Instructions */}
                        <p className="text-center text-zinc-600 text-sm pb-4">
                            Drag to rotate • Scroll to zoom
                        </p>

                        {/* Confirmation Dialog */}
                        <AnimatePresence>
                            {showConfirmDialog && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={handleCancelRemove}
                                        className="absolute inset-0 bg-black/70 z-20"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute inset-0 flex items-center justify-center z-30 p-4"
                                    >
                                        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 rounded-full bg-amber-500/20">
                                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-white">Remove Coin?</h3>
                                            </div>
                                            <p className="text-zinc-400 text-sm mb-6">
                                                This function is intended for coins that were wrongfully assigned to you.
                                                The coin cannot be restored after deletion.
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleCancelRemove}
                                                    className="flex-1 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleConfirmRemove}
                                                    className="flex-1 px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white transition-colors text-sm font-medium"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
