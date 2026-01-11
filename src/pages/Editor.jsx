import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { storage } from '@/api/storageClient';

export default function Editor() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [book, setBook] = useState(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadBook();
    }, [id]);

    const loadBook = async () => {
        try {
            const bookData = await storage.books.get(id);
            if (!bookData) {
                navigate('/');
                return;
            }
            setBook(bookData);
            setText(bookData.text);
        } catch (error) {
            console.error('Error loading book:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
        setHasChanges(true);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!hasChanges) return;

        setSaving(true);
        try {
            await storage.books.update(id, { text });
            setHasChanges(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!book?.originalText) return;

        setText(book.originalText);
        setHasChanges(true);
        setShowResetConfirm(false);
    };

    const handleBack = () => {
        if (hasChanges) {
            // Auto-save before leaving
            handleSave().then(() => navigate(`/player/${id}`));
        } else {
            navigate(`/player/${id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-medium truncate px-4">Edit Text</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
                        title="Reset to original"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`p-2 rounded-full transition-colors ${hasChanges && !saving
                            ? 'hover:bg-zinc-900 text-white'
                            : 'text-zinc-600'
                            }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                            <Check size={20} className="text-green-500" />
                        ) : (
                            <Save size={20} />
                        )}
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            {hasChanges && (
                <div className="px-4 py-2 bg-zinc-900 text-zinc-400 text-sm flex items-center justify-between">
                    <span>Unsaved changes</span>
                    <span>{text.length} characters</span>
                </div>
            )}

            {/* Text Editor */}
            <div className="flex-1 p-4 flex flex-col">
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    className="w-full flex-1 bg-zinc-900 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 leading-relaxed"
                    placeholder="Enter or paste text here..."
                />
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle size={24} className="text-yellow-500" />
                            <h2 className="text-lg font-semibold">Reset Text?</h2>
                        </div>
                        <p className="text-zinc-400 mb-6">
                            This will replace the current text with the original imported text.
                            All your edits will be lost.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 py-3 bg-zinc-800 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
