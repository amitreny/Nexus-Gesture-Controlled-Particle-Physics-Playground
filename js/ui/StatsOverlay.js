/**
 * Nexus — Stats Overlay
 * @module StatsOverlay
 * @description Performance HUD displaying FPS, particle count, and gesture state.
 */

export class StatsOverlay {
    constructor() {
        this._el = null;
        this._fpsValues = [];
        this._lastTime = performance.now();
        this._fps = 60;
        this._build();
    }

    _build() {
        const el = document.createElement('div');
        el.id = 'stats-overlay';
        el.className = 'stats-overlay';
        el.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">FPS</span>
                <span class="stat-value" id="stat-fps">60</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Particles</span>
                <span class="stat-value" id="stat-particles">0</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Forces</span>
                <span class="stat-value" id="stat-forces">0</span>
            </div>
            <div class="stat-row" id="stat-gesture-row" style="display:none">
                <span class="stat-label">Gesture</span>
                <span class="stat-value" id="stat-gesture">—</span>
            </div>
            <div class="stat-row" id="stat-audio-row" style="display:none">
                <span class="stat-label">Audio</span>
                <div class="audio-bars" id="stat-audio-bars">
                    <div class="audio-bar" id="bar-bass"></div>
                    <div class="audio-bar" id="bar-mids"></div>
                    <div class="audio-bar" id="bar-highs"></div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this._el = el;
    }

    /**
     * Update stats display. Call once per frame.
     * @param {number} timestamp — from requestAnimationFrame
     * @param {import('../engine/Particle.js').ParticlePool} pool
     * @param {import('../engine/ForceFields.js').ForceFieldManager} forces
     * @param {import('../input/GestureController.js').GestureController} [gesture]
     * @param {import('../input/AudioController.js').AudioController} [audio]
     */
    update(timestamp, pool, forces, gesture, audio) {
        // FPS calculation (rolling average)
        const now = performance.now();
        const delta = now - this._lastTime;
        this._lastTime = now;

        if (delta > 0) {
            this._fpsValues.push(1000 / delta);
            if (this._fpsValues.length > 30) this._fpsValues.shift();
            this._fps = Math.round(
                this._fpsValues.reduce((a, b) => a + b) / this._fpsValues.length
            );
        }

        // Update DOM (throttled to every 5 frames for perf)
        if (Math.round(timestamp / 16) % 5 !== 0) return;

        const fpsEl = document.getElementById('stat-fps');
        fpsEl.textContent = this._fps;
        fpsEl.className = 'stat-value ' + (this._fps >= 50 ? 'good' : this._fps >= 30 ? 'warn' : 'bad');

        document.getElementById('stat-particles').textContent =
            pool.activeCount.toLocaleString();
        document.getElementById('stat-forces').textContent = forces.count;

        // Gesture
        if (gesture && gesture.enabled) {
            document.getElementById('stat-gesture-row').style.display = '';
            const gestureIcons = {
                none: '—',
                open_palm: '✋ Attract',
                fist: '✊ Repel',
                pinch: '🤏 Spawn',
                point: '☝️ Focus',
            };
            document.getElementById('stat-gesture').textContent =
                gestureIcons[gesture.primaryGesture] || '—';
        } else {
            document.getElementById('stat-gesture-row').style.display = 'none';
        }

        // Audio
        if (audio && audio.enabled) {
            document.getElementById('stat-audio-row').style.display = '';
            document.getElementById('bar-bass').style.height = (audio.bass * 100) + '%';
            document.getElementById('bar-mids').style.height = (audio.mids * 100) + '%';
            document.getElementById('bar-highs').style.height = (audio.highs * 100) + '%';
        } else {
            document.getElementById('stat-audio-row').style.display = 'none';
        }
    }
}
