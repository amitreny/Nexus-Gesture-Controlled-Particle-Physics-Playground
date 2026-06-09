/**
 * Nexus — Audio Controller
 * @module AudioController
 * @description Sound-reactive mode using Web Audio API.
 *              Analyzes microphone input and modulates physics/visuals.
 *
 * Frequency mapping:
 *   Bass  (0–200Hz)    → Global pulse force (expands particles outward)
 *   Mids  (200–2kHz)   → Hue shift intensity
 *   Highs (2kHz+)      → Particle spawn rate boost
 *   Volume             → Overall force multiplier
 */

export class AudioController {
    constructor() {
        this.enabled = false;
        this.ready = false;

        /** @type {AudioContext|null} */
        this._audioCtx = null;
        /** @type {AnalyserNode|null} */
        this._analyser = null;
        this._dataArray = null;
        this._freqArray = null;

        // Analyzed values (0–1 normalized)
        this.bass = 0;
        this.mids = 0;
        this.highs = 0;
        this.volume = 0;

        // Smoothing
        this._smoothBass = 0;
        this._smoothMids = 0;
        this._smoothHighs = 0;
        this._smoothVolume = 0;
        this._smoothing = 0.3; // EMA factor (lower = smoother)
    }

    /** Request microphone access and start analysis. */
    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = this._audioCtx.createMediaStreamSource(stream);

            this._analyser = this._audioCtx.createAnalyser();
            this._analyser.fftSize = 512;
            this._analyser.smoothingTimeConstant = 0.8;

            source.connect(this._analyser);
            // Don't connect to destination (no feedback loop)

            const bufferLength = this._analyser.frequencyBinCount;
            this._freqArray = new Uint8Array(bufferLength);
            this._dataArray = new Uint8Array(bufferLength);

            this.ready = true;
            this.enabled = true;
            console.log('[Nexus] Audio analysis started');
        } catch (err) {
            console.error('[Nexus] Microphone access denied:', err);
            this.ready = false;
            throw err;
        }
    }

    /**
     * Update frequency analysis. Call once per frame.
     */
    update() {
        if (!this.enabled || !this.ready || !this._analyser) return;

        this._analyser.getByteFrequencyData(this._freqArray);

        const bins = this._freqArray.length;
        const sampleRate = this._audioCtx.sampleRate;
        const binWidth = sampleRate / (this._analyser.fftSize);

        // Calculate frequency band boundaries (in bins)
        const bassEnd = Math.min(Math.floor(200 / binWidth), bins);
        const midsEnd = Math.min(Math.floor(2000 / binWidth), bins);

        // Average energy in each band
        let bassSum = 0, midsSum = 0, highsSum = 0, totalSum = 0;

        for (let i = 0; i < bins; i++) {
            const val = this._freqArray[i] / 255;
            totalSum += val;

            if (i < bassEnd) bassSum += val;
            else if (i < midsEnd) midsSum += val;
            else highsSum += val;
        }

        const rawBass = bassEnd > 0 ? bassSum / bassEnd : 0;
        const rawMids = (midsEnd - bassEnd) > 0 ? midsSum / (midsEnd - bassEnd) : 0;
        const rawHighs = (bins - midsEnd) > 0 ? highsSum / (bins - midsEnd) : 0;
        const rawVolume = bins > 0 ? totalSum / bins : 0;

        // EMA smoothing
        const s = this._smoothing;
        this._smoothBass += (rawBass - this._smoothBass) * s;
        this._smoothMids += (rawMids - this._smoothMids) * s;
        this._smoothHighs += (rawHighs - this._smoothHighs) * s;
        this._smoothVolume += (rawVolume - this._smoothVolume) * s;

        this.bass = this._smoothBass;
        this.mids = this._smoothMids;
        this.highs = this._smoothHighs;
        this.volume = this._smoothVolume;
    }

    /** Apply audio analysis to physics engine and renderer. */
    applyToEngine(physicsEngine, renderer) {
        if (!this.enabled) return;

        // Bass → pulse force (expand particles outward)
        physicsEngine.audioPulse = this.bass;
        physicsEngine.audioEnergy = this.volume;

        // Mids → hue shift
        renderer.hueShift = this.mids * 120; // Shift up to 120°

        // Volume → glow intensity
        renderer.glowIntensity = 0.8 + this.volume * 0.8;

        // Bass → trail length (more bass = longer trails)
        renderer.trailAlpha = Math.max(0.02, 0.08 - this.bass * 0.06);
    }

    /** Stop audio analysis. */
    stop() {
        this.enabled = false;
        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
        }
        this._analyser = null;
        this.bass = 0;
        this.mids = 0;
        this.highs = 0;
        this.volume = 0;
    }
}
