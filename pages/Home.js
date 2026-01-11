import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, Trophy, Sparkles } from 'lucide-react';
import DayCounter from '@/components/coins/DayCounter';
import CoinViewer from '@/components/coins/CoinViewer';
import CoinModal from '@/components/coins/CoinModal';
import { getLatestMilestone, getNextMilestone, getEarnedMilestones, getMilestonesWithAssets } from '@/components/coins/CoinMilestones';

export default function Home() {
    const [selectedCoin, setSelectedCoin] = useState(null);

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me()
    });

    const { data: progress } = useQuery({
        queryKey: ['userProgress', user?.email],
        queryFn: async () => {
            const results = await base44.entities.UserProgress.filter({ created_by: user.email });
            return results[0] || null;
        },
        enabled: !!user?.email
    });

    const { data: milestonesWithAssets } = useQuery({
        queryKey: ['milestonesWithAssets'],
        queryFn: () => getMilestonesWithAssets(base44)
    });

    // Calculate days sober
    const daysSober = progress?.start_date
        ? Math.floor((new Date() - new Date(progress.start_date)) / (1000 * 60 * 60 * 24))
        : 0;

    const milestones = milestonesWithAssets || [];
    const latestMilestone = milestones.filter(m => daysSober >= m.days).pop();
    const nextMilestone = milestones.find(m => daysSober < m.days);
    const earnedMilestones = milestones.filter(m => daysSober >= m.days);
    const daysToNext = nextMilestone ? nextMilestone.days - daysSober : null;

    // Progress percentage to next milestone
    const progressToNext = nextMilestone && latestMilestone
        ? ((daysSober - (latestMilestone?.days || 0)) / (nextMilestone.days - (latestMilestone?.days || 0))) * 100
        : nextMilestone
            ? (daysSober / nextMilestone.days) * 100
            : 100;

    if (!progress) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mx-auto mb-6 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-light text-white mb-4">Welcome to Your Journey</h1>
                    <p className="text-zinc-400 mb-8">
                        Set your start date in settings to begin tracking your progress and collecting coins.
                    </p>
                    <Link
                        to={createPageUrl('Settings')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
                    >
                        <Settings className="w-5 h-5" />
                        Set Start Date
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="flex justify-between items-center p-4 sm:p-6">
                <div className="w-10" />
                <Link
                    to={createPageUrl('Settings')}
                    className="p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                >
                    <Settings className="w-6 h-6 text-zinc-400" />
                </Link>
            </header>

            {/* Main content */}
            <div className="flex flex-col items-center justify-center px-4 pb-24">
                {/* Day counter */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 sm:mb-12"
                >
                    <DayCounter days={daysSober} />
                </motion.div>

                {/* Latest coin */}
                {latestMilestone && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="w-full max-w-xs sm:max-w-sm mb-8"
                    >
                        <p className="text-center text-zinc-500 text-sm mb-4 tracking-widest uppercase">
                            Latest Achievement
                        </p>
                        <div
                            className="aspect-square rounded-3xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                            style={{
                                background: `linear-gradient(145deg, ${latestMilestone.color}15, ${latestMilestone.color}05)`,
                                boxShadow: `0 0 80px ${latestMilestone.color}20`
                            }}
                            onClick={() => setSelectedCoin(latestMilestone)}
                        >
                            <CoinViewer
                                glbUrl={latestMilestone.glbUrl}
                                autoRotate={true}
                                accentColor={latestMilestone.color}
                                className="w-full h-full"
                            />
                        </div>
                        <div className="text-center mt-4">
                            <h2
                                className="text-2xl font-light text-white"
                                style={{ textShadow: `0 0 20px ${latestMilestone.color}40` }}
                            >
                                {latestMilestone.name}
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                {latestMilestone.description}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Progress to next milestone */}
                {nextMilestone && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="w-full max-w-xs sm:max-w-sm"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-500 text-sm">Next: {nextMilestone.name}</span>
                            <span className="text-zinc-400 text-sm">{daysToNext} days to go</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressToNext}%` }}
                                transition={{ delay: 0.7, duration: 0.8 }}
                                className="h-full rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${latestMilestone?.color || '#ffd700'}, ${nextMilestone.color})`
                                }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* View all coins button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-12"
                >
                    <Link
                        to={createPageUrl('Gallery')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-full text-white transition-colors border border-zinc-700/50"
                    >
                        <Trophy className="w-5 h-5 text-amber-500" />
                        View All Coins ({earnedMilestones.length} collected)
                    </Link>
                </motion.div>
            </div>

            {/* Coin modal */}
            <CoinModal
                milestone={selectedCoin}
                isOpen={!!selectedCoin}
                onClose={() => setSelectedCoin(null)}
            />
        </div>
    );
}