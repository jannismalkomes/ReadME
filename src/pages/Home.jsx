import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, MoreVertical, Trash2 } from 'lucide-react';
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
                                                onClick={(e) => handleDeleteBook(book.id, e)}
                                                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-zinc-700 w-full text-left"
                                            >
                                                <Trash2 size={16} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Book Icon */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center">
                                            <BookOpen size={18} className="text-zinc-600" />
                                        </div>
                                    </div>

                                    {/* Book Title */}
                                    <div className="mt-auto">
                                        <h3 className="font-medium text-xs truncate">{book.title}</h3>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            {new Date(book.createdAt).toLocaleDateString()}
                                        </p>
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
