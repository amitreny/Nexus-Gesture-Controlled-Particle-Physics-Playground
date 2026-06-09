/**
 * Nexus — Canvas Renderer
 * @module CanvasRenderer
 * @description High-performance Canvas2D particle renderer.
 *
 * Particles are drawn as colored dots with 'lighter' (additive) compositing.
 * Natural overlap creates organic glow without expensive post-processing.
 * Bloom is achieved via a separate offscreen canvas that only captures
 * the current frame's particles (not trail history), preventing feedback.
 */

export class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        // Trail: lower = longer trails
        this.trailAlpha = 0.06;

        // Visual config
        this.hueShift = 0;
        this.velocityHueShift = true;
        this.glowIntensity = 1.0;

        // Bloom: rendered to a separate canvas that is cleared each frame
        this.bloomEnabled = true;
        this.bloomIntensity = 0.2;
        this._particleCanvas = document.createElement('canvas'); // current frame particles only
        this._particleCtx = this._particleCanvas.getContext('2d');
        this.bloomCanvas = document.createElement('canvas');
        this.bloomCtx = this.bloomCanvas.getContext('2d');

        this.resize(this.width, this.height);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Particle canvas: same logical size, 1x DPR (perf)
        this._particleCanvas.width = w;
        this._particleCanvas.height = h;

        // Bloom at 1/5 res
        this.bloomCanvas.width = Math.floor(w * 0.2);
        this.bloomCanvas.height = Math.floor(h * 0.2);
    }

    render(pool, forces) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // --- Trail effect ---
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(5, 5, 16, ${this.trailAlpha})`;
        ctx.fillRect(0, 0, w, h);

        // --- Force field indicators ---
        this._drawForceFields(ctx, forces);

        // --- Draw particles to BOTH main canvas and particle-only canvas ---
        const pctx = this._particleCtx;

        // Clear particle canvas each frame (no trail accumulation here)
        if (this.bloomEnabled) {
            pctx.clearRect(0, 0, w, h);
            pctx.globalCompositeOperation = 'lighter';
        }

        ctx.globalCompositeOperation = 'lighter';

        const particles = pool.particles;
        const len = particles.length;

        for (let i = 0; i < len; i++) {
            const p = particles[i];
            if (!p.alive || p.alpha < 0.02) continue;

            let hue = p.baseHue + this.hueShift;
            if (this.velocityHueShift) {
                hue += Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.25;
            }
            hue = ((hue % 360) + 360) % 360;

            const alpha = Math.min(p.alpha * this.glowIntensity, 0.7);
            const color = `hsl(${hue | 0}, 100%, 70%)`;

            // Draw to main canvas
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, 6.2832);
            ctx.fill();

            // Draw to particle-only canvas (for bloom)
            if (this.bloomEnabled) {
                pctx.globalAlpha = alpha;
                pctx.fillStyle = color;
                pctx.beginPath();
                pctx.arc(p.x, p.y, p.radius, 0, 6.2832);
                pctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // --- Bloom pass (from particle-only canvas — no trail feedback) ---
        if (this.bloomEnabled) {
            pctx.globalAlpha = 1;
            pctx.globalCompositeOperation = 'source-over';
            this._renderBloom();
        }
    }

    _drawForceFields(ctx, forces) {
        if (forces.fields.length === 0) return;

        for (const f of forces.fields) {
            if (!f.active) continue;

            let color;
            switch (f.type) {
                case 'attract': color = '0, 240, 255'; break;
                case 'repel':   color = '255, 80, 100'; break;
                case 'vortex':  color = '168, 85, 247'; break;
                default:        color = '255, 255, 255';
            }

            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 0.4);
            grad.addColorStop(0, `rgba(${color}, 0.15)`);
            grad.addColorStop(1, `rgba(${color}, 0)`);

            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius * 0.4, 0, 6.2832);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    /**
     * Bloom from particle-only canvas (cleared each frame = no feedback loop).
     */
    _renderBloom() {
        const bctx = this.bloomCtx;
        const bw = this.bloomCanvas.width;
        const bh = this.bloomCanvas.height;

        // Downsample particle-only canvas (not main canvas!)
        bctx.clearRect(0, 0, bw, bh);
        bctx.drawImage(this._particleCanvas, 0, 0, bw, bh);

        // Blur
        bctx.filter = 'blur(6px)';
        bctx.drawImage(this.bloomCanvas, 0, 0);
        bctx.filter = 'none';

        // Composite bloom over main canvas
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.globalAlpha = this.bloomIntensity;
        this.ctx.drawImage(this.bloomCanvas, 0, 0, this.width, this.height);
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    applyConfig(config) {
        if (config.trailAlpha !== undefined) this.trailAlpha = config.trailAlpha;
        if (config.hueShift !== undefined) this.hueShift = config.hueShift;
        if (config.velocityHueShift !== undefined) this.velocityHueShift = config.velocityHueShift;
        if (config.glowIntensity !== undefined) this.glowIntensity = config.glowIntensity;
        if (config.bloomEnabled !== undefined) this.bloomEnabled = config.bloomEnabled;
        if (config.bloomIntensity !== undefined) this.bloomIntensity = config.bloomIntensity;
    }

    clearFull() {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
}
