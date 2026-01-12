import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Play, Volume2 } from 'lucide-react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { storage } from '@/api/storageClient';

export default function Settings() {
    const navigate = useNavigate();
    const [voices, setVoices] = useState([]);
    const [favoriteVoices, setFavoriteVoices] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('all');
    const [playingVoice, setPlayingVoice] = useState(null);

    useEffect(() => {
        loadVoicesAndSettings();
    }, []);

    const loadVoicesAndSettings = async () => {
        try {
            // Load voices
            const { voices: allVoices } = await TextToSpeech.getSupportedVoices();
            // Use all available voices
            setVoices(allVoices);

            // Load favorite voices
            const settings = await storage.settings.get();
            setFavoriteVoices(settings.favoriteVoices || []);
        } catch (error) {
            console.error('Error loading voices:', error);
        }
    };

    const toggleFavorite = async (voiceURI) => {
        if (favoriteVoices.includes(voiceURI)) {
            await storage.settings.removeFavoriteVoice(voiceURI);
            setFavoriteVoices(favoriteVoices.filter(v => v !== voiceURI));
        } else {
            await storage.settings.addFavoriteVoice(voiceURI);
            setFavoriteVoices([...favoriteVoices, voiceURI]);
        }
    };

    const playSampleVoice = async (voice) => {
        try {
            // Stop if already playing this voice
            if (playingVoice === voice.voiceURI) {
                await TextToSpeech.stop();
                setPlayingVoice(null);
                return;
            }

            // Stop any currently playing voice
            await TextToSpeech.stop();
            setPlayingVoice(voice.voiceURI);

            const sampleText = "Hello, this is a sample of how this voice sounds.";
            await TextToSpeech.speak({
                text: sampleText,
                lang: voice.lang || 'en-US',
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0,
                voice: voice.voiceURI,
            });

            setPlayingVoice(null);
        } catch (error) {
            console.error('Error playing sample:', error);
            setPlayingVoice(null);
        }
    };

    // Get unique languages from voices
    const languages = Array.from(new Set(voices.map(v => {
        const lang = v.lang || 'unknown';
        return lang.split('-')[0]; // Get language code without region
    }))).sort();

    // Filter voices by selected language
    const filteredVoices = selectedLanguage === 'all'
        ? voices
        : voices.filter(v => v.lang?.startsWith(selectedLanguage));

    // Sort voices: favorites first, then alphabetically
    const sortedVoices = [...filteredVoices].sort((a, b) => {
        const aIsFav = favoriteVoices.includes(a.voiceURI);
        const bIsFav = favoriteVoices.includes(b.voiceURI);

        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 bg-black z-10 safe-top border-b border-zinc-900">
                <div className="flex items-center p-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-semibold ml-4">Voice Settings</h1>
                </div>
            </div>

            {/* Content */}
            <div className="mt-[80px] px-6">
                {/* Info */}
                <div className="bg-zinc-900 rounded-lg p-4 mb-6">
                    <p className="text-sm text-zinc-400">
                        Mark voices as favorites to have them appear at the top of the voice selection menu in the player.
                        Tap the play button to hear a sample.
                    </p>
                </div>

                {/* Language Filter */}
                <div className="mb-6">
                    <h2 className="text-sm font-medium text-zinc-400 mb-3">Filter by Language</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedLanguage('all')}
                            className={`px-4 py-2 rounded-full text-sm transition-colors ${
                                selectedLanguage === 'all'
                                    ? 'bg-white text-black'
                                    : 'bg-zinc-900 hover:bg-zinc-800'
                            }`}
                        >
                            All Languages
                        </button>
                        {languages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => setSelectedLanguage(lang)}
                                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                                    selectedLanguage === lang
                                        ? 'bg-white text-black'
                                        : 'bg-zinc-900 hover:bg-zinc-800'
                                }`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Voices List */}
                <div className="space-y-2">
                    <h2 className="text-sm font-medium text-zinc-400 mb-3">
                        Available Voices ({sortedVoices.length})
                    </h2>
                    {sortedVoices.length === 0 ? (
                        <div className="bg-zinc-900 rounded-lg p-6 text-center">
                            <Volume2 size={32} className="mx-auto mb-3 text-zinc-600" />
                            <p className="text-zinc-500">
                                {selectedLanguage === 'all'
                                    ? 'No downloaded voices available. Download voices in your device settings.'
                                    : `No ${selectedLanguage.toUpperCase()} voices available.`}
                            </p>
                        </div>
                    ) : (
                        sortedVoices.map((voice) => {
                            const isFavorite = favoriteVoices.includes(voice.voiceURI);
                            const isPlaying = playingVoice === voice.voiceURI;

                            return (
                                <div
                                    key={voice.voiceURI}
                                    className="bg-zinc-900 rounded-lg p-4 flex items-center gap-4"
                                >
                                    {/* Play Sample Button */}
                                    <button
                                        onClick={() => playSampleVoice(voice)}
                                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                            isPlaying
                                                ? 'bg-white text-black'
                                                : 'bg-zinc-800 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {isPlaying ? (
                                            <div className="w-3 h-3 border-2 border-current" />
                                        ) : (
                                            <Play size={16} />
                                        )}
                                    </button>

                                    {/* Voice Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{voice.name || 'Unknown'}</div>
                                        <div className="text-sm text-zinc-500">{voice.lang}</div>
                                    </div>

                                    {/* Favorite Button */}
                                    <button
                                        onClick={() => toggleFavorite(voice.voiceURI)}
                                        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                                            isFavorite
                                                ? 'text-white bg-white/10'
                                                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                    >
                                        <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
