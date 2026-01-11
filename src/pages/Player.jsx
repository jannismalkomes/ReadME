import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Edit3, RotateCcw, RotateCw, User } from 'lucide-react';
import { storage } from '@/api/storageClient';

// Estimated characters per second at 1x speed (average speaking rate)
const CHARS_PER_SECOND = 15;
// Maximum chunk size to avoid speech synthesis issues with large texts
const MAX_CHUNK_SIZE = 5000;
// Context size for displaying text around current position
const TEXT_CONTEXT_CHARS = 800;

// High-quality voice preferences (in order of priority)
const FEMALE_VOICE_PREFERENCES = [
    'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria', 'Allison',
    'Ava', 'Susan', 'Zoe', 'Kate', 'Serena', 'Female', 'Google UK English Female'
];
const MALE_VOICE_PREFERENCES = [
    'Daniel', 'Alex', 'Tom', 'Oliver', 'James', 'Fred', 'Lee',
    'Aaron', 'Gordon', 'Male', 'Google UK English Male'
];

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
    const [voiceGender, setVoiceGender] = useState('female'); // 'female' or 'male'
    const [femaleVoice, setFemaleVoice] = useState(null);
    const [maleVoice, setMaleVoice] = useState(null);
    const [showSpeedPopup, setShowSpeedPopup] = useState(false);
    const [showVoicePopup, setShowVoicePopup] = useState(false);
    const [allVoices, setAllVoices] = useState([]);

    const utteranceRef = useRef(null);
    const currentChunkStart = useRef(0);
    const textDisplayRef = useRef(null);

    // Load available voices - find best male and female
    useEffect(() => {
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            const englishVoices = voices.filter(v => v.lang.startsWith('en'));

            // Find best female voice
            let bestFemale = null;
            for (const pref of FEMALE_VOICE_PREFERENCES) {
                bestFemale = englishVoices.find(v => v.name.includes(pref));
                if (bestFemale) break;
            }
            if (!bestFemale) bestFemale = englishVoices[0];

            // Find best male voice
            let bestMale = null;
            for (const pref of MALE_VOICE_PREFERENCES) {
                bestMale = englishVoices.find(v => v.name.includes(pref));
                if (bestMale) break;
            }
            if (!bestMale) bestMale = englishVoices[1] || englishVoices[0];

            setFemaleVoice(bestFemale);
            setMaleVoice(bestMale);
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Load all available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            setAllVoices(voices);
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    useEffect(() => {
        loadBook();
        return () => {
            speechSynthesis.cancel();
        };
    }, [id]);

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

    const speakChunk = useCallback((text, startPosition = 0) => {
        speechSynthesis.cancel();

        // Get a chunk of text to speak (to avoid issues with large documents)
        const chunkEnd = Math.min(startPosition + MAX_CHUNK_SIZE, text.length);
        const textToSpeak = text.slice(startPosition, chunkEnd);

        if (!textToSpeak.trim()) {
            setIsPlaying(false);
            return;
        }

        currentChunkStart.current = startPosition;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = speechRate;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        // Use the selected voice based on gender
        const selectedVoice = voiceGender === 'female' ? femaleVoice : maleVoice;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                const charIndex = startPosition + event.charIndex;
                setCurrentPosition(charIndex);
                updateDisplayedText(text, charIndex);
            }
        };

        utterance.onend = () => {
            // If there's more text, continue with next chunk
            if (chunkEnd < text.length) {
                speakChunk(text, chunkEnd);
            } else {
                setIsPlaying(false);
                storage.books.update(id, { currentPosition: text.length });
            }
        };

        utterance.onerror = (event) => {
            if (event.error !== 'canceled' && event.error !== 'interrupted') {
                console.error('Speech error:', event.error);
                setIsPlaying(false);
            }
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
        setIsPlaying(true);
    }, [speechRate, id, voiceGender, femaleVoice, maleVoice]);

    const togglePlayPause = () => {
        if (!book) return;

        if (isPlaying) {
            speechSynthesis.cancel();
            setIsPlaying(false);
            storage.books.update(id, { currentPosition });
        } else {
            speakChunk(book.text, currentPosition);
        }
    };

    // Jump by approximately 15 seconds worth of text
    const jump15SecondsForward = () => {
        if (!book) return;
        const charsToJump = Math.floor(CHARS_PER_SECOND * 15 * speechRate);
        const newPosition = Math.min(currentPosition + charsToJump, book.text.length - 1);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);

        if (isPlaying) {
            speakChunk(book.text, newPosition);
        }
        storage.books.update(id, { currentPosition: newPosition });
    };

    const jump15SecondsBackward = () => {
        if (!book) return;
        const charsToJump = Math.floor(CHARS_PER_SECOND * 15 * speechRate);
        const newPosition = Math.max(currentPosition - charsToJump, 0);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);

        if (isPlaying) {
            speakChunk(book.text, newPosition);
        }
        storage.books.update(id, { currentPosition: newPosition });
    };

    const skipForward = () => {
        if (!book) return;
        const newPosition = Math.min(currentPosition + 500, book.text.length - 1);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);

        if (isPlaying) {
            speakChunk(book.text, newPosition);
        }
        storage.books.update(id, { currentPosition: newPosition });
    };

    const skipBackward = () => {
        if (!book) return;
        const newPosition = Math.max(currentPosition - 500, 0);
        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);

        if (isPlaying) {
            speakChunk(book.text, newPosition);
        }
        storage.books.update(id, { currentPosition: newPosition });
    };

    const handleSeek = (e) => {
        if (!book) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newPosition = Math.floor(percentage * book.text.length);

        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);

        if (isPlaying) {
            speakChunk(book.text, newPosition);
        }
        storage.books.update(id, { currentPosition: newPosition });
    };

    const cycleSpeed = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
        const currentIndex = speeds.indexOf(speechRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];
        setSpeechRate(newSpeed);

        // If playing, restart with new speed
        if (isPlaying && book) {
            speakChunk(book.text, currentPosition);
        }
    };

    const toggleVoiceGender = () => {
        const newGender = voiceGender === 'female' ? 'male' : 'female';
        setVoiceGender(newGender);

        // If playing, restart with new voice
        if (isPlaying && book) {
            setTimeout(() => speakChunk(book.text, currentPosition), 100);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
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
                    className="h-full flex flex-col justify-center px-6 py-4 sm:py-2 overflow-y-auto"
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
                        onClick={() => setShowSpeedPopup(!showSpeedPopup)}
                        className="px-4 py-2 bg-zinc-900 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors min-w-[70px]"
                    >
                        {speechRate}x
                    </button>

                    {/* Speed Popup */}
                    {showSpeedPopup && (
                        <div className="absolute bottom-20 bg-zinc-900 p-4 rounded-lg shadow-lg">
                            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                                <button
                                    key={speed}
                                    onClick={() => {
                                        setSpeechRate(speed);
                                        setShowSpeedPopup(false);
                                        if (isPlaying && book) {
                                            speakChunk(book.text, currentPosition);
                                        }
                                    }}
                                    className={`block w-full text-left px-4 py-2 rounded-lg ${speed === speechRate ? 'bg-white text-black' : 'hover:bg-zinc-800'
                                        }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Voice button */}
                    <button
                        onClick={() => setShowVoicePopup(!showVoicePopup)}
                        className="px-4 py-2 bg-zinc-900 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                        <User size={14} />
                        <span>{voiceGender === 'female' ? 'Female' : 'Male'}</span>
                    </button>

                    {/* Voice Popup */}
                    {showVoicePopup && (
                        <div className="absolute bottom-20 bg-zinc-900 p-4 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {allVoices.map((voice) => (
                                <button
                                    key={voice.name}
                                    onClick={() => {
                                        if (voiceGender === 'female') {
                                            setFemaleVoice(voice);
                                        } else {
                                            setMaleVoice(voice);
                                        }
                                        setShowVoicePopup(false);
                                        if (isPlaying && book) {
                                            speakChunk(book.text, currentPosition);
                                        }
                                    }}
                                    className={`block w-full text-left px-4 py-2 rounded-lg ${(voiceGender === 'female' && voice === femaleVoice) ||
                                        (voiceGender === 'male' && voice === maleVoice)
                                        ? 'bg-white text-black'
                                        : 'hover:bg-zinc-800'
                                        }`}
                                >
                                    {voice.name} ({voice.lang})
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
