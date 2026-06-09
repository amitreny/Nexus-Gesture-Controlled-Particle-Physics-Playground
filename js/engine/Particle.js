/**
 * Nexus — Gesture-Controlled Particle Physics Playground
 * @module Particle
 * @description Particle entity and object pool with zero-allocation recycling.
 */

export class Particle {
    constructor() {
        this.alive = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.mass = 1;
        this.radius = 2;
        this.life = 0;
        this.maxLife = 5;
        this.baseHue = 200;
        this.alpha = 1;
    }

    /** Initialize a recycled particle with new properties. */
    init(x, y, vx, vy, opts = {}) {
        this.alive = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = opts.mass ?? 1;
        this.radius = opts.radius ?? (1.5 + Math.random() * 2);
        this.life = opts.life ?? (3 + Math.random() * 4);
        this.maxLife = this.life;
        this.baseHue = opts.hue ?? 200;
        this.alpha = 1;
        return this;
    }

    /** Apply force vector (a = F/m). */
    applyForce(fx, fy) {
        this.vx += fx / this.mass;
        this.vy += fy / this.mass;
    }

    /** Get speed magnitude. */
    get speed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }
}

/**
 * Pre-allocated pool with O(1) amortized spawn via free-list cursor.
 */
export class ParticlePool {
    constructor(maxSize = 15000) {
        this.maxSize = maxSize;
        this.particles = Array.from({ length: maxSize }, () => new Particle());
        this._activeCount = 0;
        this._cursor = 0; // hint for next free slot
    }

    get activeCount() {
        return this._activeCount;
    }

    /** Spawn a single particle. Returns the particle or null if pool full. */
    spawn(x, y, vx, vy, opts = {}) {
        const len = this.maxSize;
        for (let i = 0; i < len; i++) {
            const idx = (this._cursor + i) % len;
            const p = this.particles[idx];
            if (!p.alive) {
                p.init(x, y, vx, vy, opts);
                this._activeCount++;
                this._cursor = (idx + 1) % len;
                return p;
            }
        }
        return null;
    }

    /** Spawn a radial burst of particles. */
    spawnBurst(x, y, count, speed, opts = {}) {
        const step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = step * i + (Math.random() - 0.5) * 0.4;
            const s = speed * (0.5 + Math.random() * 0.5);
            this.spawn(x, y, Math.cos(angle) * s, Math.sin(angle) * s, opts);
        }
    }

    /** Spawn particles streaming from a point. */
    spawnStream(x, y, count, angle, spread, speed, opts = {}) {
        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed * (0.3 + Math.random() * 0.7);
            this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, opts);
        }
    }

    /** Kill a particle and return it to the pool. */
    kill(particle) {
        if (particle.alive) {
            particle.alive = false;
            this._activeCount--;
        }
    }

    /** Kill all particles. */
    clear() {
        for (const p of this.particles) {
            p.alive = false;
        }
        this._activeCount = 0;
        this._cursor = 0;
    }

    /** Recount active particles (use if count drifts). */
    recount() {
        let c = 0;
        for (const p of this.particles) {
            if (p.alive) c++;
        }
        this._activeCount = c;
        return c;
    }
}
