import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Edit3, RotateCcw, RotateCw, User } from 'lucide-react';
import { storage } from '@/api/storageClient';
import { createPortal } from 'react-dom';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

function Popup({ children, className = '', style = {}, onClose = () => { } }) {
    if (typeof document === 'undefined') return null;

    const handleBackdropClick = (e) => {
        // Only close if clicking directly on the backdrop, not its children
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-40" onClick={handleBackdropClick}>
            <div
                className={`fixed ${className} z-50`}
                style={style}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

// Estimated characters per second at 1x speed (average speaking rate)
const CHARS_PER_SECOND = 15;
// Maximum chunk size to avoid speech synthesis issues with large texts
const MAX_CHUNK_SIZE = 4000;
// Context size for displaying text around current position
const TEXT_CONTEXT_CHARS = 800;

export default function Player() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [currentSentenceStart, setCurrentSentenceStart] = useState(0);
    const [currentSentenceEnd, setCurrentSentenceEnd] = useState(0);
    const [speechRate, setSpeechRate] = useState(1);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [showSpeedPopup, setShowSpeedPopup] = useState(false);
    const [showVoicePopup, setShowVoicePopup] = useState(false);
    const [allVoices, setAllVoices] = useState([]);

    const textDisplayRef = useRef(null);
    const isPlayingRef = useRef(false);
    const currentPositionRef = useRef(0);
    const bookRef = useRef(null);
    const speechRateRef = useRef(speechRate);
    const selectedVoiceRef = useRef(selectedVoice);

    // Refs and inline styles for accurate popup positioning when rendered via portal
    const speedBtnRef = useRef(null);
    const voiceBtnRef = useRef(null);
    const [speedPopupStyle, setSpeedPopupStyle] = useState({});
    const [voicePopupStyle, setVoicePopupStyle] = useState({});

    const toggleSpeedPopup = () => {
        if (!showSpeedPopup && speedBtnRef.current) {
            const r = speedBtnRef.current.getBoundingClientRect();
            const bottom = window.innerHeight - r.top + 8;
            const left = r.left + r.width / 2;
            setSpeedPopupStyle({ left: `${left}px`, bottom: `${bottom}px`, transform: 'translateX(-50%)' });
            setShowSpeedPopup(true);
        } else {
            setShowSpeedPopup(false);
        }
    };

    const toggleVoicePopup = () => {
        if (!showVoicePopup && voiceBtnRef.current) {
            const r = voiceBtnRef.current.getBoundingClientRect();
            const bottom = window.innerHeight - r.top + 8;
            const left = r.left + r.width / 2;
            setVoicePopupStyle({ left: `${left}px`, bottom: `${bottom}px`, transform: 'translateX(-50%)' });
            setShowVoicePopup(true);
        } else {
            setShowVoicePopup(false);
        }
    };

    // Load available voices from Capacitor TTS
    useEffect(() => {
        const loadVoices = async () => {
            try {
                const { voices } = await TextToSpeech.getSupportedVoices();
                setAllVoices(voices || []);

                // Find a good default English voice
                const englishVoices = voices.filter(v => v.lang?.startsWith('en'));
                if (englishVoices.length > 0) {
                    setSelectedVoice(englishVoices[0]);
                } else if (voices.length > 0) {
                    setSelectedVoice(voices[0]);
                }
            } catch (error) {
                console.error('Error loading voices:', error);
                // Fallback: TTS will use system default
            }
        };

        loadVoices();
    }, []);

    useEffect(() => {
        loadBook();
        return () => {
            TextToSpeech.stop().catch(() => {});
        };
    }, [id]);

    // Keep refs in sync
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        currentPositionRef.current = currentPosition;
    }, [currentPosition]);

    useEffect(() => {
        bookRef.current = book;
    }, [book]);

    useEffect(() => {
        speechRateRef.current = speechRate;
    }, [speechRate]);

    useEffect(() => {
        selectedVoiceRef.current = selectedVoice;
    }, [selectedVoice]);

    const loadBook = async () => {
        try {
            const bookData = await storage.books.get(id);
            if (!bookData) {
                navigate('/');
                return;
            }
            setBook(bookData);
            setCurrentPosition(bookData.currentPosition || 0);
            updateDisplayedText(bookData.text, bookData.currentPosition || 0);
        } catch (error) {
            console.error('Error loading book:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const updateDisplayedText = (text, position) => {
        // Find current sentence boundaries
        let sentenceStart = text.lastIndexOf('.', position - 1);
        sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;

        // Also check for other sentence terminators
        const questionMark = text.lastIndexOf('?', position - 1);
        const exclamation = text.lastIndexOf('!', position - 1);
        sentenceStart = Math.max(sentenceStart, questionMark + 1, exclamation + 1);

        let sentenceEnd = text.indexOf('.', position);
        const questionEnd = text.indexOf('?', position);
        const exclamationEnd = text.indexOf('!', position);

        if (sentenceEnd === -1) sentenceEnd = text.length;
        if (questionEnd !== -1 && questionEnd < sentenceEnd) sentenceEnd = questionEnd;
        if (exclamationEnd !== -1 && exclamationEnd < sentenceEnd) sentenceEnd = exclamationEnd;
        sentenceEnd = sentenceEnd + 1;

        setCurrentSentenceStart(sentenceStart);
        setCurrentSentenceEnd(sentenceEnd);
    };

    const speakChunk = useCallback(async (text, startPosition = 0) => {
        // Get a chunk of text to speak
        const chunkEnd = Math.min(startPosition + MAX_CHUNK_SIZE, text.length);
        const textToSpeak = text.slice(startPosition, chunkEnd);

        if (!textToSpeak.trim()) {
            setIsPlaying(false);
            return;
        }

        try {
            setIsPlaying(true);
            setCurrentPosition(startPosition);
            updateDisplayedText(text, startPosition);

            // Use refs to get current values (not stale closure values)
            const currentRate = speechRateRef.current;
            const currentVoice = selectedVoiceRef.current;

            const options = {
                text: textToSpeak,
                lang: currentVoice?.lang || 'en-US',
                rate: currentRate,
                pitch: 1.0,
                volume: 1.0,
                category: 'playback',
            };

            if (currentVoice?.voiceURI) {
                options.voice = currentVoice.voiceURI;
            }

            await TextToSpeech.speak(options);

            // After speaking, update position and continue if needed
            const newPosition = chunkEnd;
            setCurrentPosition(newPosition);
            updateDisplayedText(text, newPosition);
            storage.books.update(id, { currentPosition: newPosition });

            // If there's more text and we're still supposed to be playing, continue
            if (chunkEnd < text.length && isPlayingRef.current) {
                speakChunk(text, chunkEnd);
            } else {
                setIsPlaying(false);
            }
        } catch (error) {
            if (error.message !== 'stopped') {
                console.error('Speech error:', error);
            }
            setIsPlaying(false);
        }
    }, [id]);

    const togglePlayPause = async () => {
        if (!book) return;

        if (isPlaying) {
            await TextToSpeech.stop();
            setIsPlaying(false);
            storage.books.update(id, { currentPosition });
        } else {
            speakChunk(book.text, currentPosition);
        }
    };

    // Jump by approximately 15 seconds worth of text
    const jump15SecondsForward = async () => {
        if (!book) return;
        const charsToJump = Math.floor(CHARS_PER_SECOND * 15 * speechRate);
        const newPosition = Math.min(currentPosition + charsToJump, book.text.length - 1);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        storage.books.update(id, { currentPosition: newPosition });

        if (isPlaying) {
            await TextToSpeech.stop();
            speakChunk(book.text, newPosition);
        }
    };

    const jump15SecondsBackward = async () => {
        if (!book) return;
        const charsToJump = Math.floor(CHARS_PER_SECOND * 15 * speechRate);
        const newPosition = Math.max(currentPosition - charsToJump, 0);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        storage.books.update(id, { currentPosition: newPosition });

        if (isPlaying) {
            await TextToSpeech.stop();
            speakChunk(book.text, newPosition);
        }
    };

    const skipForward = async () => {
        if (!book) return;
        const newPosition = Math.min(currentPosition + 500, book.text.length - 1);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        storage.books.update(id, { currentPosition: newPosition });

        if (isPlaying) {
            await TextToSpeech.stop();
            speakChunk(book.text, newPosition);
        }
    };

    const skipBackward = async () => {
        if (!book) return;
        const newPosition = Math.max(currentPosition - 500, 0);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        storage.books.update(id, { currentPosition: newPosition });

        if (isPlaying) {
            await TextToSpeech.stop();
            speakChunk(book.text, newPosition);
        }
    };

    const handleSeek = async (e) => {
        if (!book) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newPosition = Math.floor(percentage * book.text.length);

        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        storage.books.update(id, { currentPosition: newPosition });

        if (isPlaying) {
            await TextToSpeech.stop();
            speakChunk(book.text, newPosition);
        }
    };

    const handleSpeedChange = async (speed) => {
        // Update the ref immediately so speakChunk uses it
        speechRateRef.current = speed;
        setSpeechRate(speed);
        setShowSpeedPopup(false);

        // If currently playing, restart with new speed
        if (isPlaying && book) {
            await TextToSpeech.stop();
            speakChunk(book.text, currentPositionRef.current);
        }
    };

    const handleVoiceChange = async (voice) => {
        // Update the ref immediately so speakChunk uses it
        selectedVoiceRef.current = voice;
        setSelectedVoice(voice);
        setShowVoicePopup(false);

        // If currently playing, restart with new voice
        if (isPlaying && book) {
            await TextToSpeech.stop();
            speakChunk(book.text, currentPositionRef.current);
        }
    };

    const progress = book ? (currentPosition / book.text.length) * 100 : 0;

    // Get text segments for continuous scroll display
    const getTextSegments = () => {
        if (!book?.text) return { before: '', current: '', after: '' };

        const text = book.text;
        const beforeStart = Math.max(0, currentSentenceStart - TEXT_CONTEXT_CHARS);
        const afterEnd = Math.min(text.length, currentSentenceEnd + TEXT_CONTEXT_CHARS);

        return {
            before: text.slice(beforeStart, currentSentenceStart).trim(),
            current: text.slice(currentSentenceStart, currentSentenceEnd).trim(),
            after: text.slice(currentSentenceEnd, afterEnd).trim()
        };
    };

    const textSegments = getTextSegments();

    // Get display name for voice
    const getVoiceDisplayName = () => {
        if (selectedVoice?.name) {
            return selectedVoice.name.length > 12
                ? selectedVoice.name.substring(0, 12) + '...'
                : selectedVoice.name;
        }
        return 'Default';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
            {/* Header - Fixed at the top */}
            <div className="fixed top-0 left-0 right-0 bg-black z-10 flex items-center justify-between p-4 border-b border-zinc-900">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-medium truncate px-4 flex-1 text-center">
                    {book?.title}
                </h1>
                <Link
                    to={`/editor/${id}`}
                    className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
                >
                    <Edit3 size={20} />
                </Link>
            </div>

            {/* Continuous Scroll Text Display */}
            <div className="flex-1 mt-[64px] mb-[170px] overflow-hidden relative">
                <div
                    ref={textDisplayRef}
                    className="h-full flex flex-col justify-center px-6 py-4 sm:py-2 overflow-hidden"
                >
                    {book?.text ? (
                        <div className="text-center max-w-2xl mx-auto">
                            {/* Text before current sentence */}
                            <p className="text-lg leading-relaxed text-zinc-600 mb-2">
                                {textSegments.before}
                            </p>

                            {/* Current sentence - highlighted */}
                            <motion.p
                                key={currentSentenceStart}
                                initial={{ opacity: 0.7 }}
                                animate={{ opacity: 1 }}
                                className="text-xl leading-relaxed text-white font-medium py-3"
                            >
                                {textSegments.current || 'Start playing to see text'}
                            </motion.p>

                            {/* Text after current sentence */}
                            <p className="text-lg leading-relaxed text-zinc-600 mt-2">
                                {textSegments.after}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xl text-zinc-500 text-center">No text available. Tap to edit.</p>
                    )}
                </div>

                {/* Gradient overlays for fade effect */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
            </div>

            {/* Progress Bar - Fixed above controls */}
            <div className="fixed bottom-[156px] left-0 right-0 bg-black z-10 px-6 py-2">
                <div
                    className="h-1 bg-zinc-800 rounded-full cursor-pointer"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-white rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                    <span>{Math.floor(progress)}%</span>
                    <span>{book?.text?.length || 0} chars</span>
                </div>
            </div>

            {/* Controls - Fixed at the bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-black px-4 pb-8">
                {/* Main playback controls */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    {/* 15s backward */}
                    <button
                        onClick={jump15SecondsBackward}
                        className="p-2 hover:bg-zinc-900 rounded-full transition-colors relative"
                    >
                        <RotateCcw size={24} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold mt-0.5">15</span>
                    </button>

                    {/* Skip backward */}
                    <button
                        onClick={skipBackward}
                        className="p-3 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <SkipBack size={28} />
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlayPause}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors"
                    >
                        {isPlaying ? (
                            <Pause size={28} className="text-black" />
                        ) : (
                            <Play size={28} className="text-black ml-1" />
                        )}
                    </button>

                    {/* Skip forward */}
                    <button
                        onClick={skipForward}
                        className="p-3 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <SkipForward size={28} />
                    </button>

                    {/* 15s forward */}
                    <button
                        onClick={jump15SecondsForward}
                        className="p-2 hover:bg-zinc-900 rounded-full transition-colors relative"
                    >
                        <RotateCw size={24} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold mt-0.5">15</span>
                    </button>
                </div>

                {/* Speed and Voice controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* Speed button */}
                    <button
                        ref={speedBtnRef}
                        onClick={toggleSpeedPopup}
                        className="px-4 py-2 bg-zinc-900 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors min-w-[70px]"
                    >
                        {speechRate}x
                    </button>

                    {/* Speed Popup */}
                    {showSpeedPopup && (
                        <Popup style={speedPopupStyle} className="bg-zinc-800 text-white p-4 rounded-lg shadow-lg min-w-[140px] w-max" onClose={() => setShowSpeedPopup(false)}>
                            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                                <button
                                    key={speed}
                                    onClick={(e) => { e.stopPropagation(); handleSpeedChange(speed); }}
                                    className={`block w-full text-left px-4 py-2 rounded-lg active:bg-zinc-600 ${speed === speechRate ? 'bg-white text-black' : 'hover:bg-zinc-700'}`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </Popup>
                    )}

                    {/* Voice button */}
                    <button
                        ref={voiceBtnRef}
                        onClick={toggleVoicePopup}
                        className="px-4 py-2 bg-zinc-900 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                        <User size={14} />
                        <span>{getVoiceDisplayName()}</span>
                    </button>

                    {/* Voice Popup */}
                    {showVoicePopup && (
                        <Popup style={voicePopupStyle} className="bg-zinc-800 text-white p-4 rounded-lg shadow-lg w-64 max-h-60 overflow-y-auto" onClose={() => setShowVoicePopup(false)}>
                            {allVoices.length === 0 ? (
                                <p className="text-zinc-400 text-sm px-4 py-2">No voices available. Using system default.</p>
                            ) : (
                                allVoices.map((voice, index) => (
                                    <button
                                        key={voice.voiceURI || index}
                                        onClick={(e) => { e.stopPropagation(); handleVoiceChange(voice); }}
                                        className={`block w-full text-left px-4 py-2 rounded-lg active:bg-zinc-600 ${selectedVoice?.voiceURI === voice.voiceURI ? 'bg-white text-black' : 'hover:bg-zinc-700'}`}
                                    >
                                        <div className="truncate">{voice.name || 'Unknown'}</div>
                                        <div className="text-xs opacity-60">{voice.lang}</div>
                                    </button>
                                ))
                            )}
                        </Popup>
                    )}
                </div>
            </div>
        </div>
    );
}