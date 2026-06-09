/**
 * Nexus — Control Panel
 * @module ControlPanel
 * @description Glassmorphism sidebar with sliders, toggles, and preset selector.
 */

import { PRESETS } from '../presets/VisualPresets.js';

export class ControlPanel {
    /**
     * @param {object} callbacks — Event handlers
     *   onPresetChange(key), onParticleCountChange(n), onForceStrengthChange(n),
     *   onTrailLengthChange(n), onToggleGesture(bool), onToggleAudio(bool),
     *   onClear(), onScreenshot(), onTogglePanel()
     */
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.isOpen = true;
        this._el = null;
        this._build();
    }

    _build() {
        const panel = document.createElement('div');
        panel.id = 'control-panel';
        panel.className = 'control-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h2 class="panel-title">Controls</h2>
                <button class="panel-toggle" id="btn-panel-toggle" title="Toggle Panel">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>

            <div class="panel-body" id="panel-body">
                <!-- Presets -->
                <div class="panel-section">
                    <label class="section-label">Visual Preset</label>
                    <div class="preset-grid" id="preset-grid"></div>
                </div>

                <!-- Particle Count -->
                <div class="panel-section">
                    <label class="section-label">
                        Particle Count <span class="label-value" id="val-particles">6000</span>
                    </label>
                    <input type="range" class="slider" id="slider-particles"
                           min="500" max="15000" step="500" value="6000">
                </div>

                <!-- Force Strength -->
                <div class="panel-section">
                    <label class="section-label">
                        Force Strength <span class="label-value" id="val-force">500</span>
                    </label>
                    <input type="range" class="slider" id="slider-force"
                           min="100" max="1200" step="50" value="500">
                </div>

                <!-- Trail Length -->
                <div class="panel-section">
                    <label class="section-label">
                        Trail Length <span class="label-value" id="val-trail">70%</span>
                    </label>
                    <input type="range" class="slider" id="slider-trail"
                           min="0" max="100" step="5" value="70">
                </div>

                <!-- Toggles -->
                <div class="panel-section">
                    <div class="toggle-row">
                        <span class="toggle-label">✋ Hand Tracking</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-gesture">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="toggle-row">
                        <span class="toggle-label">🎵 Sound Reactive</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-audio">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="toggle-row">
                        <span class="toggle-label">✨ Bloom</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-bloom" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- Actions -->
                <div class="panel-section actions">
                    <button class="btn btn-secondary" id="btn-clear">
                        <span>🗑️</span> Clear
                    </button>
                    <button class="btn btn-secondary" id="btn-screenshot">
                        <span>📸</span> Screenshot
                    </button>
                    <button class="btn btn-primary" id="btn-record">
                        <span>🔴</span> Record
                    </button>
                </div>

                <!-- Shortcuts -->
                <div class="panel-section shortcuts">
                    <p class="shortcuts-title">Shortcuts</p>
                    <div class="shortcut"><kbd>Space</kbd> Pause / Resume</div>
                    <div class="shortcut"><kbd>C</kbd> Clear particles</div>
                    <div class="shortcut"><kbd>H</kbd> Toggle panel</div>
                    <div class="shortcut"><kbd>1-5</kbd> Switch preset</div>
                    <div class="shortcut"><kbd>S</kbd> Screenshot</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._el = panel;
        this._buildPresetGrid();
        this._bindEvents();
    }

    _buildPresetGrid() {
        const grid = document.getElementById('preset-grid');
        const keys = Object.keys(PRESETS);

        for (const key of keys) {
            const preset = PRESETS[key];
            const card = document.createElement('button');
            card.className = 'preset-card';
            card.dataset.preset = key;
            card.innerHTML = `
                <span class="preset-icon">${preset.icon}</span>
                <span class="preset-name">${preset.name}</span>
            `;
            grid.appendChild(card);
        }

        // Select first preset
        grid.querySelector('.preset-card').classList.add('active');
    }

    _bindEvents() {
        const cb = this.callbacks;

        // Panel toggle
        document.getElementById('btn-panel-toggle').addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            this._el.classList.toggle('collapsed', !this.isOpen);
            cb.onTogglePanel?.(this.isOpen);
        });

        // Presets
        document.getElementById('preset-grid').addEventListener('click', e => {
            const card = e.target.closest('.preset-card');
            if (!card) return;
            document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            cb.onPresetChange?.(card.dataset.preset);
        });

        // Sliders
        this._bindSlider('slider-particles', 'val-particles', v => {
            cb.onParticleCountChange?.(parseInt(v));
        });
        this._bindSlider('slider-force', 'val-force', v => {
            cb.onForceStrengthChange?.(parseInt(v));
        });
        this._bindSlider('slider-trail', 'val-trail', v => {
            document.getElementById('val-trail').textContent = v + '%';
            cb.onTrailLengthChange?.(parseInt(v) / 100);
        }, true);

        // Toggles
        document.getElementById('toggle-gesture').addEventListener('change', e => {
            cb.onToggleGesture?.(e.target.checked);
        });
        document.getElementById('toggle-audio').addEventListener('change', e => {
            cb.onToggleAudio?.(e.target.checked);
        });
        document.getElementById('toggle-bloom').addEventListener('change', e => {
            cb.onToggleBloom?.(e.target.checked);
        });

        // Buttons
        document.getElementById('btn-clear').addEventListener('click', () => cb.onClear?.());
        document.getElementById('btn-screenshot').addEventListener('click', () => cb.onScreenshot?.());
        document.getElementById('btn-record').addEventListener('click', () => cb.onRecord?.());
    }

    _bindSlider(sliderId, valueId, onChange, skipValueUpdate = false) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        slider.addEventListener('input', () => {
            if (!skipValueUpdate) valueEl.textContent = slider.value;
            onChange(slider.value);
        });
    }

    /** Select a preset by key (for keyboard shortcuts). */
    selectPreset(key) {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        const card = document.querySelector(`.preset-card[data-preset="${key}"]`);
        if (card) card.classList.add('active');
    }

    /** Toggle panel open/closed. */
    toggle() {
        this.isOpen = !this.isOpen;
        this._el.classList.toggle('collapsed', !this.isOpen);
    }

    /** Update the recording button state. */
    setRecording(isRecording) {
        const btn = document.getElementById('btn-record');
        if (isRecording) {
            btn.innerHTML = '<span>⬛</span> Stop';
            btn.classList.add('recording');
        } else {
            btn.innerHTML = '<span>🔴</span> Record';
            btn.classList.remove('recording');
        }
    }
}
