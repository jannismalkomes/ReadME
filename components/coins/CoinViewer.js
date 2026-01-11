import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Loader2 } from 'lucide-react';

export default function CoinViewer({
    glbUrl,
    autoRotate = true,
    className = "",
    accentColor = "#ffd700"
}) {
    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 3);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.8;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // Ambient light (soft fill) - increased intensity
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        // Main point light (key light for normal map highlights) - increased intensity
        const pointLight = new THREE.PointLight(0xffffff, 4, 100);
        pointLight.position.set(2, 2, 3);
        scene.add(pointLight);

        // Secondary point light (fill) - increased intensity
        const pointLight2 = new THREE.PointLight(new THREE.Color(accentColor), 2, 100);
        pointLight2.position.set(-2, -1, 2);
        scene.add(pointLight2);

        // Rim light - increased intensity
        const rimLight = new THREE.PointLight(0xffffff, 1.5, 100);
        rimLight.position.set(0, 0, -3);
        scene.add(rimLight);

        // Additional top light for better visibility
        const topLight = new THREE.DirectionalLight(0xffffff, 2);
        topLight.position.set(0, 5, 0);
        scene.add(topLight);

        // Additional front light
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
        frontLight.position.set(0, 0, 5);
        scene.add(frontLight);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 2;
        controls.minDistance = 1.5;
        controls.maxDistance = 6;

        // Load GLB
        const loader = new GLTFLoader();

        // Create a fallback coin if GLB fails to load
        const createFallbackCoin = () => {
            const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 64);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(accentColor),
                metalness: 0.9,
                roughness: 0.2,
            });
            const coin = new THREE.Mesh(geometry, material);
            coin.rotation.x = Math.PI / 2;

            // Add edge detail
            const edgeGeometry = new THREE.TorusGeometry(1, 0.05, 16, 64);
            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(accentColor).multiplyScalar(0.7),
                metalness: 0.95,
                roughness: 0.1,
            });
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            coin.add(edge);

            return coin;
        };

        loader.load(
            glbUrl,
            (gltf) => {
                const model = gltf.scene;

                // Center and scale model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;

                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                // Enhance materials
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material.metalness = Math.max(child.material.metalness || 0.8, 0.8);
                        child.material.roughness = Math.min(child.material.roughness || 0.3, 0.3);
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(model);
                setLoading(false);
            },
            undefined,
            (err) => {
                console.log('GLB load error, using fallback coin');
                const fallbackCoin = createFallbackCoin();
                scene.add(fallbackCoin);
                setLoading(false);
            }
        );

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();

            // Animate point lights
            const time = Date.now() * 0.001;
            pointLight.position.x = Math.sin(time * 0.5) * 3;
            pointLight.position.y = Math.cos(time * 0.3) * 2;

            renderer.render(scene, camera);
        };
        animate();

        // Resize handler
        const handleResize = () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [glbUrl, autoRotate, accentColor]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}
        </div>
    );
}