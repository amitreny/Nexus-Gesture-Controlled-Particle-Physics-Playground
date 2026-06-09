/**
 * Nexus — Physics Engine
 * @module PhysicsEngine
 * @description Integrates particle motion under force fields with boundary handling.
 */

export class PhysicsEngine {
    constructor(pool, forceManager) {
        /** @type {import('./Particle.js').ParticlePool} */
        this.pool = pool;
        /** @type {import('./ForceFields.js').ForceFieldManager} */
        this.forces = forceManager;

        // World configuration
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.drag = 0.98;            // Velocity damping per frame
        this.globalGravity = 0;      // Downward force (0 = space mode)
        this.bounceDamping = 0.6;    // Energy retained on wall bounce
        this.boundaryMode = 'bounce'; // 'bounce' | 'wrap' | 'kill'
        this.maxSpeed = 800;         // Velocity clamp
        this.forceMultiplier = 1.0;  // Global force scale

        // Audio-reactive modifiers
        this.audioPulse = 0;         // 0–1, bass energy
        this.audioEnergy = 0;        // 0–1, overall energy
    }

    /** Resize the simulation bounds. */
    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    /** Apply configuration from a preset. */
    applyConfig(config) {
        if (config.drag !== undefined) this.drag = config.drag;
        if (config.gravity !== undefined) this.globalGravity = config.gravity;
        if (config.bounceDamping !== undefined) this.bounceDamping = config.bounceDamping;
        if (config.boundaryMode !== undefined) this.boundaryMode = config.boundaryMode;
        if (config.maxSpeed !== undefined) this.maxSpeed = config.maxSpeed;
    }

    /**
     * Step the simulation forward by dt seconds.
     * @param {number} dt — Delta time in seconds, capped externally at ~0.033
     */
    update(dt) {
        const particles = this.pool.particles;
        const len = particles.length;
        const audioPulseMult = 1 + this.audioPulse * 0.5;
        let deadCount = 0;

        for (let i = 0; i < len; i++) {
            const p = particles[i];
            if (!p.alive) continue;

            // --- Accumulate forces via direct velocity integration ---
            // Force fields
            const [fx, fy] = this.forces.getCombinedForce(p.x, p.y);
            const scaledFx = fx * this.forceMultiplier * audioPulseMult;
            const scaledFy = fy * this.forceMultiplier * audioPulseMult;

            // Semi-implicit Euler: v += a*dt, then x += v*dt
            p.vx += (scaledFx / p.mass) * dt;
            p.vy += (scaledFy / p.mass + this.globalGravity) * dt;

            // Drag
            p.vx *= this.drag;
            p.vy *= this.drag;

            // Speed clamp (inline for perf)
            const speedSq = p.vx * p.vx + p.vy * p.vy;
            const maxSq = this.maxSpeed * this.maxSpeed;
            if (speedSq > maxSq) {
                const scale = this.maxSpeed / Math.sqrt(speedSq);
                p.vx *= scale;
                p.vy *= scale;
            }

            // Position update
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // --- Boundaries ---
            this._handleBoundary(p);

            // --- Life decay ---
            p.life -= dt;
            p.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

            if (p.life <= 0) {
                p.alive = false;
                deadCount++;
            }
        }

        // Correct active count
        this.pool._activeCount -= deadCount;
        if (this.pool._activeCount < 0) this.pool._activeCount = 0;

        // --- Handle emitters ---
        this._processEmitters(dt);
    }

    _handleBoundary(p) {
        const margin = 5;
        switch (this.boundaryMode) {
            case 'bounce':
                if (p.x < margin) {
                    p.x = margin;
                    p.vx = Math.abs(p.vx) * this.bounceDamping;
                } else if (p.x > this.width - margin) {
                    p.x = this.width - margin;
                    p.vx = -Math.abs(p.vx) * this.bounceDamping;
                }
                if (p.y < margin) {
                    p.y = margin;
                    p.vy = Math.abs(p.vy) * this.bounceDamping;
                } else if (p.y > this.height - margin) {
                    p.y = this.height - margin;
                    p.vy = -Math.abs(p.vy) * this.bounceDamping;
                }
                break;

            case 'wrap':
                if (p.x < 0) p.x += this.width;
                else if (p.x > this.width) p.x -= this.width;
                if (p.y < 0) p.y += this.height;
                else if (p.y > this.height) p.y -= this.height;
                break;

            case 'kill':
                if (p.x < -50 || p.x > this.width + 50 ||
                    p.y < -50 || p.y > this.height + 50) {
                    p.life = 0;
                }
                break;
        }
    }

    /** Continuously spawn particles at emitter locations. */
    _processEmitters(dt) {
        const emitters = this.forces.getEmitters();
        for (const emitter of emitters) {
            const count = Math.ceil(emitter.strength * dt * 0.1);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 80;
                this.pool.spawn(
                    emitter.x + (Math.random() - 0.5) * 10,
                    emitter.y + (Math.random() - 0.5) * 10,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    { life: 2 + Math.random() * 3 }
                );
            }
        }
    }
}
