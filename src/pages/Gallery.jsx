import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Award, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import CoinCard from '@/components/coins/CoinCard';
import CoinModal from '@/components/coins/CoinModal';
import { getMilestonesWithAssets, loadMonthlyCoins, getEarnedMonthlyCoinsWithHabits } from '@/components/coins/CoinMilestones';
import { ContextManager } from '@/components/coins/CoinPreview3D';
import { isMonthlyCoinsEnabled } from '@/config/appVersion';

// View categories
const VIEW_MILESTONES = 'milestones';
const VIEW_MONTHLY = 'monthly';

export default function Gallery() {
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [viewCategory, setViewCategory] = useState(VIEW_MILESTONES);
    const queryClient = useQueryClient();

    // Scroll to top when component mounts, reset context manager on unmount
    useEffect(() => {
        window.scrollTo(0, 0);

        // Reset WebGL context manager when leaving gallery
        return () => {
            ContextManager.reset();
        };
    }, []);

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
        queryFn: () => getMilestonesWithAssets()
    });

    const { data: monthlyCoins = [] } = useQuery({
        queryKey: ['monthlyCoins'],
        queryFn: () => loadMonthlyCoins()
    });

    // Get habits from progress
    const habits = useMemo(() => {
        if (!progress) return [];
        if (progress.habits && progress.habits.length > 0) {
            return progress.habits;
        }
        if (progress.start_date) {
            return [{
                id: 'main',
                name: 'Sobriety',
                start_date: progress.start_date,
                color: '#ffd700'
            }];
        }
        return [];
    }, [progress]);

    // Calculate days sober for each habit
    const habitStats = useMemo(() => {
        return habits.map(habit => {
            const daysSober = habit.start_date
                ? Math.floor((new Date() - new Date(habit.start_date)) / (1000 * 60 * 60 * 24))
                : 0;
            return { ...habit, daysSober };
        });
    }, [habits]);

    // Highest days for milestone display
    const highestDays = useMemo(() => {
        if (habitStats.length === 0) return 0;
        return Math.max(...habitStats.map(h => h.daysSober));
    }, [habitStats]);

    // Earned milestones (based on highest days)
    const earnedMilestones = milestonesWithAssets.filter(m => highestDays >= m.days);
    const earnedMilestoneIds = new Set(earnedMilestones.map(m => m.id));

    // Get persisted earned monthly coins (coins that were earned and saved permanently)
    const persistedEarnedMonthlyIds = useMemo(() => {
        return new Set(progress?.earnedMonthlyCoins || []);
    }, [progress]);

    // Calculate newly earned monthly coins based on current habits
    const newlyEarnedMonthlyCoins = useMemo(() => {
        return getEarnedMonthlyCoinsWithHabits(monthlyCoins, habits);
    }, [monthlyCoins, habits]);

    // Merge persisted + newly earned (persisted coins stay even if streak was broken)
    const earnedMonthlyCoins = useMemo(() => {
        if (!monthlyCoins || monthlyCoins.length === 0) return [];

        // Get IDs of newly earned coins
        const newlyEarnedIds = new Set(newlyEarnedMonthlyCoins.map(c => c.id));

        // Combine: all persisted + any newly earned
        const allEarnedIds = new Set([...persistedEarnedMonthlyIds, ...newlyEarnedIds]);

        // Return the full coin objects for all earned coins
        return monthlyCoins.filter(c => allEarnedIds.has(c.id));
    }, [monthlyCoins, newlyEarnedMonthlyCoins, persistedEarnedMonthlyIds]);

    const earnedMonthlyIds = new Set(earnedMonthlyCoins.map(c => c.id));

    // Mutation to remove a monthly coin
    const removeMonthlyCoinMutation = useMutation({
        mutationFn: async (coinId) => {
            if (!progress) return;
            const currentEarned = progress.earnedMonthlyCoins || [];
            const updatedEarned = currentEarned.filter(id => id !== coinId);
            return base44.entities.UserProgress.update(progress.id, {
                earnedMonthlyCoins: updatedEarned
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userProgress']);
        }
    });

    const handleRemoveMonthlyCoin = (coinId) => {
        removeMonthlyCoinMutation.mutate(coinId);
    };

    // Build view categories
    const viewCategories = useMemo(() => {
        const categories = [
            {
                id: VIEW_MILESTONES,
                label: 'Milestones',
                icon: Award,
                color: '#ffd700',
                count: earnedMilestones.length,
                total: milestonesWithAssets.length
            }
        ];

        // Only show monthly coins in premium version
        if (earnedMonthlyCoins.length > 0 && isMonthlyCoinsEnabled()) {
            categories.push({
                id: VIEW_MONTHLY,
                label: 'Monthly',
                icon: Calendar,
                color: '#4a90d9',
                count: earnedMonthlyCoins.length,
                total: earnedMonthlyCoins.length
            });
        }

        // Add individual habits
        habitStats.forEach((habit, index) => {
            const habitEarned = milestonesWithAssets.filter(m => habit.daysSober >= m.days);
            categories.push({
                id: `habit-${index}`,
                label: habit.name,
                icon: null,
                color: habit.color,
                count: habitEarned.length,
                total: milestonesWithAssets.length,
                habitIndex: index,
                daysSober: habit.daysSober
            });
        });

        return categories;
    }, [earnedMilestones, earnedMonthlyCoins, milestonesWithAssets, habitStats]);

    // Current category
    const currentCategoryIndex = viewCategories.findIndex(c => c.id === viewCategory);
    const currentCategory = viewCategories[currentCategoryIndex] || viewCategories[0];

    // Navigate categories
    const goToPrevCategory = () => {
        const newIndex = currentCategoryIndex > 0 ? currentCategoryIndex - 1 : viewCategories.length - 1;
        setViewCategory(viewCategories[newIndex].id);
    };

    const goToNextCategory = () => {
        const newIndex = currentCategoryIndex < viewCategories.length - 1 ? currentCategoryIndex + 1 : 0;
        setViewCategory(viewCategories[newIndex].id);
    };

    // Get coins to display based on category
    const displayCoins = useMemo(() => {
        if (currentCategory.id === VIEW_MILESTONES) {
            return {
                coins: milestonesWithAssets,
                earnedIds: earnedMilestoneIds,
                title: 'Milestone Coins',
                subtitle: 'Earned by reaching day milestones'
            };
        }

        if (currentCategory.id === VIEW_MONTHLY) {
            return {
                coins: earnedMonthlyCoins,
                earnedIds: earnedMonthlyIds,
                title: 'Monthly Coins',
                subtitle: 'Earned by keeping all habits clean for entire months'
            };
        }

        // Individual habit view
        if (currentCategory.id.startsWith('habit-')) {
            const habit = habitStats[currentCategory.habitIndex];
            if (!habit) return { coins: [], earnedIds: new Set(), title: '', subtitle: '' };

            const habitEarnedIds = new Set(
                milestonesWithAssets.filter(m => habit.daysSober >= m.days).map(m => m.id)
            );

            return {
                coins: milestonesWithAssets,
                earnedIds: habitEarnedIds,
                title: `${habit.name} Coins`,
                subtitle: `${habit.daysSober} days • ${habitEarnedIds.size} coins earned`
            };
        }

        return { coins: [], earnedIds: new Set(), title: '', subtitle: '' };
    }, [currentCategory, milestonesWithAssets, earnedMilestoneIds, earnedMonthlyCoins, earnedMonthlyIds, habitStats]);

    // Total earned across all categories
    const totalEarned = earnedMilestones.length + earnedMonthlyCoins.length;

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

            {/* Category tabs */}
            <div className="border-b border-zinc-800/50 bg-zinc-900/30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {viewCategories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setViewCategory(category.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${viewCategory === category.id
                                    ? 'text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                style={{
                                    backgroundColor: viewCategory === category.id ? `${category.color}20` : 'transparent',
                                    borderColor: viewCategory === category.id ? `${category.color}40` : 'transparent',
                                    borderWidth: '1px'
                                }}
                            >
                                {category.icon && (
                                    <category.icon
                                        className="w-4 h-4"
                                        style={{ color: viewCategory === category.id ? category.color : undefined }}
                                    />
                                )}
                                {!category.icon && (
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                )}
                                <span>{category.label}</span>
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: viewCategory === category.id ? `${category.color}30` : 'rgba(255,255,255,0.1)',
                                        color: viewCategory === category.id ? category.color : undefined
                                    }}
                                >
                                    {category.count}/{category.total}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gallery grid */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Section header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-white flex items-center gap-2">
                            {currentCategory.icon && (
                                <currentCategory.icon
                                    className="w-5 h-5"
                                    style={{ color: currentCategory.color }}
                                />
                            )}
                            {!currentCategory.icon && (
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: currentCategory.color }}
                                />
                            )}
                            {displayCoins.title}
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">{displayCoins.subtitle}</p>
                    </div>

                    {/* Navigation */}
                    {viewCategories.length > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goToPrevCategory}
                                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <button
                                onClick={goToNextCategory}
                                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Coins grid */}
                <motion.div
                    key={viewCategory}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                    {displayCoins.coins.map((coin, index) => (
                        <CoinCard
                            key={coin.id}
                            milestone={coin}
                            earned={displayCoins.earnedIds.has(coin.id)}
                            onClick={() => setSelectedCoin(coin)}
                            index={index}
                        />
                    ))}
                </motion.div>

                {/* Empty state */}
                {displayCoins.coins.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center py-12 text-zinc-500"
                    >
                        <p>No coins in this category yet.</p>
                    </motion.div>
                )}

                {/* Total earned hint */}
                {displayCoins.earnedIds.size === 0 && displayCoins.coins.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center mt-8 text-zinc-500"
                    >
                        <p>Keep going to unlock your first coin in this category!</p>
                    </motion.div>
                )}
            </div>

            {/* Coin modal */}
            <CoinModal
                milestone={selectedCoin}
                isOpen={!!selectedCoin}
                onClose={() => setSelectedCoin(null)}
                onRemove={selectedCoin?.type === 'monthly' ? handleRemoveMonthlyCoin : undefined}
            />
        </div>
    );
}
