import {useState, useRef, useCallback} from 'react';

export function useAudioPlayer() {
    const audioRefs = useRef<{[id: string | number]: HTMLAudioElement}>({});
    const [playingId, setPlayingId] = useState<string | number | null>(null);
    const [progress, setProgress] = useState<{[id: string | number]: number}>({});

    const registerAudio = useCallback((id: string | number, element: HTMLAudioElement | null) => {
        if (element) {
            audioRefs.current[id] = element;
        } else {
            delete audioRefs.current[id];
        }
    }, []);

    const toggleAudio = useCallback(
        (id: string | number) => {
            const audio = audioRefs.current[id];
            if (!audio) return;

            if (playingId === id) {
                audio.pause();
                setPlayingId(null);
            } else {
                /* Pausar cualquier otro audio sonando */
                if (playingId && audioRefs.current[playingId]) {
                    audioRefs.current[playingId].pause();
                }
                audio.play().catch(e => console.error('Error reproduciendo audio:', e));
                setPlayingId(id);
            }
        },
        [playingId]
    );

    const handleTimeUpdate = useCallback((id: string | number) => {
        const audio = audioRefs.current[id];
        if (audio && audio.duration) {
            const prog = (audio.currentTime / audio.duration) * 100;
            setProgress(prev => ({...prev, [id]: prog}));
        }
    }, []);

    const handleAudioEnded = useCallback((id: string | number) => {
        setPlayingId(null);
        setProgress(prev => ({...prev, [id]: 0}));
    }, []);

    const stopAll = useCallback(() => {
        if (playingId && audioRefs.current[playingId]) {
            audioRefs.current[playingId].pause();
            setPlayingId(null);
        }
    }, [playingId]);

    return {
        playingId,
        progress,
        registerAudio,
        toggleAudio,
        handleTimeUpdate,
        handleAudioEnded,
        stopAll
    };
}
