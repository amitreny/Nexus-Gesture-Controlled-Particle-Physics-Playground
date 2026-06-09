/**
 * Nexus — Main Application
 * @module main
 * @description Orchestrates all systems: engine, rendering, input, and UI.
 */

import { ParticlePool } from './engine/Particle.js';
import { ForceFieldManager } from './engine/ForceFields.js';
import { PhysicsEngine } from './engine/PhysicsEngine.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';
import { PostEffects } from './renderer/PostEffects.js';
import { MouseController } from './input/MouseController.js';
import { GestureController } from './input/GestureController.js';
import { AudioController } from './input/AudioController.js';
import { PRESETS, DEFAULT_PRESET, randomFromPreset } from './presets/VisualPresets.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { StatsOverlay } from './ui/StatsOverlay.js';
import { CameraPreview } from './ui/CameraPreview.js';

// ─── App State ───────────────────────────────────────────────
let currentPresetKey = DEFAULT_PRESET;
let paused = false;
let lastTime = 0;
let elapsedTime = 0;
let targetParticleCount = PRESETS[DEFAULT_PRESET].spawnCount;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

// ─── Core Systems ────────────────────────────────────────────
const canvas = document.getElementById('main-canvas');
const video = document.getElementById('webcam-video');

const pool = new ParticlePool(15000);
const forces = new ForceFieldManager();
const physics = new PhysicsEngine(pool, forces);
const renderer = new CanvasRenderer(canvas);
const postEffects = new PostEffects(canvas);

// ─── Input ───────────────────────────────────────────────────
const getPresetOpts = () => randomFromPreset(PRESETS[currentPresetKey]);

const mouse = new MouseController(canvas, forces, pool, getPresetOpts);
const gesture = new GestureController(video, forces, pool, getPresetOpts);
const audio = new AudioController();

// ─── UI ──────────────────────────────────────────────────────
const stats = new StatsOverlay();
const cameraPreview = new CameraPreview(video);

const controlPanel = new ControlPanel({
    onPresetChange: (key) => switchPreset(key),
    onParticleCountChange: (n) => { targetParticleCount = n; },
    onForceStrengthChange: (n) => { mouse.forceStrength = n; },
    onTrailLengthChange: (v) => {
        // v is 0–1, invert for alpha (1 = long trail = low alpha)
        renderer.trailAlpha = 0.01 + (1 - v) * 0.2;
    },
    onToggleGesture: async (enabled) => {
        if (enabled) {
            try {
                await startCamera();
                await gesture.start();
                cameraPreview.show();
                cameraPreview.setBadge('Tracking Active');
                gesture.onLandmarks = (hands, positions) => {
                    cameraPreview.drawLandmarks(hands, positions);
                };
            } catch (err) {
                console.error('Failed to start gesture tracking:', err);
                cameraPreview.setBadge('Error');
                document.getElementById('toggle-gesture').checked = false;
            }
        } else {
            gesture.stop();
            cameraPreview.hide();
            stopCamera();
        }
    },
    onToggleAudio: async (enabled) => {
        if (enabled) {
            try {
                await audio.start();
            } catch (err) {
                console.error('Failed to start audio:', err);
                document.getElementById('toggle-audio').checked = false;
            }
        } else {
            audio.stop();
        }
    },
    onToggleBloom: (enabled) => {
        renderer.bloomEnabled = enabled;
    },
    onClear: () => {
        pool.clear();
        renderer.clearFull();
    },
    onScreenshot: () => takeScreenshot(),
    onRecord: () => toggleRecording(),
    onTogglePanel: () => {},
});

// ─── Camera ──────────────────────────────────────────────────
let cameraStream = null;

async function startCamera() {
    if (cameraStream) return;
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
        });
        video.srcObject = cameraStream;
        await video.play();
    } catch (err) {
        console.error('Camera access denied:', err);
        throw err;
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        video.srcObject = null;
    }
}

// ─── Preset Switching ────────────────────────────────────────
function switchPreset(key) {
    if (!PRESETS[key]) return;
    currentPresetKey = key;
    const preset = PRESETS[key];

    physics.applyConfig(preset.physics);
    renderer.applyConfig(preset.renderer);

    targetParticleCount = preset.spawnCount;
    document.getElementById('slider-particles').value = preset.spawnCount;
    document.getElementById('val-particles').textContent = preset.spawnCount;

    // Clear and respawn
    pool.clear();
    renderer.clearFull();
    spawnInitialParticles(preset);
}

function spawnInitialParticles(preset) {
    const count = preset.spawnCount;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
        const opts = randomFromPreset(preset);
        const x = Math.random() * w;
        const y = Math.random() * h;
        const speed = preset.spawnSpeed;
        const angle = Math.random() * Math.PI * 2;
        pool.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, opts);
    }
}

// ─── Screenshot & Recording ─────────────────────────────────
function takeScreenshot() {
    const link = document.createElement('a');
    link.download = `nexus-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function toggleRecording() {
    if (isRecording) {
        mediaRecorder?.stop();
        isRecording = false;
        controlPanel.setRecording(false);
    } else {
        recordedChunks = [];
        const stream = canvas.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `nexus-${Date.now()}.webm`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        };
        mediaRecorder.start();
        isRecording = true;
        controlPanel.setRecording(true);
    }
}

// ─── Keyboard Shortcuts ─────────────────────────────────────
document.addEventListener('keydown', e => {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            paused = !paused;
            break;
        case 'c':
            pool.clear();
            renderer.clearFull();
            break;
        case 'h':
            controlPanel.toggle();
            break;
        case 's':
            takeScreenshot();
            break;
        case '1': case '2': case '3': case '4': case '5': {
            const keys = Object.keys(PRESETS);
            const idx = parseInt(e.key) - 1;
            if (idx < keys.length) {
                switchPreset(keys[idx]);
                controlPanel.selectPreset(keys[idx]);
            }
            break;
        }
    }
});

// ─── Window Resize ───────────────────────────────────────────
function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.resize(w, h);
    postEffects.resize(w, h);
    physics.resize(w, h);
    gesture.resize(w, h);
}

window.addEventListener('resize', handleResize);

// ─── Particle Maintenance ────────────────────────────────────
/** Continuously replenish particles to maintain target count. */
function maintainParticles() {
    const deficit = targetParticleCount - pool.activeCount;
    if (deficit <= 0) return;

    // Spawn a fraction each frame to avoid hitching
    const spawnPerFrame = Math.min(deficit, 40);
    const preset = PRESETS[currentPresetKey];
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < spawnPerFrame; i++) {
        const opts = randomFromPreset(preset);
        // Spawn randomly across the canvas
        const x = Math.random() * w;
        const y = Math.random() * h;
        const angle = Math.random() * Math.PI * 2;
        const speed = preset.spawnSpeed * (0.3 + Math.random() * 0.7);
        pool.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, opts);
    }
}

// ─── Main Loop ───────────────────────────────────────────────
function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (paused) {
        stats.update(timestamp, pool, forces, gesture, audio);
        return;
    }

    // Delta time (capped at 33ms to avoid spiral of death)
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;
    elapsedTime += dt;

    // Update audio analysis
    audio.update();
    if (audio.enabled) {
        audio.applyToEngine(physics, renderer);
    }

    // Update physics
    physics.update(dt);

    // Maintain particle count
    maintainParticles();

    // Render
    renderer.render(pool, forces);
    postEffects.render(elapsedTime);

    // Update stats
    stats.update(timestamp, pool, forces, gesture, audio);
}

// ─── Welcome Modal ───────────────────────────────────────────
function setupWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    const btn = document.getElementById('btn-start');

    btn.addEventListener('click', () => {
        modal.classList.add('fade-out');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
    });
}

// ─── Init ────────────────────────────────────────────────────
function init() {
    console.log('%c✦ Nexus — Particle Physics Playground', 'color: #00f0ff; font-size: 16px; font-weight: bold;');

    // Apply default preset
    const preset = PRESETS[DEFAULT_PRESET];
    physics.applyConfig(preset.physics);
    renderer.applyConfig(preset.renderer);

    // Clear canvas
    renderer.clearFull();

    // Spawn initial particles
    spawnInitialParticles(preset);

    // Setup welcome
    setupWelcomeModal();

    // Start loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

init();
