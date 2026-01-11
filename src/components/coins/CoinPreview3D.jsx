import React, { Suspense, useRef, useState, useEffect, useCallback, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Center } from '@react-three/drei';

// Error Boundary to catch rendering errors
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.warn('CoinPreview3D error:', error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Global context manager - limits active WebGL contexts
const ContextManager = {
    maxContexts: 6,
    activeIds: new Set(),

    register(id) {
        if (this.activeIds.size < this.maxContexts) {
            this.activeIds.add(id);
            return true;
        }
        return false;
    },

    unregister(id) {
        this.activeIds.delete(id);
    },

    reset() {
        this.activeIds.clear();
    }
};

// Screenshot queue - only one screenshot canvas at a time
const ScreenshotQueue = {
    queue: [],
    isProcessing: false,
    currentId: null,

    enqueue(id, callback) {
        this.queue.push({ id, callback });
        this.processNext();
    },

    dequeue(id) {
        this.queue = this.queue.filter(item => item.id !== id);
        if (this.currentId === id) {
            this.currentId = null;
            this.isProcessing = false;
            this.processNext();
        }
    },

    processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        const next = this.queue.shift();
        this.isProcessing = true;
        this.currentId = next.id;
        next.callback();
    },

    complete(id) {
        if (this.currentId === id) {
            this.currentId = null;
            this.isProcessing = false;
            // Small delay before processing next to let context fully release
            setTimeout(() => this.processNext(), 100);
        }
    },

    canRender(id) {
        return this.currentId === id;
    }
};

export { ContextManager };

// Capture a screenshot after the model loads
function ScreenshotOnLoad({ onCapture }) {
    const { gl, scene, camera } = useThree();
    const frameCount = useRef(0);
    const captured = useRef(false);

    useFrame(() => {
        if (!captured.current) {
            frameCount.current++;
            // Wait 10 frames for model to fully render
            if (frameCount.current >= 10) {
                captured.current = true;
                gl.render(scene, camera);
                try {
                    const dataUrl = gl.domElement.toDataURL('image/png');
                    if (dataUrl && dataUrl.length > 500) {
                        onCapture(dataUrl);
                    }
                } catch (e) {
                    console.warn('Screenshot failed:', e);
                    onCapture(null);
                }
            }
        }
    });

    return null;
}

function CoinModel({ url, onLoaded }) {
    const { scene } = useGLTF(url);
    const meshRef = useRef();

    useEffect(() => {
        if (scene && onLoaded) {
            // Small delay to ensure render is complete
            const timer = setTimeout(onLoaded, 100);
            return () => clearTimeout(timer);
        }
    }, [scene, onLoaded]);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <group ref={meshRef}>
            <Center>
                <primitive object={scene.clone()} scale={2} />
            </Center>
        </group>
    );
}

function StaticCoinModel({ url, onLoaded }) {
    const { scene } = useGLTF(url);

    useEffect(() => {
        if (scene && onLoaded) {
            const timer = setTimeout(onLoaded, 100);
            return () => clearTimeout(timer);
        }
    }, [scene, onLoaded]);

    return (
        <group>
            <Center>
                <primitive object={scene.clone()} scale={2} />
            </Center>
        </group>
    );
}

function FallbackCoin({ color }) {
    const meshRef = useRef();

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <mesh ref={meshRef}>
            <cylinderGeometry args={[1, 1, 0.15, 32]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
    );
}

// CSS fallback for when screenshot/WebGL fails
function CSSFallback({ color, size }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: size * 0.75,
                    height: size * 0.75,
                    borderRadius: '50%',
                    background: `
                        radial-gradient(ellipse 50% 80% at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%),
                        linear-gradient(160deg, ${color}ee 0%, ${color}88 100%)
                    `,
                    boxShadow: `
                        inset 2px 2px 4px rgba(255,255,255,0.3),
                        inset -2px -2px 4px rgba(0,0,0,0.3),
                        0 4px 8px rgba(0,0,0,0.4),
                        0 0 15px ${color}40
                    `,
                    border: `1.5px solid ${color}aa`,
                }}
            />
        </div>
    );
}

export default function CoinPreview3D({ coinFile, color = '#ffd700', size = 80, brightness = 'normal' }) {
    const instanceId = useRef(`coin-${coinFile}-${Math.random()}`).current;
    const [mode, setMode] = useState('checking'); // 'checking' | 'animated' | 'queued' | 'screenshot' | 'static'
    const [screenshot, setScreenshot] = useState(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const registeredRef = useRef(false);

    const hasValidFile = coinFile && coinFile.trim() !== '';

    // Lighting presets
    const lightSettings = {
        dark: { ambient: 0.3, main: 0.5, fill: 0.15, environment: 'night' },
        normal: { ambient: 0.6, main: 1.0, fill: 0.3, environment: 'studio' },
        bright: { ambient: 1.0, main: 1.5, fill: 0.5, environment: 'studio' }
    };
    const lights = lightSettings[brightness] || lightSettings.normal;

    // Decide mode on mount
    useEffect(() => {
        if (!hasValidFile) {
            setMode('static');
            return;
        }

        if (ContextManager.register(instanceId)) {
            registeredRef.current = true;
            setMode('animated');
        } else {
            // Queue for screenshot - only one at a time
            setMode('queued');
            ScreenshotQueue.enqueue(instanceId, () => {
                setMode('screenshot');
            });
        }

        return () => {
            if (registeredRef.current) {
                ContextManager.unregister(instanceId);
                registeredRef.current = false;
            }
            ScreenshotQueue.dequeue(instanceId);
        };
    }, [instanceId, hasValidFile]);

    const handleScreenshot = useCallback((dataUrl) => {
        ScreenshotQueue.complete(instanceId);
        if (dataUrl) {
            setScreenshot(dataUrl);
        }
        setMode('static');
    }, [instanceId]);

    const handleModelLoaded = useCallback(() => {
        setModelLoaded(true);
    }, []);

    // Show CSS fallback for invalid files or while checking
    if (!hasValidFile || mode === 'checking') {
        return <CSSFallback color={color} size={size} />;
    }

    // Show CSS fallback while waiting in queue
    if (mode === 'queued') {
        return <CSSFallback color={color} size={size} />;
    }

    // Show captured screenshot or CSS fallback if capture failed
    if (mode === 'static') {
        if (screenshot) {
            return (
                <div style={{ width: size, height: size }}>
                    <img
                        src={screenshot}
                        alt="Coin"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                </div>
            );
        }
        return <CSSFallback color={color} size={size} />;
    }

    // Animated 3D viewer (first 6 coins)
    if (mode === 'animated') {
        return (
            <ErrorBoundary fallback={<CSSFallback color={color} size={size} />}>
                <div style={{ width: size, height: size }}>
                    <Canvas
                        camera={{ position: [0, 0, 5.5], fov: 45 }}
                        gl={{ antialias: true, alpha: true }}
                        style={{ background: 'transparent' }}
                    >
                        <ambientLight intensity={lights.ambient} />
                        <directionalLight position={[5, 5, 5]} intensity={lights.main} />
                        <directionalLight position={[-5, -5, -5]} intensity={lights.fill} />

                        <Suspense fallback={<FallbackCoin color={color} />}>
                            <CoinModel url={`/coins/${coinFile}`} />
                        </Suspense>

                        <Environment preset={lights.environment} />
                    </Canvas>
                </div>
            </ErrorBoundary>
        );
    }

    // Screenshot mode - render once, capture, then show image
    if (mode === 'screenshot') {
        return (
            <ErrorBoundary fallback={<CSSFallback color={color} size={size} />}>
                <div style={{ width: size, height: size }}>
                    <Canvas
                        camera={{ position: [0, 0, 5.5], fov: 45 }}
                        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                        style={{ background: 'transparent' }}
                    >
                        <ambientLight intensity={lights.ambient} />
                        <directionalLight position={[5, 5, 5]} intensity={lights.main} />
                        <directionalLight position={[-5, -5, -5]} intensity={lights.fill} />

                        <Suspense fallback={<FallbackCoin color={color} />}>
                            <StaticCoinModel url={`/coins/${coinFile}`} onLoaded={handleModelLoaded} />
                        </Suspense>

                        <Environment preset={lights.environment} />
                        {modelLoaded && <ScreenshotOnLoad onCapture={handleScreenshot} />}
                    </Canvas>
                </div>
            </ErrorBoundary>
        );
    }

    return <CSSFallback color={color} size={size} />;
}
