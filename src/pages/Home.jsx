import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, MoreVertical, Trash2, FileText } from 'lucide-react';
import { storage } from '@/api/storageClient';

export default function Home() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const booksList = await storage.books.list();
            setBooks(booksList);
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = async (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        await storage.books.delete(id);
        setBooks(books.filter(book => book.id !== id));
        setMenuOpen(null);
    };

    const toggleMenu = (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        setMenuOpen(menuOpen === id ? null : id);
    };

    // Hidden file input and handlers for uploading a cover image for an existing book
    const fileInputRef = useRef(null);
    const [coverTargetBookId, setCoverTargetBookId] = useState(null);

    const handleAddCoverClick = (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        setCoverTargetBookId(id);
        // open file selector
        fileInputRef.current?.click();
        setMenuOpen(null);
    };

    const resizeImageFile = (file, targetWidth = 600) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const ratio = img.width / img.height || 1;
                    const width = targetWidth;
                    const height = Math.round(targetWidth / ratio);

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleCoverSelected = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = null; // reset for future selects
        if (!file || !coverTargetBookId) return;

        if (!file.type.startsWith('image/')) {
            console.warn('Selected file is not an image');
            return;
        }

        try {
            const dataUrl = await resizeImageFile(file, 600);
            await storage.books.update(coverTargetBookId, { thumbnail: dataUrl });
            // Update UI
            setBooks(prev => prev.map(b => b.id === coverTargetBookId ? { ...b, thumbnail: dataUrl } : b));
            setCoverTargetBookId(null);
        } catch (err) {
            console.error('Failed to process cover image:', err);
        }
    };

    // Calculate monthly progress
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return (
        <div className="min-h-screen bg-black text-white p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-semibold">Library</h1>
            </div>

            {/* Books Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            ) : books.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <BookOpen size={48} strokeWidth={1} className="mb-4" />
                    <p className="text-lg mb-2">No books yet</p>
                    <p className="text-sm">Tap + to import your first PDF</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {books.map((book, index) => (
                        <motion.div
                            key={book.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Link
                                to={`/player/${book.id}`}
                                className="block relative"
                            >
                                <div className="bg-zinc-900 rounded-lg p-2 aspect-square flex flex-col border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    {/* Menu Button */}
                                    <button
                                        onClick={(e) => toggleMenu(book.id, e)}
                                        className="absolute top-2 right-2 p-2 rounded-full hover:bg-zinc-800 transition-colors"
                                    >
                                        <MoreVertical size={16} className="text-zinc-500" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {menuOpen === book.id && (
                                        <div className="absolute top-10 right-2 bg-zinc-800 rounded-lg shadow-lg z-10 overflow-hidden">
                                            <button
                                                onClick={(e) => handleAddCoverClick(book.id, e)}
                                                className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-700 w-full text-left"
                                            >
                                                <FileText size={16} />
                                                <span>Upload cover</span>
                                            </button>
                                            {book.thumbnail && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        storage.books.update(book.id, { thumbnail: null });
                                                        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, thumbnail: null } : b));
                                                        setMenuOpen(null);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-700 w-full text-left"
                                                >
                                                    <Trash2 size={16} />
                                                    <span>Remove cover</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteBook(book.id, e)}
                                                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-zinc-700 w-full text-left"
                                            >
                                                <Trash2 size={16} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Edge-to-edge cover with reserved bottom area for title */}
                                    <div className="relative flex-1 w-full overflow-hidden rounded-t-lg">
                                        {book.thumbnail ? (
                                            <div className="absolute top-0 left-0 right-0 bottom-14 overflow-hidden">
                                                <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="absolute top-0 left-0 right-0 bottom-14 bg-zinc-800 flex items-center justify-center">
                                                <BookOpen size={30} className="text-zinc-600" />
                                            </div>
                                        )}

                                        {/* Menu button z-index ensure it sits above the image */}
                                        <button
                                            onClick={(e) => toggleMenu(book.id, e)}
                                            className="absolute top-2 right-2 p-2 rounded-full hover:bg-zinc-800 transition-colors z-10"
                                        >
                                            <MoreVertical size={16} className="text-zinc-500" />
                                        </button>

                                        {/* Title area */}
                                        <div className="absolute left-3 right-3 bottom-3">
                                            <h3 className="font-medium text-xs truncate">{book.title}</h3>
                                            <p className="text-[11px] text-zinc-500 mt-1">
                                                {new Date(book.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Floating Action Button */}
            <Link
                to="/import"
                className="fixed bottom-8 right-8 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-colors"
            >
                <Plus size={24} className="text-black" />
            </Link>

            {/* Hidden file input for uploading covers */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelected} />

            {/* Click outside to close menu */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setMenuOpen(null)}
                />
            )}
        </div>
    );
}
