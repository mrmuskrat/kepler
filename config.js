// Solar System Configuration
// All constants and astronomical data for the solar system model
//
// This file contains:
// - Physical constants (G, AU, SOLAR_MASS)
// - Planetary orbital data from NASA fact sheets
// - Default simulation settings
// - UI scaling multipliers
//
// Edit this file to customize planet properties, add new bodies,
// or adjust default settings. Changes take effect on page reload.

// ===== PHYSICAL CONSTANTS =====
const G = 6.67430e-11; // Gravitational constant in m³/(kg·s²)
const AU = 1.496e11; // Astronomical Unit in meters (Earth-Sun distance)
const SOLAR_MASS = 1.989e30; // Mass of the Sun in kg

// ===== SIMULATION DEFAULTS =====
const DEFAULT_CONFIG = {
    timeSpeed: 0.1,        // Initial time speed (days per frame)
    zoom: 1.1,             // Initial zoom level (actual, not displayed) - 1x displayed shows all planets
    showOrbits: true,
    showLabels: true,
    showVelocityVectors: false,
    showTrails: false,
    showPeriApo: false,
    maxTrailLength: 100,   // Maximum number of trail points to store
    baseScale: null,       // Will be calculated based on canvas size
    startAtCurrentDate: true,  // Start at current real-world date (true) or epoch with planets at perihelion (false)
    epoch: new Date('2000-01-01T12:00:00Z')  // J2000.0 reference epoch for orbital calculations
};

// ===== ASTRONOMICAL DATA =====
// Real data for each planet from NASA planetary fact sheets
// - semiMajorAxis: in Astronomical Units (AU)
// - eccentricity: orbital eccentricity (0 = circle, <1 = ellipse)
// - period: orbital period in Earth years
// - radius: display radius in pixels (not to scale)
// - color: hex color for rendering
// - mass: in kilograms
const PLANETS = {
    mercury: {
        name: "Mercury",
        semiMajorAxis: 0.387,
        eccentricity: 0.206,
        period: 0.241,
        radius: 2.5,
        color: "#8c7753",
        mass: 3.285e23
    },
    venus: {
        name: "Venus",
        semiMajorAxis: 0.723,
        eccentricity: 0.007,
        period: 0.615,
        radius: 6,
        color: "#ffc649",
        mass: 4.867e24
    },
    earth: {
        name: "Earth",
        semiMajorAxis: 1.0,
        eccentricity: 0.017,
        period: 1.0,
        radius: 6,
        color: "#4a90e2",
        mass: 5.972e24
    },
    mars: {
        name: "Mars",
        semiMajorAxis: 1.524,
        eccentricity: 0.093,
        period: 1.881,
        radius: 4,
        color: "#e27b58",
        mass: 6.39e23
    },
    jupiter: {
        name: "Jupiter",
        semiMajorAxis: 5.203,
        eccentricity: 0.048,
        period: 11.86,
        radius: 12,
        color: "#c88b3a",
        mass: 1.898e27
    },
    saturn: {
        name: "Saturn",
        semiMajorAxis: 9.537,
        eccentricity: 0.056,
        period: 29.46,
        radius: 10,
        color: "#f4d47c",
        mass: 5.683e26
    },
    uranus: {
        name: "Uranus",
        semiMajorAxis: 19.191,
        eccentricity: 0.046,
        period: 84.01,
        radius: 8,
        color: "#4fd0e7",
        mass: 8.681e25
    },
    neptune: {
        name: "Neptune",
        semiMajorAxis: 30.069,
        eccentricity: 0.010,
        period: 164.79,
        radius: 8,
        color: "#4166f5",
        mass: 1.024e26
    }
};

// ===== UI SCALING =====
const UI_SCALE = {
    timeSpeedMultiplier: 0.1,  // UI slider value → actual speed
    zoomMultiplier: 1.1,       // UI slider value → actual zoom (1x shows all planets)
};
