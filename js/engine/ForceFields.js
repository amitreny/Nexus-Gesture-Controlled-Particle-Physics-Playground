/**
 * Nexus — Force Fields
 * @module ForceFields
 * @description Defines force field types and a manager to track active fields.
 *
 * Force fields are the bridge between input (hand gestures / mouse) and physics.
 * Controllers create and update force fields; the physics engine reads them.
 */

export const FORCE_TYPE = Object.freeze({
    ATTRACT: 'attract',
    REPEL:   'repel',
    VORTEX:  'vortex',
    EMIT:    'emit',
});

let _nextId = 0;

export class ForceField {
    /**
     * @param {string} type    - One of FORCE_TYPE values
     * @param {number} x       - Center x
     * @param {number} y       - Center y
     * @param {number} strength - Force magnitude (positive)
     * @param {number} radius  - Influence radius in pixels
     */
    constructor(type, x, y, strength = 400, radius = 250) {
        this.id = _nextId++;
        this.type = type;
        this.x = x;
        this.y = y;
        this.strength = strength;
        this.radius = radius;
        this.active = true;
        this.owner = null; // 'gesture-left', 'gesture-right', 'mouse', etc.
    }

    /**
     * Compute force vector on a particle at (px, py).
     * Returns [fx, fy]. Force falls off with inverse-square inside radius.
     */
    getForce(px, py) {
        if (!this.active) return [0, 0];

        const dx = this.x - px;
        const dy = this.y - py;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > this.radius || dist < 1) return [0, 0];

        // Smooth falloff: strength * (1 - dist/radius)^2
        const falloff = (1 - dist / this.radius);
        const magnitude = this.strength * falloff * falloff;

        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;

        switch (this.type) {
            case FORCE_TYPE.ATTRACT:
                return [nx * magnitude, ny * magnitude];

            case FORCE_TYPE.REPEL:
                return [-nx * magnitude, -ny * magnitude];

            case FORCE_TYPE.VORTEX:
                // Tangential force (perpendicular to radial direction)
                return [-ny * magnitude * 0.8, nx * magnitude * 0.8];

            case FORCE_TYPE.EMIT:
                // Emit doesn't apply force — handled by spawning logic
                return [0, 0];

            default:
                return [0, 0];
        }
    }
}

/**
 * Manages a collection of active force fields.
 */
export class ForceFieldManager {
    constructor() {
        /** @type {ForceField[]} */
        this.fields = [];
    }

    /** Add a new force field and return it. */
    add(type, x, y, strength, radius) {
        const field = new ForceField(type, x, y, strength, radius);
        this.fields.push(field);
        return field;
    }

    /** Remove a field by reference. */
    remove(field) {
        const idx = this.fields.indexOf(field);
        if (idx !== -1) this.fields.splice(idx, 1);
    }

    /** Remove all fields owned by a specific owner. */
    removeByOwner(owner) {
        this.fields = this.fields.filter(f => f.owner !== owner);
    }

    /** Find a field by owner. */
    findByOwner(owner) {
        return this.fields.find(f => f.owner === owner) || null;
    }

    /** Get combined force at a point from all active fields. */
    getCombinedForce(px, py) {
        let fx = 0, fy = 0;
        for (const field of this.fields) {
            const [ffx, ffy] = field.getForce(px, py);
            fx += ffx;
            fy += ffy;
        }
        return [fx, fy];
    }

    /** Get all active emitter fields (for spawning). */
    getEmitters() {
        return this.fields.filter(f => f.type === FORCE_TYPE.EMIT && f.active);
    }

    /** Clear all fields. */
    clear() {
        this.fields.length = 0;
    }

    get count() {
        return this.fields.filter(f => f.active).length;
    }
}
