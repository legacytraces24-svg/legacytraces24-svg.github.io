/**
 * ShirtViewer3D
 * Renders a realistic 3D shirt/hoodie using Three.js.
 * – Front and back face using separate PlaneGeometry meshes in a group.
 * – Canvas-composited textures: shirt photo + user design overlay.
 * – Smooth Y-rotation flip animation between front and back.
 * – Mouse/touch parallax tilt for 3D depth feel.
 * – Responsive via ResizeObserver.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Composite a shirt base image with a user design onto a 1024×1024 canvas.
// Returns a Promise<HTMLCanvasElement>.
function buildComposite(shirtSrc, design) {
    return new Promise((resolve) => {
        const SIZE = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = SIZE;
        const ctx = canvas.getContext('2d');

        const shirt = new Image();
        shirt.crossOrigin = 'anonymous';
        shirt.onload = () => {
            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.drawImage(shirt, 0, 0, SIZE, SIZE);

            if (design?.src) {
                const d = new Image();
                d.onload = () => {
                    const scale = design.scale ?? 0.38;
                    const dw = SIZE * scale;
                    const dh = dw * (d.naturalHeight / d.naturalWidth);
                    const dx = (design.x ?? 0.5) * SIZE - dw / 2;
                    const dy = (design.y ?? 0.37) * SIZE - dh / 2;
                    ctx.drawImage(d, dx, dy, dw, dh);
                    resolve(canvas);
                };
                d.onerror = () => resolve(canvas);
                d.src = design.src;
            } else {
                resolve(canvas);
            }
        };
        shirt.onerror = () => {
            // Draw a plain grey rectangle as fallback
            ctx.fillStyle = '#888';
            ctx.fillRect(0, 0, SIZE, SIZE);
            resolve(canvas);
        };
        shirt.src = shirtSrc;
    });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ShirtViewer3D({
    frontSrc,
    backSrc,
    frontDesign,
    backDesign,
    isBack,
}) {
    const mountRef  = useRef(null);
    const threeRef  = useRef(null); // holds all Three.js state
    const isBackRef = useRef(isBack);

    // ── Initial Three.js setup ────────────────────────────────────────────────
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Dimensions
        const W = mount.clientWidth  || 360;
        const H = mount.clientHeight || 440;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        // Scene + Camera
        const scene  = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
        camera.position.z = 3.6;

        // Lighting – soft ambient + directional key + subtle fill
        scene.add(new THREE.AmbientLight(0xffffff, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 1.0);
        key.position.set(2, 3, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-3, -1, -2);
        scene.add(fill);

        // Geometry & placeholder textures
        const geo = new THREE.PlaneGeometry(2, 2.4);

        const blankCanvas = () => {
            const c = document.createElement('canvas');
            c.width = c.height = 4;
            c.getContext('2d').fillStyle = '#bbb';
            c.getContext('2d').fillRect(0, 0, 4, 4);
            return c;
        };

        const frontTex = new THREE.CanvasTexture(blankCanvas());
        const backTex  = new THREE.CanvasTexture(blankCanvas());
        frontTex.colorSpace = THREE.SRGBColorSpace;
        backTex.colorSpace  = THREE.SRGBColorSpace;

        const frontMat = new THREE.MeshStandardMaterial({
            map: frontTex, transparent: true, roughness: 0.75, metalness: 0,
        });
        const backMat = new THREE.MeshStandardMaterial({
            map: backTex, transparent: true, roughness: 0.75, metalness: 0,
            side: THREE.FrontSide,
        });

        // Two planes in a group – back plane rotated 180° so it faces the rear
        const group     = new THREE.Group();
        const frontMesh = new THREE.Mesh(geo, frontMat);
        const backMesh  = new THREE.Mesh(geo, backMat);
        backMesh.rotation.y = Math.PI;
        group.add(frontMesh, backMesh);
        scene.add(group);

        // Rotation state
        const rot = { current: 0, target: 0 };

        // Animation loop
        let raf;
        const t0 = Date.now();
        const tick = () => {
            raf = requestAnimationFrame(tick);
            rot.current += (rot.target - rot.current) * 0.065;
            group.rotation.y = rot.current;
            group.position.y = Math.sin((Date.now() - t0) * 0.0007) * 0.025;
            renderer.render(scene, camera);
        };
        tick();

        // ResizeObserver
        const ro = new ResizeObserver(() => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        ro.observe(mount);

        // Mouse tilt
        const onMove = (e) => {
            const rect = mount.getBoundingClientRect();
            const nx   = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            const base = isBackRef.current ? Math.PI : 0;
            rot.target = base + nx * 0.18;
        };
        const onLeave = () => {
            rot.target = isBackRef.current ? Math.PI : 0;
        };
        mount.addEventListener('mousemove', onMove);
        mount.addEventListener('mouseleave', onLeave);

        // Touch swipe for slight tilt
        let touchStartX = null;
        const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
        const onTouchMove  = (e) => {
            if (touchStartX === null) return;
            const dx   = e.touches[0].clientX - touchStartX;
            const base = isBackRef.current ? Math.PI : 0;
            rot.target = base + (dx / mount.clientWidth) * 0.5;
        };
        const onTouchEnd = () => {
            touchStartX = null;
            rot.target  = isBackRef.current ? Math.PI : 0;
        };
        mount.addEventListener('touchstart', onTouchStart, { passive: true });
        mount.addEventListener('touchmove',  onTouchMove,  { passive: true });
        mount.addEventListener('touchend',   onTouchEnd,   { passive: true });

        threeRef.current = { renderer, scene, camera, group, frontTex, backTex, rot };

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            mount.removeEventListener('mousemove',   onMove);
            mount.removeEventListener('mouseleave',  onLeave);
            mount.removeEventListener('touchstart',  onTouchStart);
            mount.removeEventListener('touchmove',   onTouchMove);
            mount.removeEventListener('touchend',    onTouchEnd);
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // ── Update front texture when shirt or design changes ─────────────────────
    useEffect(() => {
        if (!threeRef.current || !frontSrc) return;
        buildComposite(frontSrc, frontDesign).then((canvas) => {
            const t = threeRef.current.frontTex;
            t.image = canvas;
            t.needsUpdate = true;
        });
    }, [frontSrc, frontDesign]);

    useEffect(() => {
        if (!threeRef.current || !backSrc) return;
        buildComposite(backSrc, backDesign).then((canvas) => {
            const t = threeRef.current.backTex;
            t.image = canvas;
            t.needsUpdate = true;
        });
    }, [backSrc, backDesign]);

    // ── Flip when isBack changes ──────────────────────────────────────────────
    useEffect(() => {
        isBackRef.current = isBack;
        if (threeRef.current) {
            threeRef.current.rot.target = isBack ? Math.PI : 0;
        }
    }, [isBack]);

    return <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}
