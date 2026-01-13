import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Edit3, RotateCcw, RotateCw, User, Star } from 'lucide-react';
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
const CHARS_PER_SECOND = 20;
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
    const [favoriteVoices, setFavoriteVoices] = useState([]);

    const isPlayingRef = useRef(false);
    const currentPositionRef = useRef(0);
    const bookRef = useRef(null);
    const speechRateRef = useRef(speechRate);
    const selectedVoiceRef = useRef(selectedVoice);
    const lastTouchY = useRef(null);
    const lastTouchTime = useRef(null);
    const velocity = useRef(0);
    const accumulatedDelta = useRef(0);
    const momentumFrame = useRef(null);
    const textAreaRef = useRef(null);
    const saveTimeout = useRef(null);
    const wheelEndTimeout = useRef(null);

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
                console.log('Loading voices from TextToSpeech API...');
                const { voices } = await TextToSpeech.getSupportedVoices();
                console.log('Received voices:', voices?.length || 0, voices);

                // Use all available voices (the TTS system handles availability)
                setAllVoices(voices || []);

                // Load favorite voices from settings
                const settings = await storage.settings.get();
                setFavoriteVoices(settings.favoriteVoices || []);

                let defaultVoice = null;

                // First priority: Check if book has a last used voice
                const currentBook = bookRef.current;
                if (currentBook?.lastVoiceURI && voices?.length > 0) {
                    const savedVoice = voices.find(v => v.voiceURI === currentBook.lastVoiceURI);
                    if (savedVoice) {
                        defaultVoice = savedVoice;
                        console.log('Using saved voice for this book:', savedVoice.name);
                    }
                }

                // Second priority: Get book's default language
                if (!defaultVoice) {
                    const defaultLang = settings.defaultLanguages?.[id];
                    if (defaultLang && voices?.length > 0) {
                        const langVoices = voices.filter(v => v.lang === defaultLang);
                        if (langVoices.length > 0) {
                            defaultVoice = langVoices[0];
                        }
                    }
                }

                // Fall back to English if no language-specific voice found
                if (!defaultVoice && voices?.length > 0) {
                    const englishVoices = voices.filter(v => v.lang?.startsWith('en'));
                    if (englishVoices.length > 0) {
                        defaultVoice = englishVoices[0];
                    } else {
                        defaultVoice = voices[0];
                    }
                }

                if (defaultVoice) {
                    setSelectedVoice(defaultVoice);
                }
            } catch (error) {
                console.error('Error loading voices:', error);
                // Fallback: TTS will use system default
            }
        };

        // Load voices immediately when component mounts
        loadVoices();
    }, [id]);

    useEffect(() => {
        loadBook();
        return () => {
            TextToSpeech.stop().catch(() => { });
            if (momentumFrame.current) {
                cancelAnimationFrame(momentumFrame.current);
            }
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }
            if (wheelEndTimeout.current) {
                clearTimeout(wheelEndTimeout.current);
            }
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

            // Restore last speech rate for this book
            if (bookData.lastSpeechRate) {
                setSpeechRate(bookData.lastSpeechRate);
            }
        } catch (error) {
            console.error('Error loading book:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const updateDisplayedText = (text, position) => {
        // Find current sentence boundaries
        // Look backwards from current position to find sentence start
        let sentenceStart = 0;
        for (let i = position - 1; i >= 0; i--) {
            const char = text[i];
            if (char === '.' || char === '?' || char === '!') {
                // Skip whitespace after punctuation
                sentenceStart = i + 1;
                while (sentenceStart < text.length && /\s/.test(text[sentenceStart])) {
                    sentenceStart++;
                }
                break;
            }
        }

        // Look forwards from current position to find sentence end
        let sentenceEnd = text.length;
        for (let i = position; i < text.length; i++) {
            const char = text[i];
            if (char === '.' || char === '?' || char === '!') {
                sentenceEnd = i + 1;
                break;
            }
        }

        setCurrentSentenceStart(sentenceStart);
        setCurrentSentenceEnd(sentenceEnd);
    };

    const findNextSentenceEnd = (text, startPos) => {
        // Find the end of the current sentence
        for (let i = startPos; i < text.length; i++) {
            const char = text[i];
            if (char === '.' || char === '?' || char === '!') {
                return i + 1;
            }
        }
        return text.length;
    };

    const speakChunk = useCallback(async (text, startPosition = 0) => {
        // Find the end of the current sentence
        let sentenceEnd = findNextSentenceEnd(text, startPosition);

        // Make sure we don't exceed MAX_CHUNK_SIZE for very long sentences
        if (sentenceEnd - startPosition > MAX_CHUNK_SIZE) {
            sentenceEnd = Math.min(startPosition + MAX_CHUNK_SIZE, text.length);
        }

        const textToSpeak = text.slice(startPosition, sentenceEnd).trim();

        if (!textToSpeak) {
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

            // After speaking this sentence, move to the next one
            const newPosition = sentenceEnd;

            // Skip whitespace after sentence
            let nextPosition = newPosition;
            while (nextPosition < text.length && /\s/.test(text[nextPosition])) {
                nextPosition++;
            }

            setCurrentPosition(nextPosition);
            updateDisplayedText(text, nextPosition);
            storage.books.update(id, { currentPosition: nextPosition });

            // If there's more text and we're still supposed to be playing, continue
            if (nextPosition < text.length && isPlayingRef.current) {
                speakChunk(text, nextPosition);
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

        // Save the selected speed to the book
        await storage.books.update(id, { lastSpeechRate: speed });

        // Update local book state
        if (book) {
            setBook({ ...book, lastSpeechRate: speed });
        }

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

        // Save the selected voice to the book
        await storage.books.update(id, { lastVoiceURI: voice.voiceURI });

        // Update local book state
        if (book) {
            setBook({ ...book, lastVoiceURI: voice.voiceURI });
        }

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

    // Find previous sentence start position
    const findPreviousSentenceStart = (text, fromPosition) => {
        // Go back past the current sentence start to find the previous sentence
        let pos = fromPosition - 1;

        // Skip whitespace going backwards
        while (pos > 0 && /\s/.test(text[pos])) {
            pos--;
        }

        // Skip past the previous sentence's content to find its start
        // First, skip to end of previous sentence (the punctuation)
        while (pos > 0 && !'.?!'.includes(text[pos])) {
            pos--;
        }

        // Now we're at punctuation, skip it and any whitespace to find sentence start
        if (pos > 0) {
            pos--; // Skip the punctuation
            while (pos > 0 && !'.?!'.includes(text[pos])) {
                pos--;
            }
            // Move forward past punctuation and whitespace
            if (pos > 0) pos++;
            while (pos < text.length && /\s/.test(text[pos])) {
                pos++;
            }
        } else {
            pos = 0;
        }

        return pos;
    };

    // Find next sentence start position
    const findNextSentenceStart = (text, fromPosition) => {
        // Find end of current sentence
        let pos = fromPosition;
        while (pos < text.length && !'.?!'.includes(text[pos])) {
            pos++;
        }
        // Skip punctuation
        if (pos < text.length) pos++;
        // Skip whitespace
        while (pos < text.length && /\s/.test(text[pos])) {
            pos++;
        }
        return Math.min(pos, text.length - 1);
    };

    // Debounced save to storage (doesn't block UI)
    const debouncedSave = (position) => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            storage.books.update(id, { currentPosition: position });
        }, 300);
    };

    // Track if we're currently scrolling to pause/resume speech
    const isScrolling = useRef(false);
    const wasPlayingBeforeScroll = useRef(false);

    // Stop speech when scrolling starts
    const onScrollStart = async () => {
        if (!isScrolling.current && isPlaying) {
            isScrolling.current = true;
            wasPlayingBeforeScroll.current = true;
            await TextToSpeech.stop();
            setIsPlaying(false);
        } else if (!isScrolling.current) {
            isScrolling.current = true;
            wasPlayingBeforeScroll.current = false;
        }
    };

    // Resume speech from new position when scrolling ends
    const onScrollEnd = () => {
        if (isScrolling.current && wasPlayingBeforeScroll.current && book) {
            const pos = currentPositionRef.current;
            speakChunk(book.text, pos);
        }
        isScrolling.current = false;
    };

    // Navigate to previous sentence
    const goToPreviousSentence = () => {
        if (!book || currentSentenceStart === 0) return;

        onScrollStart();
        const newPosition = findPreviousSentenceStart(book.text, currentSentenceStart);

        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        debouncedSave(newPosition);
    };

    // Navigate to next sentence
    const goToNextSentence = () => {
        if (!book || currentSentenceEnd >= book.text.length) return;

        onScrollStart();
        const newPosition = findNextSentenceStart(book.text, currentSentenceStart);

        setCurrentPosition(newPosition);
        updateDisplayedText(book.text, newPosition);
        debouncedSave(newPosition);
    };

    // Touch gesture handlers for sentence navigation
    const SWIPE_THRESHOLD = 8; // pixels needed to trigger a sentence skip
    const MOMENTUM_FRICTION = 0.90; // friction applied each frame
    const MOMENTUM_MIN_VELOCITY = 0.2; // minimum velocity to continue momentum

    // Store navigation functions in refs so touch handlers can access latest versions
    const goToNextSentenceRef = useRef(null);
    const goToPreviousSentenceRef = useRef(null);
    const onScrollEndRef = useRef(null);
    goToNextSentenceRef.current = goToNextSentence;
    goToPreviousSentenceRef.current = goToPreviousSentence;
    onScrollEndRef.current = onScrollEnd;

    // Attach touch listeners with { passive: false } for Android compatibility
    useEffect(() => {
        const element = textAreaRef.current;
        if (!element || !book) return;

        const handleTouchStart = (e) => {
            // Stop any ongoing momentum
            if (momentumFrame.current) {
                cancelAnimationFrame(momentumFrame.current);
                momentumFrame.current = null;
            }

            lastTouchY.current = e.touches[0].clientY;
            lastTouchTime.current = Date.now();
            velocity.current = 0;
            accumulatedDelta.current = 0;
        };

        const handleTouchMove = (e) => {
            e.preventDefault(); // Prevent page scrolling
            if (lastTouchY.current === null) return;

            const currentY = e.touches[0].clientY;
            const currentTime = Date.now();
            const delta = lastTouchY.current - currentY; // positive = swipe up
            const timeDelta = currentTime - lastTouchTime.current;

            // Calculate velocity (pixels per millisecond)
            if (timeDelta > 0) {
                velocity.current = delta / timeDelta;
            }

            accumulatedDelta.current += delta;
            lastTouchY.current = currentY;
            lastTouchTime.current = currentTime;

            // Check if we've accumulated enough movement to skip a sentence
            if (accumulatedDelta.current > SWIPE_THRESHOLD) {
                goToNextSentenceRef.current?.();
                accumulatedDelta.current = 0;
            } else if (accumulatedDelta.current < -SWIPE_THRESHOLD) {
                goToPreviousSentenceRef.current?.();
                accumulatedDelta.current = 0;
            }
        };

        const handleTouchEnd = () => {
            const finalVelocity = velocity.current;
            lastTouchY.current = null;
            lastTouchTime.current = null;
            accumulatedDelta.current = 0;

            // Start momentum scrolling if velocity is significant
            if (Math.abs(finalVelocity) > 0.08) {
                let currentVelocity = finalVelocity * 25; // Scale up for smoother feel
                let momentumDelta = 0;

                const momentumLoop = () => {
                    momentumDelta += currentVelocity;
                    currentVelocity *= MOMENTUM_FRICTION;

                    // Skip sentences based on accumulated momentum
                    if (momentumDelta > SWIPE_THRESHOLD) {
                        goToNextSentenceRef.current?.();
                        momentumDelta = 0;
                    } else if (momentumDelta < -SWIPE_THRESHOLD) {
                        goToPreviousSentenceRef.current?.();
                        momentumDelta = 0;
                    }

                    // Continue if velocity is still significant
                    if (Math.abs(currentVelocity) > MOMENTUM_MIN_VELOCITY) {
                        momentumFrame.current = requestAnimationFrame(momentumLoop);
                    } else {
                        momentumFrame.current = null;
                        // Momentum ended - resume playback if needed
                        onScrollEndRef.current?.();
                    }
                };

                momentumFrame.current = requestAnimationFrame(momentumLoop);
            } else {
                // No momentum - resume playback immediately
                onScrollEndRef.current?.();
            }
        };

        // Add listeners with { passive: false } to allow preventDefault on Android
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [book]);

    // Mouse wheel handler for desktop
    const handleWheel = (e) => {
        e.preventDefault();
        accumulatedDelta.current += e.deltaY;

        // Clear previous wheel end timeout
        if (wheelEndTimeout.current) {
            clearTimeout(wheelEndTimeout.current);
        }

        if (accumulatedDelta.current > 10) {
            goToNextSentence();
            accumulatedDelta.current = 0;
        } else if (accumulatedDelta.current < -10) {
            goToPreviousSentence();
            accumulatedDelta.current = 0;
        }

        // Resume playback after wheel stops
        wheelEndTimeout.current = setTimeout(() => {
            onScrollEnd();
        }, 150);
    };

    // Sort voices with favorites first
    const getSortedVoices = () => {
        const favorites = allVoices.filter(v => favoriteVoices.includes(v.voiceURI));
        const others = allVoices.filter(v => !favoriteVoices.includes(v.voiceURI));
        return [...favorites, ...others];
    };

    const sortedVoices = getSortedVoices();

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
            {/* Header - Fixed at the top with safe area */}
            <div className="fixed top-0 left-0 right-0 bg-black z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center justify-between p-4 border-b border-zinc-900">
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
            </div>

            {/* Continuous Scroll Text Display */}
            <div
                ref={textAreaRef}
                className="flex-1 mt-[64px] mb-[170px] overflow-hidden relative"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)', touchAction: 'none' }}
                onWheel={handleWheel}
            >
                <div className="h-full flex flex-col justify-center px-6 py-4 sm:py-2 overflow-hidden">
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
                                {textSegments.current || 'Swipe to navigate sentences'}
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
                                sortedVoices.map((voice, index) => {
                                    const isFavorite = favoriteVoices.includes(voice.voiceURI);
                                    return (
                                        <button
                                            key={voice.voiceURI || index}
                                            onClick={(e) => { e.stopPropagation(); handleVoiceChange(voice); }}
                                            className={`block w-full text-left px-4 py-2 rounded-lg active:bg-zinc-600 ${selectedVoice?.voiceURI === voice.voiceURI ? 'bg-white text-black' : 'hover:bg-zinc-700'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 truncate">{voice.name || 'Unknown'}</div>
                                                {isFavorite && <Star size={14} className="ml-2 fill-white" />}
                                            </div>
                                            <div className="text-xs opacity-60">{voice.lang}</div>
                                        </button>
                                    );
                                })
                            )}
                        </Popup>
                    )}
                </div>
            </div>
        </div>
    );
}