/**
 * Nexus — Post Effects
 * @module PostEffects
 * @description Vignette overlay, ambient background stars, and subtle grid.
 */

export class PostEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.enabled = true;

        // Ambient star field
        this._stars = [];
        this._initStars(200);

        // Vignette
        this._vignetteGradient = null;
        this._buildVignette();
    }

    _initStars(count) {
        this._stars = [];
        for (let i = 0; i < count; i++) {
            this._stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: 0.3 + Math.random() * 0.8,
                alpha: 0.1 + Math.random() * 0.3,
                twinkleSpeed: 0.5 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    _buildVignette() {
        // Will be rebuilt on resize
        this._vignetteCanvas = document.createElement('canvas');
        this._vignetteCtx = this._vignetteCanvas.getContext('2d');
        this._updateVignette();
    }

    _updateVignette() {
        const c = this._vignetteCanvas;
        const ctx = this._vignetteCtx;
        c.width = this.width;
        c.height = this.height;

        const cx = this.width / 2;
        const cy = this.height / 2;
        const r = Math.max(this.width, this.height) * 0.7;

        const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
        grad.addColorStop(0, 'rgba(5, 5, 16, 0)');
        grad.addColorStop(0.7, 'rgba(5, 5, 16, 0.3)');
        grad.addColorStop(1, 'rgba(5, 5, 16, 0.85)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this._initStars(200);
        this._updateVignette();
    }

    /**
     * Render ambient effects on top of the main scene.
     * @param {number} time — elapsed time in seconds
     */
    render(time) {
        if (!this.enabled) return;

        const ctx = this.ctx;

        // --- Ambient stars ---
        ctx.globalCompositeOperation = 'lighter';
        for (const star of this._stars) {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
            const alpha = star.alpha * (0.5 + 0.5 * twinkle);
            if (alpha < 0.02) continue;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // --- Vignette ---
        ctx.drawImage(this._vignetteCanvas, 0, 0);
    }
}
