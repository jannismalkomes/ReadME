import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Calendar, Save, AlertTriangle, RotateCcw, Upload } from 'lucide-react';
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

export default function Settings() {
    const [startDate, setStartDate] = useState('');
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

    useEffect(() => {
        if (progress?.start_date) {
            setStartDate(progress.start_date);
        }
    }, [progress]);

    const saveMutation = useMutation({
        mutationFn: async (newStartDate) => {
            if (progress) {
                return base44.entities.UserProgress.update(progress.id, {
                    start_date: newStartDate,
                    collected_coins: progress.collected_coins || []
                });
            } else {
                return base44.entities.UserProgress.create({
                    start_date: newStartDate,
                    collected_coins: []
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userProgress']);
            setHasChanges(false);
        }
    });

    const resetMutation = useMutation({
        mutationFn: async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            if (progress) {
                return base44.entities.UserProgress.update(progress.id, {
                    start_date: today,
                    collected_coins: []
                });
            } else {
                return base44.entities.UserProgress.create({
                    start_date: today,
                    collected_coins: []
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userProgress']);
            setStartDate(format(new Date(), 'yyyy-MM-dd'));
            setHasChanges(false);
        }
    });

    const handleDateChange = (e) => {
        setStartDate(e.target.value);
        setHasChanges(true);
    };

    const handleSave = () => {
        saveMutation.mutate(startDate);
    };

    // Calculate current stats
    const daysSober = startDate
        ? Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24))
        : 0;

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
                {/* Start Date Setting */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Calendar className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">Start Date</h2>
                            <p className="text-sm text-zinc-500">When your journey began</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="startDate" className="text-zinc-400 text-sm">
                                Select your start date
                            </Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={handleDateChange}
                                max={format(new Date(), 'yyyy-MM-dd')}
                                className="mt-2 bg-zinc-800/50 border-zinc-700 text-white focus:border-amber-500 focus:ring-amber-500/20"
                            />
                        </div>

                        {startDate && (
                            <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                <p className="text-zinc-400 text-sm">
                                    With this date, you have been on your journey for{' '}
                                    <span className="text-amber-500 font-semibold">{daysSober} days</span>
                                </p>
                            </div>
                        )}

                        {hasChanges && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                            >
                                <Button
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Reset Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900/50 rounded-2xl border border-red-900/30 p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">Reset Progress</h2>
                            <p className="text-sm text-zinc-500">Start fresh from today</p>
                        </div>
                    </div>

                    <p className="text-zinc-400 text-sm mb-4">
                        If you need to start over, this will reset your start date to today and clear all collected coins. This action cannot be undone.
                    </p>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset My Progress
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                    This will reset your start date to today and clear all your collected coins. This is a fresh start - your journey begins anew.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => resetMutation.mutate()}
                                    className="bg-red-600 hover:bg-red-500"
                                >
                                    {resetMutation.isPending ? 'Resetting...' : 'Yes, Reset'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </motion.div>

                {/* Admin: Coin Upload */}
                {user?.role === 'admin' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Upload className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-white">Coin Assets</h2>
                                <p className="text-sm text-zinc-500">Upload 3D coin models</p>
                            </div>
                        </div>

                        <p className="text-zinc-400 text-sm mb-4">
                            Upload .glb files for each milestone coin to customize the 3D models displayed in the app.
                        </p>

                        <Link to={createPageUrl('CoinUpload')}>
                            <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white">
                                <Upload className="w-4 h-4 mr-2" />
                                Manage Coin Uploads
                            </Button>
                        </Link>
                    </motion.div>
                )}

                {/* About section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 text-center"
                >
                    <p className="text-zinc-600 text-sm">
                        Every day is a victory. Keep going. 💛
                    </p>
                </motion.div>
            </div>
        </div>
    );
}