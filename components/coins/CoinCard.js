import React from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle } from 'lucide-react';

export default function CoinCard({ milestone, earned, onClick, index = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            onClick={earned ? onClick : undefined}
            className={`
        relative aspect-square rounded-2xl overflow-hidden
        ${earned
                    ? 'cursor-pointer hover:scale-[1.02] transition-transform duration-300'
                    : 'opacity-40 cursor-not-allowed'
                }
      `}
            style={{
                background: earned
                    ? `linear-gradient(145deg, ${milestone.color}15, ${milestone.color}05)`
                    : 'linear-gradient(145deg, #1a1a1f, #0f0f12)'
            }}
        >
            {/* Glow effect for earned coins */}
            {earned && (
                <div
                    className="absolute inset-0 opacity-20 blur-xl"
                    style={{ backgroundColor: milestone.color }}
                />
            )}

            {/* Border */}
            <div
                className="absolute inset-0 rounded-2xl border"
                style={{
                    borderColor: earned ? `${milestone.color}40` : '#2a2a30'
                }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4">
                {/* Coin preview circle */}
                <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-3 flex items-center justify-center"
                    style={{
                        background: earned
                            ? `linear-gradient(145deg, ${milestone.color}, ${milestone.color}80)`
                            : 'linear-gradient(145deg, #2a2a30, #1a1a1f)',
                        boxShadow: earned
                            ? `0 4px 20px ${milestone.color}40`
                            : 'none'
                    }}
                >
                    {earned ? (
                        <span className="text-2xl sm:text-3xl font-bold text-white/90">
                            {milestone.days < 365 ? milestone.days : `${Math.floor(milestone.days / 365)}Y`}
                        </span>
                    ) : (
                        <Lock className="w-6 h-6 text-zinc-600" />
                    )}
                </div>

                {/* Milestone name */}
                <h3 className="text-sm sm:text-base font-semibold text-white/90 text-center">
                    {milestone.name}
                </h3>

                {/* Days required */}
                <p className="text-xs text-zinc-500 mt-1">
                    {milestone.days} {milestone.days === 1 ? 'day' : 'days'}
                </p>

                {/* Earned badge */}
                {earned && (
                    <div className="absolute top-3 right-3">
                        <CheckCircle
                            className="w-5 h-5"
                            style={{ color: milestone.color }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}