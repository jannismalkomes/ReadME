import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Calendar, Save, AlertTriangle, RotateCcw, Plus, Trash2, Edit2, Check, X, Gem, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { isPremium, getMaxHabits, isMonthlyCoinsEnabled } from '@/config/appVersion';

// Generate a unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Default habit colors
const habitColors = ['#ffd700', '#4a90d9', '#50c878', '#ff6b6b', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63'];

export default function Settings() {
    const [habits, setHabits] = useState([]);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDate, setNewHabitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [editingHabitId, setEditingHabitId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me()
    });

    const { data: progress, isLoading } = useQuery({
        queryKey: ['userProgress', user?.email],
        queryFn: async () => {
            const results = await base44.entities.UserProgress.filter({ created_by: user.email });
            return results[0] || null;
        },
        enabled: !!user?.email
    });

    // Initialize habits from progress
    useEffect(() => {
        if (progress) {
            // Migrate old data format to new habits format
            if (progress.habits && progress.habits.length > 0) {
                setHabits(progress.habits);
            } else if (progress.start_date) {
                // Migrate single start_date to habits array
                setHabits([{
                    id: 'main',
                    name: 'Sobriety',
                    start_date: progress.start_date,
                    color: habitColors[0]
                }]);
            }
        }
    }, [progress]);

    const saveMutation = useMutation({
        mutationFn: async (updatedHabits) => {
            // Find the earliest start date across all habits for the main start_date (backward compatibility)
            const earliestDate = updatedHabits.length > 0
                ? updatedHabits.reduce((earliest, habit) =>
                    habit.start_date < earliest ? habit.start_date : earliest,
                    updatedHabits[0].start_date
                )
                : null;

            if (progress) {
                return base44.entities.UserProgress.update(progress.id, {
                    start_date: earliestDate,
                    habits: updatedHabits,
                    collected_coins: progress.collected_coins || []
                });
            } else {
                return base44.entities.UserProgress.create({
                    start_date: earliestDate,
                    habits: updatedHabits,
                    collected_coins: []
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userProgress']);
            setHasChanges(false);
        }
    });

    const handleAddHabit = () => {
        if (!newHabitName.trim()) return;

        const newHabit = {
            id: generateId(),
            name: newHabitName.trim(),
            start_date: newHabitDate,
            color: habitColors[habits.length % habitColors.length]
        };

        const updatedHabits = [...habits, newHabit];
        setHabits(updatedHabits);
        setNewHabitName('');
        setNewHabitDate(format(new Date(), 'yyyy-MM-dd'));
        setHasChanges(true);
    };

    const handleRemoveHabit = (habitId) => {
        const updatedHabits = habits.filter(h => h.id !== habitId);
        setHabits(updatedHabits);
        setHasChanges(true);
    };

    const handleResetHabit = (habitId) => {
        const updatedHabits = habits.map(h =>
            h.id === habitId
                ? { ...h, start_date: format(new Date(), 'yyyy-MM-dd') }
                : h
        );
        setHabits(updatedHabits);
        setHasChanges(true);
    };

    const handleUpdateHabitDate = (habitId, newDate) => {
        const updatedHabits = habits.map(h =>
            h.id === habitId ? { ...h, start_date: newDate } : h
        );
        setHabits(updatedHabits);
        setHasChanges(true);
    };

    const handleStartEditing = (habit) => {
        setEditingHabitId(habit.id);
        setEditingName(habit.name);
    };

    const handleSaveEdit = () => {
        if (!editingName.trim()) return;
        const updatedHabits = habits.map(h =>
            h.id === editingHabitId ? { ...h, name: editingName.trim() } : h
        );
        setHabits(updatedHabits);
        setEditingHabitId(null);
        setEditingName('');
        setHasChanges(true);
    };

    const handleCancelEdit = () => {
        setEditingHabitId(null);
        setEditingName('');
    };

    const handleSave = () => {
        saveMutation.mutate(habits);
    };

    // Calculate days for a habit
    const getDaysForHabit = (habit) => {
        return habit.start_date
            ? Math.floor((new Date() - new Date(habit.start_date)) / (1000 * 60 * 60 * 24))
            : 0;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-lg bg-zinc-950/80 border-b border-zinc-800/50">
                <div className="flex items-center justify-between p-4 sm:p-6 max-w-2xl mx-auto">
                    <Link
                        to={createPageUrl('Home')}
                        className="p-2 -ml-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-zinc-400" />
                    </Link>
                    <h1 className="text-lg font-medium text-white">Settings</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                {/* Premium Upsell - Show in free version when habit limit reached */}
                {!isPremium() && habits.length >= getMaxHabits() ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/30 p-6 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Crown className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-white">Unlock More Habits</h2>
                                <p className="text-sm text-zinc-400">Upgrade to Premium</p>
                            </div>
                        </div>

                        <p className="text-zinc-300 text-sm mb-4">
                            You've reached the free version limit of {getMaxHabits()} habit. Upgrade to Premium to track unlimited habits and collect monthly coins!
                        </p>

                        <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
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

                        <Button
                            onClick={() => {
                                window.open('https://play.google.com/store/apps/details?id=app.cleancoin.premium', '_blank');
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white"
                        >
                            <Gem className="w-4 h-4 mr-2" />
                            Get Premium
                        </Button>
                    </motion.div>
                ) : (
                    /* Add New Habit - Show in premium or when free limit not reached */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <Plus className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-white">Add New Habit</h2>
                                <p className="text-sm text-zinc-500">Track multiple habits independently</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="habitName" className="text-zinc-400 text-sm">
                                    Habit Name
                                </Label>
                                <Input
                                    id="habitName"
                                    type="text"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    placeholder="e.g., No Alcohol, No Smoking, No Sugar..."
                                    className="mt-2 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-green-500 focus:ring-green-500/20"
                                />
                            </div>
                            <div>
                                <Label htmlFor="habitDate" className="text-zinc-400 text-sm">
                                    Start Date
                                </Label>
                                <Input
                                    id="habitDate"
                                    type="date"
                                    value={newHabitDate}
                                    onChange={(e) => setNewHabitDate(e.target.value)}
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    className="mt-2 bg-zinc-800/50 border-zinc-700 text-white focus:border-green-500 focus:ring-green-500/20"
                                />
                            </div>
                            <Button
                                onClick={handleAddHabit}
                                disabled={!newHabitName.trim()}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Habit
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Existing Habits */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Calendar className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">Your Habits</h2>
                            <p className="text-sm text-zinc-500">{habits.length} habit{habits.length !== 1 ? 's' : ''} being tracked</p>
                        </div>
                    </div>

                    {habits.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">
                            No habits yet. Add your first habit above!
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {habits.map((habit, index) => (
                                    <motion.div
                                        key={habit.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: habit.color }}
                                                />
                                                {editingHabitId === habit.id ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Input
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="bg-zinc-700 border-zinc-600 text-white h-8 text-sm"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-medium text-white">{habit.name}</h3>
                                                            <button
                                                                onClick={() => handleStartEditing(habit)}
                                                                className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <p className="text-sm text-zinc-500">
                                                            <span className="font-semibold" style={{ color: habit.color }}>
                                                                {getDaysForHabit(habit)} days
                                                            </span>
                                                            {' '}since {format(new Date(habit.start_date), 'MMM d, yyyy')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {editingHabitId !== habit.id && (
                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <Label className="text-zinc-500 text-xs">Update Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={habit.start_date}
                                                        onChange={(e) => handleUpdateHabitDate(habit.id, e.target.value)}
                                                        max={format(new Date(), 'yyyy-MM-dd')}
                                                        className="mt-1 bg-zinc-700/50 border-zinc-600 text-white text-sm h-9"
                                                    />
                                                </div>

                                                <div className="flex gap-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 border-orange-900/50 text-orange-400 hover:bg-orange-900/20 hover:text-orange-300"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                                Reset
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Reset "{habit.name}"?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will reset the start date to today. Your streak for this habit will start over.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleResetHabit(habit.id)}
                                                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                                                >
                                                                    Reset Habit
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    {habits.length > 1 && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete "{habit.name}"?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently remove this habit and its tracking data. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                                                                        Cancel
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleRemoveHabit(habit.id)}
                                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                                    >
                                                                        Delete Habit
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* Save Changes */}
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="sticky bottom-4"
                    >
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </motion.div>
                )}

                {/* Monthly Coin Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-zinc-900/50 rounded-2xl border border-blue-900/30 p-6 mt-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">Monthly Coins</h2>
                            <p className="text-sm text-zinc-500">How to earn them</p>
                        </div>
                    </div>

                    <p className="text-zinc-400 text-sm">
                        Monthly coins are earned when <strong className="text-white">all your habits</strong> remain unbroken throughout an entire calendar month. Keep all your streaks going to collect the monthly coin!
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
