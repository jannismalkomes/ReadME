import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Check, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CoinViewer from '@/components/coins/CoinViewer';
import { MILESTONES } from '@/components/coins/CoinMilestones';

export default function CoinUpload() {
    const [uploadingId, setUploadingId] = useState(null);
    const [previewCoin, setPreviewCoin] = useState(null);
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me()
    });

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    const { data: coinAssets = [] } = useQuery({
        queryKey: ['coinAssets'],
        queryFn: () => base44.entities.CoinAsset.list()
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ milestoneId, milestoneName, file }) => {
            // Upload the file
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // Check if asset already exists for this milestone
            const existing = coinAssets.find(a => a.milestone_id === milestoneId);

            if (existing) {
                // Update existing
                return base44.entities.CoinAsset.update(existing.id, {
                    glb_url: file_url,
                    milestone_name: milestoneName
                });
            } else {
                // Create new
                return base44.entities.CoinAsset.create({
                    milestone_id: milestoneId,
                    glb_url: file_url,
                    milestone_name: milestoneName
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['coinAssets']);
            setUploadingId(null);
        },
        onError: (error) => {
            console.error('Upload failed:', error);
            setUploadingId(null);
        }
    });

    const handleFileSelect = (milestone, event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.glb')) {
            alert('Please upload a .glb file');
            return;
        }

        setUploadingId(milestone.id);
        uploadMutation.mutate({
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            file
        });
    };

    const getAssetForMilestone = (milestoneId) => {
        return coinAssets.find(a => a.milestone_id === milestoneId);
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-light text-white mb-2">Admin Access Required</h2>
                    <p className="text-zinc-500 mb-6">Only administrators can upload coin assets</p>
                    <Link
                        to={createPageUrl('Home')}
                        className="text-amber-500 hover:text-amber-400"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-lg bg-zinc-950/80 border-b border-zinc-800/50">
                <div className="flex items-center justify-between p-4 sm:p-6 max-w-6xl mx-auto">
                    <Link
                        to={createPageUrl('Settings')}
                        className="p-2 -ml-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-zinc-400" />
                    </Link>
                    <h1 className="text-lg font-medium text-white">Coin Asset Upload</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8"
                >
                    <p className="text-amber-200/90 text-sm">
                        Upload .glb files for each milestone coin. These 3D models will be displayed when users achieve each milestone.
                    </p>
                </motion.div>

                {/* Upload grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MILESTONES.map((milestone, index) => {
                        const asset = getAssetForMilestone(milestone.id);
                        const isUploading = uploadingId === milestone.id;
                        const hasAsset = !!asset;

                        return (
                            <motion.div
                                key={milestone.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden"
                            >
                                {/* Preview area */}
                                <div
                                    className="aspect-square relative"
                                    style={{
                                        background: hasAsset
                                            ? `linear-gradient(145deg, ${milestone.color}10, ${milestone.color}05)`
                                            : 'linear-gradient(145deg, #1a1a1f, #0f0f12)'
                                    }}
                                >
                                    {hasAsset && (
                                        <>
                                            <CoinViewer
                                                glbUrl={asset.glb_url}
                                                autoRotate={true}
                                                accentColor={milestone.color}
                                                className="w-full h-full"
                                            />
                                            <button
                                                onClick={() => setPreviewCoin({ ...milestone, glbUrl: asset.glb_url })}
                                                className="absolute top-3 right-3 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-white" />
                                            </button>
                                        </>
                                    )}
                                    {!hasAsset && !isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Upload className="w-12 h-12 text-zinc-700" />
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Info and upload */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3
                                                className="text-lg font-medium"
                                                style={{ color: milestone.color }}
                                            >
                                                {milestone.name}
                                            </h3>
                                            <p className="text-xs text-zinc-500">
                                                {milestone.days} {milestone.days === 1 ? 'day' : 'days'}
                                            </p>
                                        </div>
                                        {hasAsset && (
                                            <Check className="w-5 h-5 text-green-500" />
                                        )}
                                    </div>

                                    <label>
                                        <input
                                            type="file"
                                            accept=".glb"
                                            onChange={(e) => handleFileSelect(milestone, e)}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                        <Button
                                            disabled={isUploading}
                                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                                            asChild
                                        >
                                            <span className="cursor-pointer">
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : hasAsset ? (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Replace Coin
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Upload Coin
                                                    </>
                                                )}
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Preview Modal */}
            {previewCoin && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                        onClick={() => setPreviewCoin(null)}
                    />
                    <div className="absolute inset-4 sm:inset-8 md:inset-16 lg:inset-24 flex flex-col">
                        <button
                            onClick={() => setPreviewCoin(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-white" />
                        </button>

                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-full max-w-lg aspect-square">
                                <CoinViewer
                                    glbUrl={previewCoin.glbUrl}
                                    autoRotate={true}
                                    accentColor={previewCoin.color}
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="text-center mt-6">
                                <h2
                                    className="text-3xl font-light text-white mb-2"
                                    style={{ textShadow: `0 0 30px ${previewCoin.color}50` }}
                                >
                                    {previewCoin.name}
                                </h2>
                                <p className="text-zinc-400">{previewCoin.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}