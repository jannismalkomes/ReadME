import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { storage } from '@/api/storageClient';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker path for pdf.js using the imported worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function Import() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [importSettings, setImportSettings] = useState({
        removePageNumbers: true,
        removeHeaders: false,
        removeFooters: false,
        removeEmptyLines: false,
        normalizeWhitespace: false,
    });

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            setError(null);
        } else if (file) {
            setError('Please select a PDF file');
        }
    };

    const extractTextFromPDF = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText;
    };

    const applyImportSettings = (text) => {
        let processed = text;

        if (importSettings.removePageNumbers) {
            // Remove common page number patterns
            processed = processed.replace(/^\s*\d+\s*$/gm, '');
            processed = processed.replace(/\bPage\s+\d+\b/gi, '');
            processed = processed.replace(/\b\d+\s+of\s+\d+\b/gi, '');
        }

        if (importSettings.removeHeaders) {
            // Remove lines that appear at the top of pages (heuristic: short lines at start)
            const lines = processed.split('\n');
            processed = lines.filter((line, index) => {
                // Keep lines that are longer or part of main content
                return line.trim().length > 50 || line.trim().length === 0;
            }).join('\n');
        }

        if (importSettings.removeEmptyLines) {
            // Collapse multiple empty lines into one
            processed = processed.replace(/\n{3,}/g, '\n\n');
        }

        if (importSettings.normalizeWhitespace) {
            // Normalize spaces
            processed = processed.replace(/[ \t]+/g, ' ');
            processed = processed.replace(/^ +/gm, '');
            processed = processed.replace(/ +$/gm, '');
        }

        return processed.trim();
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setImporting(true);
        setError(null);

        try {
            // Extract text from PDF
            const rawText = await extractTextFromPDF(selectedFile);

            // Apply import settings
            const processedText = applyImportSettings(rawText);

            // Create book entry
            const title = selectedFile.name.replace('.pdf', '');
            await storage.books.create({
                title,
                fileName: selectedFile.name,
                text: processedText,
                originalText: rawText,
                importSettings,
            });

            navigate('/');
        } catch (err) {
            console.error('Import error:', err);
            setError('Failed to import PDF. Please try again.');
        } finally {
            setImporting(false);
        }
    };

    const toggleSetting = (key) => {
        setImportSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-zinc-900">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-medium ml-4">Import PDF</h1>
            </div>

            <div className="p-6">
                {/* File Upload Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center hover:border-zinc-500 transition-colors"
                    >
                        {selectedFile ? (
                            <>
                                <FileText size={48} className="text-white mb-4" />
                                <p className="text-lg font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-zinc-500 mt-2">Tap to change file</p>
                            </>
                        ) : (
                            <>
                                <Upload size={48} className="text-zinc-600 mb-4" />
                                <p className="text-lg text-zinc-400">Select PDF file</p>
                                <p className="text-sm text-zinc-600 mt-2">Tap to browse</p>
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Import Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="text-lg font-medium mb-4">Import Settings</h2>

                    <div className="space-y-3">
                        {[
                            { key: 'removePageNumbers', label: 'Remove page numbers' },
                            { key: 'removeHeaders', label: 'Remove headers (experimental)' },
                            { key: 'removeFooters', label: 'Remove footers (experimental)' },
                            { key: 'removeEmptyLines', label: 'Remove extra empty lines' },
                            { key: 'normalizeWhitespace', label: 'Normalize whitespace' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => toggleSetting(key)}
                                className="w-full flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <span>{label}</span>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${importSettings[key] ? 'bg-white' : 'bg-zinc-700'
                                    }`}>
                                    {importSettings[key] && (
                                        <Check size={16} className="text-black" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 p-4 bg-red-900/20 border border-red-900 rounded-lg flex items-center gap-3"
                    >
                        <AlertCircle size={20} className="text-red-500" />
                        <p className="text-red-400">{error}</p>
                    </motion.div>
                )}

                {/* Import Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={handleImport}
                    disabled={!selectedFile || importing}
                    className={`w-full mt-8 py-4 rounded-xl font-medium text-lg transition-colors ${selectedFile && !importing
                        ? 'bg-white text-black hover:bg-zinc-200'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                >
                    {importing ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                            Importing...
                        </span>
                    ) : (
                        'Import PDF'
                    )}
                </motion.button>
            </div>
        </div>
    );
}
