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
        let thumbnail = null;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            fullText += pageText + '\n\n';

            // Render first page to canvas as a thumbnail
            if (i === 1) {
                try {
                    const viewport = page.getViewport({ scale: 1 });
                    const targetWidth = 900; // high-res enough for cover cropping
                    const scale = targetWidth / viewport.width;
                    const scaledViewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(scaledViewport.width);
                    canvas.height = Math.round(scaledViewport.height);
                    const ctx = canvas.getContext('2d');

                    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

                    // Convert to compressed JPEG data URL
                    thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                } catch (e) {
                    console.warn('Failed to render thumbnail for first page:', e);
                    thumbnail = null;
                }
            }
        }

        return { fullText, thumbnail };
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
            // Extract text and thumbnail from PDF
            const { fullText: rawText, thumbnail } = await extractTextFromPDF(selectedFile);

            // Apply import settings
            const processedText = applyImportSettings(rawText);

            // Create book entry (include thumbnail if available)
            const title = selectedFile.name.replace('.pdf', '');
            await storage.books.create({
                title,
                fileName: selectedFile.name,
                text: processedText,
                originalText: rawText,
                importSettings,
                thumbnail: thumbnail || null,
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
            <div className="fixed top-0 left-0 right-0 bg-black z-10 safe-top">
                <div className="flex items-center justify-between p-4 border-b border-zinc-900">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-medium truncate px-4 flex-1 text-center">Import PDF</h1>
                </div>
            </div>

            <div
                className="p-6 overflow-y-auto"
                style={{ marginTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}
            >
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
                        className="w-full border-2 border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center hover:border-zinc-500 transition-colors"
                    >
                        {selectedFile ? (
                            <>
                                <FileText size={36} className="text-white mb-2" />
                                <p className="text-md font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-zinc-500 mt-1">Tap to change file</p>
                            </>
                        ) : (
                            <>
                                <Upload size={36} className="text-zinc-600 mb-2" />
                                <p className="text-md text-zinc-400">Select PDF file</p>
                                <p className="text-sm text-zinc-600 mt-1">Tap to browse</p>
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
