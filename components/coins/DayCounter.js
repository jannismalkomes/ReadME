import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DayCounter({ days }) {
    const [displayDays, setDisplayDays] = useState(0);

    useEffect(() => {
        // Animate counting up
        const duration = 1500;
        const steps = 60;
        const increment = days / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= days) {
                setDisplayDays(days);
                clearInterval(timer);
            } else {
                setDisplayDays(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [days]);

    const digits = String(displayDays).padStart(1, '0').split('');

    return (
        <div className="flex flex-col items-center">
            {/* Main counter */}
            <div className="flex items-baseline gap-1">
                <AnimatePresence mode="popLayout">
                    {digits.map((digit, i) => (
                        <motion.span
                            key={`${i}-${digit}`}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-7xl sm:text-8xl md:text-9xl font-extralight tracking-tighter text-white"
                            style={{
                                textShadow: '0 0 60px rgba(251, 191, 36, 0.3)'
                            }}
                        >
                            {digit}
                        </motion.span>
                    ))}
                </AnimatePresence>
            </div>

            {/* Label */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg sm:text-xl text-zinc-500 font-light tracking-[0.3em] uppercase mt-2"
            >
                {days === 1 ? 'Day' : 'Days'} Strong
            </motion.p>
        </div>
    );
}