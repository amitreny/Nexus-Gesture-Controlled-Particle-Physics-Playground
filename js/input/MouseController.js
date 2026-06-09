/**
 * Nexus — Mouse & Touch Controller
 * @module MouseController
 * @description Fallback input via mouse/touch. Creates force fields on interaction.
 *
 * Controls:
 *   Left-click drag  → Attract particles
 *   Right-click drag  → Repel particles
 *   Middle-click      → Spawn burst
 *   Scroll wheel      → Adjust force radius
 *   Touch drag        → Attract (default)
 *   Two-finger touch  → Repel
 */

import { FORCE_TYPE } from '../engine/ForceFields.js';

export class MouseController {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {import('../engine/ForceFields.js').ForceFieldManager} forceManager
     * @param {import('../engine/Particle.js').ParticlePool} pool
     * @param {Function} getPresetOpts — returns particle options from current preset
     */
    constructor(canvas, forceManager, pool, getPresetOpts) {
        this.canvas = canvas;
        this.forces = forceManager;
        this.pool = pool;
        this.getPresetOpts = getPresetOpts;

        this.enabled = true;
        this.forceRadius = 200;
        this.forceStrength = 500;

        // State
        this._isDown = false;
        this._button = 0;
        this._x = 0;
        this._y = 0;
        this._field = null;

        // Touch state
        this._touches = 0;

        this._bindEvents();
    }

    _bindEvents() {
        const c = this.canvas;

        // Prevent context menu on right-click
        c.addEventListener('contextmenu', e => e.preventDefault());

        // --- Mouse ---
        c.addEventListener('mousedown', e => {
            if (!this.enabled) return;
            this._isDown = true;
            this._button = e.button;
            this._updatePosition(e);
            this._createField();

            // Middle click = burst
            if (e.button === 1) {
                const opts = this.getPresetOpts();
                this.pool.spawnBurst(this._x, this._y, 80, 150, opts);
            }
        });

        c.addEventListener('mousemove', e => {
            this._updatePosition(e);
            if (this._field) {
                this._field.x = this._x;
                this._field.y = this._y;
            }
        });

        c.addEventListener('mouseup', () => {
            this._isDown = false;
            this._removeField();
        });

        c.addEventListener('mouseleave', () => {
            this._isDown = false;
            this._removeField();
        });

        // Scroll = adjust radius
        c.addEventListener('wheel', e => {
            e.preventDefault();
            this.forceRadius = Math.max(50, Math.min(500, this.forceRadius - e.deltaY * 0.5));
            if (this._field) {
                this._field.radius = this.forceRadius;
            }
        }, { passive: false });

        // --- Touch ---
        c.addEventListener('touchstart', e => {
            if (!this.enabled) return;
            e.preventDefault();
            this._touches = e.touches.length;
            this._isDown = true;
            this._updateTouchPosition(e);
            this._button = this._touches >= 2 ? 2 : 0; // Two fingers = repel
            this._createField();
        }, { passive: false });

        c.addEventListener('touchmove', e => {
            e.preventDefault();
            this._updateTouchPosition(e);
            if (this._field) {
                this._field.x = this._x;
                this._field.y = this._y;
            }
        }, { passive: false });

        c.addEventListener('touchend', e => {
            if (e.touches.length === 0) {
                this._isDown = false;
                this._removeField();
            }
            this._touches = e.touches.length;
        });
    }

    _updatePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this._x = e.clientX - rect.left;
        this._y = e.clientY - rect.top;
    }

    _updateTouchPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Average touch positions
        let x = 0, y = 0;
        for (let i = 0; i < e.touches.length; i++) {
            x += e.touches[i].clientX;
            y += e.touches[i].clientY;
        }
        this._x = x / e.touches.length - rect.left;
        this._y = y / e.touches.length - rect.top;
    }

    _createField() {
        this._removeField(); // Remove any existing

        let type;
        switch (this._button) {
            case 0: type = FORCE_TYPE.ATTRACT; break;
            case 2: type = FORCE_TYPE.REPEL; break;
            default: return;
        }

        this._field = this.forces.add(type, this._x, this._y, this.forceStrength, this.forceRadius);
        this._field.owner = 'mouse';
    }

    _removeField() {
        if (this._field) {
            this.forces.remove(this._field);
            this._field = null;
        }
    }

    /** Returns current mouse/touch position for UI display. */
    get position() {
        return { x: this._x, y: this._y };
    }

    get isActive() {
        return this._isDown;
    }

    destroy() {
        // Event listeners are on the canvas, which will be GC'd
        this._removeField();
    }
}
