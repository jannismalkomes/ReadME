import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Award } from 'lucide-react';
import CoinCard from '@/components/coins/CoinCard';
import CoinModal from '@/components/coins/CoinModal';
import { getMilestonesWithAssets } from '@/components/coins/CoinMilestones';

export default function Gallery() {
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

    const { data: milestonesWithAssets = [] } = useQuery({
        queryKey: ['milestonesWithAssets'],
        queryFn: () => getMilestonesWithAssets(base44)
    });

    // Calculate days sober
    const daysSober = progress?.start_date
        ? Math.floor((new Date() - new Date(progress.start_date)) / (1000 * 60 * 60 * 24))
        : 0;

    const earnedMilestones = milestonesWithAssets.filter(m => daysSober >= m.days);
    const earnedIds = new Set(earnedMilestones.map(m => m.id));

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-lg bg-zinc-950/80 border-b border-zinc-800/50">
                <div className="flex items-center justify-between p-4 sm:p-6 max-w-4xl mx-auto">
                    <Link
                        to={createPageUrl('Home')}
                        className="p-2 -ml-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-zinc-400" />
                    </Link>
                    <h1 className="text-lg font-medium text-white">Coin Collection</h1>
                    <div className="w-10" />
                </div>
            </header>

            {/* Stats bar */}
            <div className="border-b border-zinc-800/50 bg-zinc-900/30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <span className="text-zinc-300">
                                <span className="text-white font-semibold">{earnedMilestones.length}</span>
                                <span className="text-zinc-500"> / {milestonesWithAssets.length} collected</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery grid */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {milestonesWithAssets.map((milestone, index) => (
                        <CoinCard
                            key={milestone.id}
                            milestone={milestone}
                            earned={earnedIds.has(milestone.id)}
                            onClick={() => setSelectedCoin(milestone)}
                            index={index}
                        />
                    ))}
                </div>

                {/* Empty state hint */}
                {earnedMilestones.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center mt-12 text-zinc-500"
                    >
                        <p>Complete your first day to unlock your first coin!</p>
                    </motion.div>
                )}
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