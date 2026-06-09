/**
 * Nexus — Visual Presets
 * @module VisualPresets
 * @description Curated configurations for particle appearance, physics, and rendering.
 *              Each preset defines a complete "mood" for the simulation.
 */

export const PRESETS = {
    nebula: {
        name: 'Nebula',
        icon: '🌌',
        description: 'Deep space gas cloud',
        particle: {
            hueRange: [180, 300],   // Cyan → Purple → Pink
            radiusRange: [1.5, 4],
            lifeRange: [4, 8],
            mass: 1,
        },
        physics: {
            drag: 0.985,
            gravity: 0,
            bounceDamping: 0.5,
            boundaryMode: 'bounce',
            maxSpeed: 600,
        },
        renderer: {
            trailAlpha: 0.04,
            hueShift: 0,
            velocityHueShift: true,
            glowIntensity: 1.0,
            bloomEnabled: true,
            bloomIntensity: 0.45,
        },
        spawnCount: 6000,
        spawnSpeed: 30,
    },

    ocean: {
        name: 'Ocean',
        icon: '🌊',
        description: 'Underwater currents',
        particle: {
            hueRange: [170, 220],   // Teal → Blue
            radiusRange: [1, 3],
            lifeRange: [3, 7],
            mass: 1.2,
        },
        physics: {
            drag: 0.975,
            gravity: 15,
            bounceDamping: 0.4,
            boundaryMode: 'bounce',
            maxSpeed: 500,
        },
        renderer: {
            trailAlpha: 0.06,
            hueShift: 0,
            velocityHueShift: true,
            glowIntensity: 0.8,
            bloomEnabled: true,
            bloomIntensity: 0.3,
        },
        spawnCount: 5000,
        spawnSpeed: 25,
    },

    fireflies: {
        name: 'Fireflies',
        icon: '✨',
        description: 'Summer night meadow',
        particle: {
            hueRange: [30, 60],     // Warm yellow → Orange
            radiusRange: [1, 2.5],
            lifeRange: [2, 5],
            mass: 0.5,
        },
        physics: {
            drag: 0.99,
            gravity: -5,
            bounceDamping: 0.7,
            boundaryMode: 'bounce',
            maxSpeed: 200,
        },
        renderer: {
            trailAlpha: 0.12,
            hueShift: 0,
            velocityHueShift: false,
            glowIntensity: 1.2,
            bloomEnabled: true,
            bloomIntensity: 0.5,
        },
        spawnCount: 2500,
        spawnSpeed: 15,
    },

    aurora: {
        name: 'Aurora',
        icon: '🌈',
        description: 'Northern lights',
        particle: {
            hueRange: [100, 280],   // Green → Cyan → Violet
            radiusRange: [1, 3.5],
            lifeRange: [5, 10],
            mass: 0.8,
        },
        physics: {
            drag: 0.992,
            gravity: 0,
            bounceDamping: 0.3,
            boundaryMode: 'wrap',
            maxSpeed: 300,
        },
        renderer: {
            trailAlpha: 0.025,
            hueShift: 0,
            velocityHueShift: true,
            glowIntensity: 1.1,
            bloomEnabled: true,
            bloomIntensity: 0.55,
        },
        spawnCount: 4500,
        spawnSpeed: 20,
    },

    void: {
        name: 'Void',
        icon: '🕳️',
        description: 'Black hole simulation',
        particle: {
            hueRange: [0, 40],      // Red → Orange → White
            radiusRange: [1, 3],
            lifeRange: [3, 6],
            mass: 1.5,
        },
        physics: {
            drag: 0.97,
            gravity: 0,
            bounceDamping: 0.8,
            boundaryMode: 'kill',
            maxSpeed: 1000,
        },
        renderer: {
            trailAlpha: 0.03,
            hueShift: 0,
            velocityHueShift: true,
            glowIntensity: 1.3,
            bloomEnabled: true,
            bloomIntensity: 0.6,
        },
        spawnCount: 8000,
        spawnSpeed: 50,
    },
};

/**
 * Get a random value for particle properties based on preset ranges.
 */
export function randomFromPreset(preset) {
    const p = preset.particle;
    const hue = p.hueRange[0] + Math.random() * (p.hueRange[1] - p.hueRange[0]);
    const radius = p.radiusRange[0] + Math.random() * (p.radiusRange[1] - p.radiusRange[0]);
    const life = p.lifeRange[0] + Math.random() * (p.lifeRange[1] - p.lifeRange[0]);
    return { hue, radius, life, mass: p.mass };
}

/** Default preset key. */
export const DEFAULT_PRESET = 'nebula';
