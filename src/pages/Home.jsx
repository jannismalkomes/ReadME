import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, Trophy, Sparkles, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import DayCounter from '@/components/coins/DayCounter';
import CoinViewer from '@/components/coins/CoinViewer';
import CoinModal from '@/components/coins/CoinModal';
import { getMilestonesWithAssets, loadMonthlyCoins, getEarnedMonthlyCoinsWithHabits, getNextMonthlyCoinWithHabits, getMonthName } from '@/components/coins/CoinMilestones';
import PremiumPrompt from '@/components/PremiumPrompt';
import { isMonthlyCoinsEnabled } from '@/config/appVersion';

// View modes: 'milestone', 'monthly', 'habit-0', 'habit-1', etc.
const VIEW_MILESTONE = 'milestone';
const VIEW_MONTHLY = 'monthly';

export default function Home() {
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [viewMode, setViewMode] = useState(VIEW_MILESTONE);
    const queryClient = useQueryClient();

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
        queryFn: () => getMilestonesWithAssets()
    });

    const { data: monthlyCoins = [] } = useQuery({
        queryKey: ['monthlyCoins'],
        queryFn: () => loadMonthlyCoins()
    });

    // Get habits from progress (or migrate from old format)
    const habits = useMemo(() => {
        if (!progress) return [];
        if (progress.habits && progress.habits.length > 0) {
            return progress.habits;
        }
        // Migrate old format
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

    // Find the habit with highest days (for milestone coin display)
    const highestDaysHabit = useMemo(() => {
        if (habitStats.length === 0) return null;
        return habitStats.reduce((max, habit) =>
            habit.daysSober > max.daysSober ? habit : max
            , habitStats[0]);
    }, [habitStats]);

    // Use the highest days for milestone calculations
    const daysSober = highestDaysHabit?.daysSober || 0;

    const milestones = milestonesWithAssets || [];
    const latestMilestone = milestones.filter(m => daysSober >= m.days).pop();
    const nextMilestone = milestones.find(m => daysSober < m.days);
    const earnedMilestones = milestones.filter(m => daysSober >= m.days);
    const daysToNext = nextMilestone ? nextMilestone.days - daysSober : null;

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

    // Mutation to save newly earned monthly coins
    const saveEarnedCoinsMutation = useMutation({
        mutationFn: async (coinIds) => {
            if (!progress) return;
            return base44.entities.UserProgress.update(progress.id, {
                earnedMonthlyCoins: coinIds
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userProgress']);
        }
    });

    // Auto-save newly earned monthly coins when they're detected
    useEffect(() => {
        if (!progress || newlyEarnedMonthlyCoins.length === 0) return;

        const currentPersisted = progress.earnedMonthlyCoins || [];
        const newlyEarnedIds = newlyEarnedMonthlyCoins.map(c => c.id);

        // Check if there are new coins that aren't persisted yet
        const newCoinsToSave = newlyEarnedIds.filter(id => !currentPersisted.includes(id));

        if (newCoinsToSave.length > 0) {
            // Merge and save
            const allEarnedIds = [...new Set([...currentPersisted, ...newlyEarnedIds])];
            saveEarnedCoinsMutation.mutate(allEarnedIds);
        }
    }, [newlyEarnedMonthlyCoins, progress]);

    const latestMonthlyCoin = earnedMonthlyCoins.length > 0 ? earnedMonthlyCoins[earnedMonthlyCoins.length - 1] : null;
    const nextMonthlyCoin = useMemo(() => {
        return getNextMonthlyCoinWithHabits(monthlyCoins, habits);
    }, [monthlyCoins, habits]);

    // Calculate monthly progress
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysInMonth = Math.floor((nextMonthStart - currentMonthStart) / (1000 * 60 * 60 * 24));
    const dayOfMonth = now.getDate();
    const monthlyProgress = (dayOfMonth / daysInMonth) * 100;
    const daysLeftInMonth = daysInMonth - dayOfMonth;
    const currentMonthName = getMonthName(now.getMonth() + 1);

    // Check if user is eligible for current month's coin (at least one habit existed before this month)
    const isEligibleForCurrentMonth = useMemo(() => {
        if (habits.length === 0) return false;
        // At least one habit must have existed before the current month
        // (habits added during the month don't count for this month's coin)
        const habitsBeforeThisMonth = habits.filter(habit => {
            const habitStart = new Date(habit.start_date);
            return habitStart < currentMonthStart;
        });
        // Must have at least one habit from before the month, and all those habits must be clean
        return habitsBeforeThisMonth.length > 0 && habitsBeforeThisMonth.every(habit => {
            const habitStart = new Date(habit.start_date);
            return habitStart <= currentMonthStart;
        });
    }, [habits, currentMonthStart]);

    // Build view options
    const viewOptions = useMemo(() => {
        const options = [];
        if (latestMilestone) {
            options.push({ id: VIEW_MILESTONE, type: 'milestone', label: 'Highest Milestone', icon: Award, color: '#ffd700' });
        }
        // Only show monthly coins in premium version
        if (latestMonthlyCoin && isMonthlyCoinsEnabled()) {
            options.push({ id: VIEW_MONTHLY, type: 'monthly', label: 'Latest Monthly', icon: Calendar, color: '#4a90d9' });
        }
        habitStats.forEach((habit, index) => {
            options.push({
                id: `habit-${index}`,
                type: 'habit',
                label: habit.name,
                habitIndex: index,
                color: habit.color,
                daysSober: habit.daysSober
            });
        });
        return options;
    }, [latestMilestone, latestMonthlyCoin, habitStats]);

    // Get current view index
    const currentViewIndex = viewOptions.findIndex(opt => opt.id === viewMode);
    const currentView = viewOptions[currentViewIndex] || viewOptions[0];

    // Navigate views
    const goToPrevView = () => {
        const newIndex = currentViewIndex > 0 ? currentViewIndex - 1 : viewOptions.length - 1;
        setViewMode(viewOptions[newIndex].id);
    };

    const goToNextView = () => {
        const newIndex = currentViewIndex < viewOptions.length - 1 ? currentViewIndex + 1 : 0;
        setViewMode(viewOptions[newIndex].id);
    };

    // Determine what to display based on view mode
    const displayData = useMemo(() => {
        if (!currentView) return null;

        if (currentView.type === 'milestone' && latestMilestone) {
            return {
                coin: latestMilestone,
                dayCount: daysSober,
                label: 'Highest Milestone',
                sublabel: `${earnedMilestones.length} milestone${earnedMilestones.length !== 1 ? 's' : ''} earned`
            };
        }

        if (currentView.type === 'monthly' && latestMonthlyCoin) {
            return {
                coin: latestMonthlyCoin,
                dayCount: daysSober,
                label: 'Latest Monthly Coin',
                sublabel: `${earnedMonthlyCoins.length} monthly coin${earnedMonthlyCoins.length !== 1 ? 's' : ''} collected`
            };
        }

        if (currentView.type === 'habit') {
            const habit = habitStats[currentView.habitIndex];
            if (!habit) return null;

            // Find the highest milestone this habit has earned
            const habitMilestone = milestones.filter(m => habit.daysSober >= m.days).pop();
            // Find the next milestone for this habit
            const habitNextMilestone = milestones.find(m => habit.daysSober < m.days);
            // Count earned milestones for this habit
            const habitEarnedCount = milestones.filter(m => habit.daysSober >= m.days).length;

            return {
                coin: habitMilestone || null,
                dayCount: habit.daysSober,
                label: habit.name,
                sublabel: habitMilestone ? `${habitEarnedCount} milestone${habitEarnedCount !== 1 ? 's' : ''} earned` : 'Keep going!',
                habitColor: habit.color,
                nextMilestone: habitNextMilestone,
                currentMilestone: habitMilestone,
                startDate: habit.start_date
            };
        }

        return null;
    }, [currentView, latestMilestone, latestMonthlyCoin, daysSober, earnedMilestones, earnedMonthlyCoins, habitStats, milestones]);

    // Progress percentage to next milestone
    const progressToNext = nextMilestone && latestMilestone
        ? ((daysSober - (latestMilestone?.days || 0)) / (nextMilestone.days - (latestMilestone?.days || 0))) * 100
        : nextMilestone
            ? (daysSober / nextMilestone.days) * 100
            : 100;

    // Total earned coins
    const totalEarned = earnedMilestones.length + earnedMonthlyCoins.length;

    if (!progress || habits.length === 0) {
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
                        Add your first habit in settings to begin tracking your progress and collecting coins.
                    </p>
                    <Link
                        to={createPageUrl('Settings')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
                    >
                        <Settings className="w-5 h-5" />
                        Add Your First Habit
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="flex justify-between items-center p-4 sm:p-6">
                <PremiumPrompt />
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
                    <DayCounter days={displayData?.dayCount || 0} />
                </motion.div>

                {/* View toggle indicators */}
                {viewOptions.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-2 mb-4"
                    >
                        {viewOptions.map((opt, index) => (
                            <button
                                key={opt.id}
                                onClick={() => setViewMode(opt.id)}
                                className={`w-2 h-2 rounded-full transition-all ${viewMode === opt.id
                                    ? 'w-6'
                                    : 'opacity-40 hover:opacity-70'
                                    }`}
                                style={{ backgroundColor: opt.color }}
                            />
                        ))}
                    </motion.div>
                )}

                {/* Latest coin display */}
                {displayData && (
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-full max-w-xs sm:max-w-sm mb-8"
                    >
                        <p className="text-center text-zinc-500 text-sm mb-4 tracking-widest uppercase">
                            {displayData.label}
                        </p>

                        <div
                            className="aspect-square rounded-3xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform relative"
                            style={{
                                background: displayData.coin
                                    ? `linear-gradient(145deg, ${displayData.coin.color}15, ${displayData.coin.color}05)`
                                    : `linear-gradient(145deg, ${displayData.habitColor || '#ffd700'}15, ${displayData.habitColor || '#ffd700'}05)`,
                                boxShadow: displayData.coin
                                    ? `0 0 80px ${displayData.coin.color}20`
                                    : `0 0 80px ${displayData.habitColor || '#ffd700'}20`
                            }}
                            onClick={() => displayData.coin && setSelectedCoin(displayData.coin)}
                        >
                            {displayData.coin ? (
                                <CoinViewer
                                    glbUrl={displayData.coin.glbUrl}
                                    autoRotate={true}
                                    accentColor={displayData.coin.color}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div
                                            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(145deg, ${displayData.habitColor}40, ${displayData.habitColor}20)`,
                                                border: `2px solid ${displayData.habitColor}40`
                                            }}
                                        >
                                            <span className="text-3xl font-bold text-white">{displayData.dayCount}</span>
                                        </div>
                                        <p className="text-zinc-500 text-sm">Days strong</p>
                                    </div>
                                </div>
                            )}

                            {/* Navigation arrows */}
                            {viewOptions.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goToPrevView(); }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goToNextView(); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-white" />
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="text-center mt-4">
                            <h2
                                className="text-2xl font-light text-white"
                                style={{ textShadow: `0 0 20px ${displayData.coin?.color || displayData.habitColor || '#ffd700'}40` }}
                            >
                                {displayData.coin?.name || displayData.label}
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                {displayData.sublabel}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Progress to next milestone */}
                {nextMilestone && currentView?.type === 'milestone' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="w-full max-w-xs sm:max-w-sm"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-500 text-sm flex items-center gap-1">
                                <Award className="w-4 h-4 text-amber-500" />
                                Next: {nextMilestone.name}
                            </span>
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

                {/* Monthly progress bar */}
                {isEligibleForCurrentMonth && (currentView?.type === 'milestone' || currentView?.type === 'monthly') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="w-full max-w-xs sm:max-w-sm mt-6"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-500 text-sm flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                {currentMonthName} Progress
                            </span>
                            <span className="text-zinc-400 text-sm">{daysLeftInMonth} days left</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${monthlyProgress}%` }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                            />
                        </div>
                        <p className="text-xs text-zinc-600 mt-1 text-center">
                            Keep all {habits.length} habit{habits.length !== 1 ? 's' : ''} going to earn the {currentMonthName} coin
                        </p>
                    </motion.div>
                )}

                {/* Individual habits overview on milestone tab */}
                {currentView?.type === 'milestone' && habitStats.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="w-full max-w-xs sm:max-w-sm mt-6 space-y-3"
                    >
                        <p className="text-zinc-500 text-xs uppercase tracking-widest text-center mb-2">
                            Habit Streaks
                        </p>
                        {habitStats.map((habit, index) => {
                            const habitMilestone = milestones.filter(m => habit.daysSober >= m.days).pop();
                            const habitNextMilestone = milestones.find(m => habit.daysSober < m.days);
                            const habitProgress = habitNextMilestone && habitMilestone
                                ? ((habit.daysSober - habitMilestone.days) / (habitNextMilestone.days - habitMilestone.days)) * 100
                                : habitNextMilestone
                                    ? (habit.daysSober / habitNextMilestone.days) * 100
                                    : 100;

                            return (
                                <div
                                    key={habit.id}
                                    className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: habit.color }}
                                            />
                                            <span className="text-zinc-300 text-sm font-medium">{habit.name}</span>
                                        </div>
                                        <span
                                            className="text-sm font-semibold"
                                            style={{ color: habit.color }}
                                        >
                                            {habit.daysSober} days
                                        </span>
                                    </div>
                                    {habitNextMilestone && (
                                        <div className="space-y-1">
                                            <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${habitProgress}%` }}
                                                    transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: habit.color }}
                                                />
                                            </div>
                                            <p className="text-xs text-zinc-600">
                                                {habitNextMilestone.days - habit.daysSober} days to {habitNextMilestone.name}
                                            </p>
                                        </div>
                                    )}
                                    {!habitNextMilestone && (
                                        <p className="text-xs text-zinc-500">All milestones earned! 🎉</p>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Individual habit progress */}
                {currentView?.type === 'habit' && displayData && (
                    <motion.div
                        key={`habit-progress-${viewMode}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="w-full max-w-xs sm:max-w-sm space-y-4"
                    >
                        {/* Next milestone progress for this habit */}
                        {displayData.nextMilestone && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-zinc-500 text-sm flex items-center gap-1">
                                        <Award className="w-4 h-4" style={{ color: displayData.habitColor }} />
                                        Next: {displayData.nextMilestone.name}
                                    </span>
                                    <span className="text-zinc-400 text-sm">
                                        {displayData.nextMilestone.days - displayData.dayCount} days to go
                                    </span>
                                </div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${displayData.currentMilestone
                                                ? ((displayData.dayCount - displayData.currentMilestone.days) / (displayData.nextMilestone.days - displayData.currentMilestone.days)) * 100
                                                : (displayData.dayCount / displayData.nextMilestone.days) * 100}%`
                                        }}
                                        transition={{ delay: 0.7, duration: 0.8 }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: `linear-gradient(90deg, ${displayData.currentMilestone?.color || displayData.habitColor}, ${displayData.nextMilestone.color})`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Habit start date info */}
                        <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 text-sm">Started</span>
                                <span className="text-zinc-300 text-sm font-medium">
                                    {new Date(displayData.startDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
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
                        View All Coins ({totalEarned} collected)
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
