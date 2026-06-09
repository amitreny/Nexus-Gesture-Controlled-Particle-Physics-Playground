/**
 * Nexus — Gesture Controller
 * @module GestureController
 * @description MediaPipe HandLandmarker integration for webcam-based gesture control.
 *
 * Gesture mapping:
 *   Open palm    → Attract particles toward hand
 *   Closed fist  → Repel particles away from hand
 *   Pinch        → Spawn particles at hand position
 *   Two hands    → Vortex between palms
 */

import { FORCE_TYPE } from '../engine/ForceFields.js';

// Hand landmark indices (MediaPipe convention)
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

export const GESTURE = Object.freeze({
    NONE: 'none',
    OPEN_PALM: 'open_palm',
    FIST: 'fist',
    PINCH: 'pinch',
    POINT: 'point',
});

export class GestureController {
    /**
     * @param {HTMLVideoElement} video — The webcam video element
     * @param {import('../engine/ForceFields.js').ForceFieldManager} forceManager
     * @param {import('../engine/Particle.js').ParticlePool} pool
     * @param {Function} getPresetOpts — Returns particle options from current preset
     */
    constructor(video, forceManager, pool, getPresetOpts) {
        this.video = video;
        this.forces = forceManager;
        this.pool = pool;
        this.getPresetOpts = getPresetOpts;

        this.enabled = false;
        this.ready = false;
        this._handLandmarker = null;

        // Detected state
        this.hands = [];         // Raw hand data
        this.gestures = [];      // Detected gestures per hand
        this.handPositions = []; // Smoothed center positions [{x, y}]

        // Smoothing (EMA)
        this._smoothPositions = [{x: 0, y: 0}, {x: 0, y: 0}];
        this._smoothFactor = 0.35; // 0=no smooth, 1=frozen

        // Force fields owned by gesture controller
        this._fields = [];

        // Canvas dimensions for coordinate mapping
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        // Landmark drawing callback
        this.onLandmarks = null; // (hands) => void
    }

    /** Load MediaPipe and start tracking. */
    async start() {
        try {
            // Dynamic import of MediaPipe Tasks Vision
            const vision = await import(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
            );

            const { FilesetResolver, HandLandmarker } = vision;

            const fileset = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
            );

            this._handLandmarker = await HandLandmarker.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            this.ready = true;
            this.enabled = true;
            console.log('[Nexus] Hand tracking initialized');
            this._detect();
        } catch (err) {
            console.error('[Nexus] Failed to initialize hand tracking:', err);
            this.ready = false;
            this.enabled = false;
            throw err;
        }
    }

    /** Continuous detection loop. */
    _detect() {
        if (!this.enabled || !this.ready) return;

        if (this.video.readyState >= 2) {
            const results = this._handLandmarker.detectForVideo(
                this.video,
                performance.now()
            );

            this.hands = results.landmarks || [];
            this._processHands();
        }

        requestAnimationFrame(() => this._detect());
    }

    /** Classify gestures and update force fields. */
    _processHands() {
        // Remove old gesture force fields
        this.forces.removeByOwner('gesture-left');
        this.forces.removeByOwner('gesture-right');
        this._fields = [];

        this.gestures = [];
        this.handPositions = [];

        for (let h = 0; h < this.hands.length; h++) {
            const landmarks = this.hands[h];
            const gesture = this._classifyGesture(landmarks);
            this.gestures.push(gesture);

            // Map normalized coordinates to canvas
            const center = this._getHandCenter(landmarks);
            const cx = (1 - center.x) * this.canvasWidth;  // Mirror X
            const cy = center.y * this.canvasHeight;

            // Smooth position
            const prev = this._smoothPositions[h] || { x: cx, y: cy };
            const sx = prev.x + (cx - prev.x) * (1 - this._smoothFactor);
            const sy = prev.y + (cy - prev.y) * (1 - this._smoothFactor);
            this._smoothPositions[h] = { x: sx, y: sy };

            this.handPositions.push({ x: sx, y: sy, gesture });

            // Create force field based on gesture
            const owner = h === 0 ? 'gesture-left' : 'gesture-right';
            let field = null;

            switch (gesture) {
                case GESTURE.OPEN_PALM:
                    field = this.forces.add(FORCE_TYPE.ATTRACT, sx, sy, 600, 300);
                    break;
                case GESTURE.FIST:
                    field = this.forces.add(FORCE_TYPE.REPEL, sx, sy, 700, 280);
                    break;
                case GESTURE.PINCH:
                    field = this.forces.add(FORCE_TYPE.EMIT, sx, sy, 200, 100);
                    // Also spawn a burst
                    const opts = this.getPresetOpts();
                    this.pool.spawnBurst(sx, sy, 5, 60, opts);
                    break;
                case GESTURE.POINT:
                    field = this.forces.add(FORCE_TYPE.ATTRACT, sx, sy, 400, 150);
                    break;
            }

            if (field) {
                field.owner = owner;
                this._fields.push(field);
            }
        }

        // Two hands → add vortex between them
        if (this.hands.length >= 2 && this.handPositions.length >= 2) {
            const p1 = this.handPositions[0];
            const p2 = this.handPositions[1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

            const vortex = this.forces.add(FORCE_TYPE.VORTEX, midX, midY, 500, dist * 0.8);
            vortex.owner = 'gesture-left'; // Grouped for cleanup
            this._fields.push(vortex);
        }

        // Fire callback for UI
        if (this.onLandmarks) {
            this.onLandmarks(this.hands, this.handPositions);
        }
    }

    /** Get center of palm. */
    _getHandCenter(landmarks) {
        // Average of wrist and MCP joints
        const points = [landmarks[WRIST], landmarks[INDEX_MCP], landmarks[MIDDLE_MCP], landmarks[RING_MCP], landmarks[PINKY_MCP]];
        let x = 0, y = 0;
        for (const p of points) {
            x += p.x;
            y += p.y;
        }
        return { x: x / points.length, y: y / points.length };
    }

    /**
     * Classify hand gesture from landmarks.
     * Uses finger extension heuristic: compare tip Y to MCP Y.
     */
    _classifyGesture(landmarks) {
        const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
        const mcps = [INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP];

        // Count extended fingers (tip higher than MCP in normalized coords)
        let extended = 0;
        for (let i = 0; i < 4; i++) {
            if (landmarks[tips[i]].y < landmarks[mcps[i]].y) {
                extended++;
            }
        }

        // Check pinch: thumb tip close to index tip
        const thumbTip = landmarks[THUMB_TIP];
        const indexTip = landmarks[INDEX_TIP];
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

        if (pinchDist < 0.05) {
            return GESTURE.PINCH;
        }

        if (extended >= 3) {
            return GESTURE.OPEN_PALM;
        }

        if (extended <= 1 && landmarks[INDEX_TIP].y < landmarks[INDEX_MCP].y && extended === 1) {
            return GESTURE.POINT;
        }

        if (extended <= 1) {
            return GESTURE.FIST;
        }

        return GESTURE.NONE;
    }

    /** Update canvas dimensions for coordinate mapping. */
    resize(w, h) {
        this.canvasWidth = w;
        this.canvasHeight = h;
    }

    /** Stop tracking. */
    stop() {
        this.enabled = false;
        this.forces.removeByOwner('gesture-left');
        this.forces.removeByOwner('gesture-right');
        this._fields = [];
    }

    /** Get the primary detected gesture name for display. */
    get primaryGesture() {
        if (this.gestures.length === 0) return GESTURE.NONE;
        return this.gestures[0];
    }
}
