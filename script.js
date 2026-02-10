// Solar System Model - Based on OpenStax Astronomy 2e
// Implements Kepler's Laws and Newtonian Mechanics
// Configuration is loaded from config.js

// ===== SIMULATION STATE =====
class SolarSystem {
    constructor(canvas) {
        try {
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Could not get 2D context from canvas');
            }
            
            this.resize();
        
        // Simulation parameters (from config)
        this.timeSpeed = DEFAULT_CONFIG.timeSpeed;
        this.currentTime = 0; // Days since epoch
        this.isPaused = false;
        this.zoom = DEFAULT_CONFIG.zoom;
        this.showOrbits = DEFAULT_CONFIG.showOrbits;
        this.showLabels = DEFAULT_CONFIG.showLabels;
        this.showVelocityVectors = DEFAULT_CONFIG.showVelocityVectors;
        this.showTrails = DEFAULT_CONFIG.showTrails;
        this.showPeriApo = DEFAULT_CONFIG.showPeriApo;
        
        // Planet states
        this.planetStates = {};
        this.selectedPlanet = null;
        
        // Orbital trails
        this.maxTrailLength = DEFAULT_CONFIG.maxTrailLength;
        
        // Initialize planet states
        this.initializePlanets();
        
        // Mouse interaction
        this.setupMouseInteraction();
        
        // Keyboard controls
        this.setupKeyboardControls();
        } catch (error) {
            console.error('Error initializing solar system:', error);
            this.showError('Failed to initialize solar system: ' + error.message);
            throw error;
        }
    }
    
    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        // Scale: pixels per AU (adjusted to fit the solar system)
        this.baseScale = Math.min(this.canvas.width, this.canvas.height) / 70;
        
        // Detect mobile device
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (window.innerWidth <= 768);
    }
    
    initializePlanets() {
        try {
            // Calculate initial time offset if starting at current date
            let timeOffset = 0;
            if (DEFAULT_CONFIG.startAtCurrentDate) {
                const now = new Date();
                const epoch = DEFAULT_CONFIG.epoch;
                
                // Validate dates
                if (!(now instanceof Date) || isNaN(now.getTime())) {
                    throw new Error('Invalid current date');
                }
                if (!(epoch instanceof Date) || isNaN(epoch.getTime())) {
                    throw new Error('Invalid epoch date in configuration');
                }
                
                // Calculate days since epoch (J2000.0)
                timeOffset = (now - epoch) / (1000 * 60 * 60 * 24);
                
                if (!isFinite(timeOffset)) {
                    throw new Error('Invalid time offset calculation');
                }
                
                this.currentTime = timeOffset;
            }
            
            // Validate PLANETS object
            if (!PLANETS || typeof PLANETS !== 'object') {
                throw new Error('PLANETS configuration is missing or invalid');
            }
            
            // Initialize each planet with calculated position
            Object.keys(PLANETS).forEach(key => {
                try {
                    const planet = PLANETS[key];
                    
                    // Validate planet data
                    if (!planet.period || planet.period <= 0) {
                        throw new Error(`Invalid period for ${key}`);
                    }
                    
                    // Calculate mean anomaly based on time since epoch
                    let meanAnomaly = 0;
                    if (timeOffset > 0) {
                        const periodInDays = planet.period * 365.25;
                        if (periodInDays <= 0 || !isFinite(periodInDays)) {
                            throw new Error(`Invalid period calculation for ${key}`);
                        }
                        meanAnomaly = (2 * Math.PI * timeOffset / periodInDays) % (2 * Math.PI);
                    }
                    
                    this.planetStates[key] = {
                        data: planet,
                        meanAnomaly: meanAnomaly,
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 },
                        trail: [] // Array to store recent positions for trail
                    };
                    
                    // Calculate initial position immediately
                    this.planetStates[key].position = this.calculateOrbitalPosition(planet, meanAnomaly);
                } catch (planetError) {
                    console.error(`Error initializing planet ${key}:`, planetError);
                    // Continue with other planets even if one fails
                }
            });
            
            // Verify at least one planet was initialized
            if (Object.keys(this.planetStates).length === 0) {
                throw new Error('No planets were successfully initialized');
            }
        } catch (error) {
            console.error('Error in initializePlanets:', error);
            this.showError('Failed to initialize planets: ' + error.message);
            throw error;
        }
    }
    
    // ===== KEPLER'S EQUATION SOLVER =====
    // Solve Kepler's equation: E - e*sin(E) = M
    // Where E is eccentric anomaly, e is eccentricity, M is mean anomaly
    solveKeplersEquation(M, e, tolerance = 1e-6) {
        // Validate inputs
        if (isNaN(M) || isNaN(e)) {
            console.warn('Invalid input to Kepler equation solver:', { M, e });
            return 0;
        }
        
        if (e < 0 || e >= 1) {
            console.warn('Invalid eccentricity (must be 0 <= e < 1):', e);
            e = Math.max(0, Math.min(0.99, e));
        }
        
        let E = M; // Initial guess
        let delta = 1;
        let iterations = 0;
        const maxIterations = 100;
        
        // Newton-Raphson method
        while (Math.abs(delta) > tolerance && iterations < maxIterations) {
            const denominator = 1 - e * Math.cos(E);
            if (Math.abs(denominator) < 1e-10) {
                console.warn('Near-zero denominator in Kepler solver');
                break;
            }
            delta = (E - e * Math.sin(E) - M) / denominator;
            E = E - delta;
            iterations++;
        }
        
        if (iterations >= maxIterations) {
            console.warn('Kepler equation solver did not converge after', maxIterations, 'iterations');
        }
        
        return E;
    }
    
    // ===== ORBITAL POSITION CALCULATION =====
    // Calculate position using Kepler's laws
    calculateOrbitalPosition(planet, meanAnomaly) {
        try {
            const a = planet.semiMajorAxis; // Semi-major axis
            const e = planet.eccentricity;  // Eccentricity
            
            // Validate inputs
            if (isNaN(a) || a <= 0) {
                throw new Error(`Invalid semi-major axis: ${a}`);
            }
            if (isNaN(e) || e < 0 || e >= 1) {
                throw new Error(`Invalid eccentricity: ${e}`);
            }
            if (isNaN(meanAnomaly)) {
                throw new Error(`Invalid mean anomaly: ${meanAnomaly}`);
            }
            
            // Solve Kepler's equation for eccentric anomaly
            const E = this.solveKeplersEquation(meanAnomaly, e);
            
            // Convert to Cartesian coordinates in orbital plane
            // x' = a(cos E - e)
            // y' = a√(1-e²) sin E
            const x = a * (Math.cos(E) - e);
            const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
            
            // Validate results
            if (!isFinite(x) || !isFinite(y)) {
                throw new Error('Invalid position calculation result');
            }
            
            return { x, y };
        } catch (error) {
            console.error('Error calculating orbital position:', error);
            // Return fallback position at semi-major axis
            return { x: planet.semiMajorAxis || 1, y: 0 };
        }
    }
    
    // ===== ORBITAL VELOCITY CALCULATION =====
    // Calculate velocity using vis-viva equation: v² = GM(2/r - 1/a)
    calculateOrbitalVelocity(planet, position) {
        try {
            const a = planet.semiMajorAxis * AU; // Convert to meters
            const r = Math.sqrt(position.x * position.x + position.y * position.y) * AU;
            
            // Validate inputs
            if (r <= 0 || !isFinite(r)) {
                throw new Error(`Invalid distance: ${r}`);
            }
            if (a <= 0 || !isFinite(a)) {
                throw new Error(`Invalid semi-major axis: ${a}`);
            }
            
            // Vis-viva equation
            const vSquared = G * SOLAR_MASS * (2 / r - 1 / a);
            
            // Check for negative value under square root
            if (vSquared < 0) {
                console.warn('Negative value in vis-viva equation, using absolute value');
            }
            
            const v = Math.sqrt(Math.abs(vSquared));
            
            // Validate result
            if (!isFinite(v)) {
                throw new Error('Invalid velocity calculation result');
            }
            
            // Return in km/s
            return v / 1000;
        } catch (error) {
            console.error('Error calculating orbital velocity:', error);
            return 0;
        }
    }
    
    // ===== KEPLER'S THIRD LAW VERIFICATION =====
    // T² = (4π²/GM) * a³
    verifyKeplersThirdLaw(planet) {
        const a = planet.semiMajorAxis * AU; // meters
        const GM = G * SOLAR_MASS;
        
        // Calculate period from Kepler's Third Law
        const T_seconds = 2 * Math.PI * Math.sqrt((a * a * a) / GM);
        const T_years = T_seconds / (365.25 * 24 * 3600);
        
        return T_years;
    }
    
    // ===== UPDATE SIMULATION =====
    update(deltaTime) {
        try {
            if (this.isPaused) return;
            
            // Validate deltaTime
            if (!isFinite(deltaTime) || isNaN(deltaTime)) {
                console.warn('Invalid deltaTime:', deltaTime);
                return;
            }
            
            // Advance time (deltaTime is in Earth days)
            this.currentTime += deltaTime * this.timeSpeed;
            
            // Update each planet
            Object.keys(this.planetStates).forEach(key => {
                const state = this.planetStates[key];
                const planet = state.data;
                
                // Calculate mean anomaly: M = 2π * t / T
                // Convert current time (in days) to fraction of planet's period
                const periodInDays = planet.period * 365.25;
                
                if (periodInDays <= 0 || !isFinite(periodInDays)) {
                    console.warn(`Invalid period for ${key}:`, periodInDays);
                    return;
                }
                
                const meanAnomaly = (2 * Math.PI * this.currentTime / periodInDays) % (2 * Math.PI);
                
                state.meanAnomaly = meanAnomaly;
                
                // Calculate position using Kepler's laws
                state.position = this.calculateOrbitalPosition(planet, meanAnomaly);
                
                // Calculate velocity
                const velocity = this.calculateOrbitalVelocity(planet, state.position);
                
                // Calculate velocity direction (perpendicular to radius vector)
                const r = Math.sqrt(state.position.x ** 2 + state.position.y ** 2);
                if (r > 0) {
                    // Velocity is perpendicular to position (counterclockwise)
                    state.velocity = {
                        x: -state.position.y / r * velocity,
                        y: state.position.x / r * velocity
                    };
                }
                
                // Add to trail if enabled
                if (this.showTrails) {
                    state.trail.push({ x: state.position.x, y: state.position.y });
                    if (state.trail.length > this.maxTrailLength) {
                        state.trail.shift();
                    }
                } else {
                    state.trail = [];
                }
            });
        } catch (error) {
            console.error('Error updating simulation:', error);
            this.isPaused = true; // Pause simulation on error
            this.showError('Simulation error: ' + error.message);
        }
    }
    
    // ===== RENDERING =====
    draw() {
        try {
            // Clear canvas
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Apply zoom
            const scale = this.baseScale * this.zoom;
            
            // Validate scale
            if (!isFinite(scale) || scale <= 0) {
                throw new Error('Invalid scale value: ' + scale);
            }
            
            // Draw orbits
            if (this.showOrbits) {
                this.drawOrbits(scale);
            }
            
            // Draw perihelion/aphelion markers
            if (this.showPeriApo) {
                this.drawPeriAphelion(scale);
            }
            
            // Draw trails
            if (this.showTrails) {
                this.drawTrails(scale);
            }
            
            // Draw Sun
            this.drawSun();
            
            // Draw planets
            this.drawPlanets(scale);
            
            // Draw scale indicator
            this.drawScaleIndicator(scale);
            
            // Update information panel
            this.updateInfoPanel();
        } catch (error) {
            console.error('Error rendering frame:', error);
            // Try to display error message on canvas
            try {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Rendering error - see console', 10, 30);
            } catch (e) {
                // Can't even display error, just log it
                console.error('Failed to display error on canvas:', e);
            }
        }
    }
    
    drawSun() {
        // Scale sun size with zoom - smaller when zoomed out, full size at 25x+
        const sunRadius = 3 + 12 * Math.min(this.zoom / 25, 1);
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, sunRadius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, sunRadius * 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Sun core
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, sunRadius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        if (this.showLabels) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Sun', this.centerX, this.centerY - sunRadius - 10);
        }
    }
    
    drawOrbits(scale) {
        this.ctx.strokeStyle = 'rgba(100, 181, 246, 0.3)';
        this.ctx.lineWidth = 1;
        
        Object.keys(PLANETS).forEach(key => {
            const planet = PLANETS[key];
            const a = planet.semiMajorAxis * scale;
            const b = a * Math.sqrt(1 - planet.eccentricity ** 2);
            const c = a * planet.eccentricity;
            
            this.ctx.save();
            // Flip y-axis for counterclockwise motion (astronomical convention)
            // Translate center of ellipse to -c (sun is at one focus)
            this.ctx.translate(this.centerX - c, this.centerY);
            this.ctx.scale(1, -1);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }
    
    drawPlanets(scale) {
        Object.keys(this.planetStates).forEach(key => {
            const state = this.planetStates[key];
            const planet = state.data;
            const pos = state.position;
            
            // Convert AU to screen coordinates
            // Flip y-axis for counterclockwise motion (astronomical convention)
            const screenX = this.centerX + pos.x * scale;
            const screenY = this.centerY - pos.y * scale;
            
            // Draw planet
            const radius = planet.radius;
            const isSelected = this.selectedPlanet === key;
            
            // Highlight selected planet
            if (isSelected) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, radius + 5, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
            
            // Draw planet
            this.ctx.fillStyle = planet.color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw label
            if (this.showLabels) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(planet.name, screenX, screenY - radius - 8);
            }
            
            // Draw velocity vector
            if (this.showVelocityVectors) {
                const vel = state.velocity;
                const velMag = Math.sqrt(vel.x ** 2 + vel.y ** 2);
                const velScale = 2; // Scale factor for visibility
                
                this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, screenY);
                // Flip y-component for screen coordinates
                this.ctx.lineTo(
                    screenX + (vel.x / velMag) * radius * velScale,
                    screenY - (vel.y / velMag) * radius * velScale
                );
                this.ctx.stroke();
            }
        });
    }
    
    drawTrails(scale) {
        Object.keys(this.planetStates).forEach(key => {
            const state = this.planetStates[key];
            const planet = state.data;
            
            if (state.trail.length < 2) return;
            
            this.ctx.strokeStyle = planet.color;
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.5;
            
            this.ctx.beginPath();
            for (let i = 0; i < state.trail.length; i++) {
                const pos = state.trail[i];
                const screenX = this.centerX + pos.x * scale;
                const screenY = this.centerY - pos.y * scale;
                
                if (i === 0) {
                    this.ctx.moveTo(screenX, screenY);
                } else {
                    this.ctx.lineTo(screenX, screenY);
                }
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        });
    }
    
    drawPeriAphelion(scale) {
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        
        Object.keys(PLANETS).forEach(key => {
            const planet = PLANETS[key];
            const a = planet.semiMajorAxis;
            const e = planet.eccentricity;
            
            // Perihelion (closest): x = a(1-e), y = 0
            const periX = this.centerX + a * (1 - e) * scale;
            const periY = this.centerY;
            
            // Aphelion (farthest): x = -a(1+e), y = 0
            const apoX = this.centerX - a * (1 + e) * scale;
            const apoY = this.centerY;
            
            // Draw perihelion marker (red)
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(periX, periY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw aphelion marker (blue)
            this.ctx.fillStyle = 'rgba(100, 100, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(apoX, apoY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    drawScaleIndicator(scale) {
        const scaleBarLength = 1 * scale; // 1 AU in pixels
        const margin = 20;
        const barX = margin;
        const barY = this.canvas.height - margin - 10;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX - 5, barY - 20, scaleBarLength + 10, 35);
        
        // Scale bar
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(barX, barY);
        this.ctx.lineTo(barX + scaleBarLength, barY);
        this.ctx.stroke();
        
        // End marks
        this.ctx.beginPath();
        this.ctx.moveTo(barX, barY - 5);
        this.ctx.lineTo(barX, barY + 5);
        this.ctx.moveTo(barX + scaleBarLength, barY - 5);
        this.ctx.lineTo(barX + scaleBarLength, barY + 5);
        this.ctx.stroke();
        
        // Label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('1 AU', barX + scaleBarLength / 2, barY - 8);
        this.ctx.fillText(`(${(AU / 1e6).toFixed(0)} million km)`, barX + scaleBarLength / 2, barY + 18);
    }
    
    updateInfoPanel() {
        // Update date - convert simulation time to actual date
        let displayDate;
        if (DEFAULT_CONFIG.startAtCurrentDate) {
            const epochTime = DEFAULT_CONFIG.epoch.getTime();
            const currentTimeMs = epochTime + (this.currentTime * 24 * 60 * 60 * 1000);
            const date = new Date(currentTimeMs);
            displayDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else {
            const earthYears = this.currentTime / 365.25;
            const years = Math.floor(earthYears);
            const days = Math.floor((earthYears - years) * 365.25);
            displayDate = `Year ${years}, Day ${days}`;
        }
        document.getElementById('currentDate').textContent = displayDate;
        
        // Update selected planet info
        if (this.selectedPlanet) {
            const state = this.planetStates[this.selectedPlanet];
            const planet = state.data;
            const pos = state.position;
            
            document.getElementById('planetName').textContent = planet.name;
            
            const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2);
            document.getElementById('planetDistance').textContent = 
                `${distance.toFixed(3)} AU (${(distance * AU / 1e9).toFixed(2)} million km)`;
            
            const velocity = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2);
            document.getElementById('planetVelocity').textContent = 
                `${velocity.toFixed(2)} km/s`;
            
            document.getElementById('planetPeriod').textContent = 
                `${planet.period.toFixed(2)} Earth years (${(planet.period * 365.25).toFixed(0)} days)`;
            
            document.getElementById('planetEccentricity').textContent = 
                `${planet.eccentricity.toFixed(3)}`;
        } else {
            document.getElementById('planetName').textContent = 'None (click a planet)';
            document.getElementById('planetDistance').textContent = '-';
            document.getElementById('planetVelocity').textContent = '-';
            document.getElementById('planetPeriod').textContent = '-';
            document.getElementById('planetEccentricity').textContent = '-';
        }
    }
    
    // Show error message to user
    showError(message) {
        try {
            // Create error overlay if it doesn't exist
            let errorOverlay = document.getElementById('errorOverlay');
            if (!errorOverlay) {
                errorOverlay = document.createElement('div');
                errorOverlay.id = 'errorOverlay';
                errorOverlay.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(244, 67, 54, 0.95);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    font-family: Arial, sans-serif;
                    max-width: 400px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    z-index: 10000;
                    cursor: pointer;
                `;
                errorOverlay.onclick = () => errorOverlay.remove();
                document.body.appendChild(errorOverlay);
            }
            
            // Update error message
            errorOverlay.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Error</div>
                <div style="font-size: 0.9em;">${message}</div>
                <div style="font-size: 0.8em; margin-top: 8px; opacity: 0.8;">Click to dismiss</div>
            `;
            
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                if (errorOverlay && errorOverlay.parentNode) {
                    errorOverlay.remove();
                }
            }, 10000);
        } catch (error) {
            // If we can't show the error UI, at least log it
            console.error('Failed to display error message:', error);
        }
    }
    
    setupMouseInteraction() {
        // Helper function to find planet at position
        const findPlanetAtPosition = (x, y) => {
            const scale = this.baseScale * this.zoom;
            let closestPlanet = null;
            let closestDist = Infinity;
            
            Object.keys(this.planetStates).forEach(key => {
                const state = this.planetStates[key];
                const planet = state.data;
                const pos = state.position;
                
                // Flip y-axis for screen coordinates
                const screenX = this.centerX + pos.x * scale;
                const screenY = this.centerY - pos.y * scale;
                
                const dist = Math.sqrt(
                    (x - screenX) ** 2 + (y - screenY) ** 2
                );
                
                // Larger hit area for mobile (20px vs 10px)
                const hitRadius = planet.radius + (this.isMobile ? 20 : 10);
                if (dist < hitRadius && dist < closestDist) {
                    closestDist = dist;
                    closestPlanet = key;
                }
            });
            
            return closestPlanet;
        };
        
        // Mouse events
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            this.selectedPlanet = findPlanetAtPosition(clickX, clickY);
        });
        
        // Touch events
        this.setupTouchControls(findPlanetAtPosition);
    }
    
    setupTouchControls(findPlanetAtPosition) {
        let lastTouchDistance = 0;
        let initialZoom = this.zoom;
        let touchStartTime = 0;
        let touchMoved = false;
        
        // Prevent default touch behaviors on canvas
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartTime = Date.now();
            touchMoved = false;
            
            if (e.touches.length === 2) {
                // Two fingers - prepare for pinch zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                initialZoom = this.zoom;
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            touchMoved = true;
            
            if (e.touches.length === 2) {
                // Two fingers - pinch to zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (lastTouchDistance > 0) {
                    const scale = currentDistance / lastTouchDistance;
                    let newZoom = initialZoom * scale;
                    
                    // Clamp zoom to valid range
                    newZoom = Math.max(1.1, Math.min(22, newZoom));
                    this.zoom = newZoom;
                    
                    // Update UI
                    const zoomSlider = document.getElementById('zoom');
                    const zoomValue = document.getElementById('zoomValue');
                    if (zoomSlider && zoomValue) {
                        zoomSlider.value = this.zoom / UI_SCALE.zoomMultiplier;
                        zoomValue.textContent = `${(this.zoom / UI_SCALE.zoomMultiplier).toFixed(1)}x`;
                    }
                }
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Single tap to select planet
            if (e.changedTouches.length === 1 && !touchMoved) {
                const touchDuration = Date.now() - touchStartTime;
                
                // Only count as tap if quick (< 300ms)
                if (touchDuration < 300) {
                    const touch = e.changedTouches[0];
                    const rect = this.canvas.getBoundingClientRect();
                    const touchX = touch.clientX - rect.left;
                    const touchY = touch.clientY - rect.top;
                    this.selectedPlanet = findPlanetAtPosition(touchX, touchY);
                }
            }
            
            // Reset touch state
            lastTouchDistance = 0;
        }, { passive: false });
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            try {
                // Prevent default for keys we handle
                const handledKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '=', '_', 'Escape'];
                if (handledKeys.includes(e.key) || /^[1-8]$/.test(e.key)) {
                    e.preventDefault();
                }
                
                switch(e.key) {
                    case ' ': // Space - pause/play
                        this.isPaused = !this.isPaused;
                        const pauseBtn = document.getElementById('pausePlay');
                        if (pauseBtn) {
                            pauseBtn.textContent = this.isPaused ? 'Play' : 'Pause';
                        }
                        break;
                        
                    case 'ArrowUp':
                    case '+':
                    case '=': // Zoom in
                        this.zoom = Math.min(22, this.zoom + 0.6);
                        const zoomInSlider = document.getElementById('zoom');
                        const zoomInValue = document.getElementById('zoomValue');
                        if (zoomInSlider && zoomInValue) {
                            zoomInSlider.value = this.zoom / UI_SCALE.zoomMultiplier;
                            zoomInValue.textContent = `${(this.zoom / UI_SCALE.zoomMultiplier).toFixed(1)}x`;
                        }
                        break;
                        
                    case 'ArrowDown':
                    case '-':
                    case '_': // Zoom out
                        this.zoom = Math.max(1.1, this.zoom - 0.6);
                        const zoomOutSlider = document.getElementById('zoom');
                        const zoomOutValue = document.getElementById('zoomValue');
                        if (zoomOutSlider && zoomOutValue) {
                            zoomOutSlider.value = this.zoom / UI_SCALE.zoomMultiplier;
                            zoomOutValue.textContent = `${(this.zoom / UI_SCALE.zoomMultiplier).toFixed(1)}x`;
                        }
                        break;
                    
                    case 'ArrowRight': // Speed up
                        this.timeSpeed = Math.min(1.0, this.timeSpeed + 0.01);
                        const speedUpSlider = document.getElementById('timeSpeed');
                        const speedUpValue = document.getElementById('timeSpeedValue');
                        if (speedUpSlider && speedUpValue) {
                            speedUpSlider.value = this.timeSpeed / UI_SCALE.timeSpeedMultiplier;
                            speedUpValue.textContent = `${(this.timeSpeed / UI_SCALE.timeSpeedMultiplier).toFixed(1)}x`;
                        }
                        break;
                        
                    case 'ArrowLeft': // Slow down
                        this.timeSpeed = Math.max(0, this.timeSpeed - 0.01);
                        const slowDownSlider = document.getElementById('timeSpeed');
                        const slowDownValue = document.getElementById('timeSpeedValue');
                        if (slowDownSlider && slowDownValue) {
                            slowDownSlider.value = this.timeSpeed / UI_SCALE.timeSpeedMultiplier;
                            slowDownValue.textContent = `${(this.timeSpeed / UI_SCALE.timeSpeedMultiplier).toFixed(1)}x`;
                        }
                        break;
                        
                    case 'Escape': // Deselect planet
                        this.selectedPlanet = null;
                        break;
                        
                    case '1':
                        this.selectedPlanet = 'mercury';
                        break;
                    case '2':
                        this.selectedPlanet = 'venus';
                        break;
                    case '3':
                        this.selectedPlanet = 'earth';
                        break;
                    case '4':
                        this.selectedPlanet = 'mars';
                        break;
                    case '5':
                        this.selectedPlanet = 'jupiter';
                        break;
                    case '6':
                        this.selectedPlanet = 'saturn';
                        break;
                    case '7':
                        this.selectedPlanet = 'uranus';
                        break;
                    case '8':
                        this.selectedPlanet = 'neptune';
                        break;
                }
            } catch (error) {
                console.error('Error handling keyboard input:', error);
            }
        });
    }
}

// ===== INITIALIZATION =====
let solarSystem;
let animationId;

function init() {
    try {
        const canvas = document.getElementById('solarSystem');
        if (!canvas) {
            throw new Error('Canvas element not found. Please ensure the HTML contains an element with id="solarSystem".');
        }
        
        solarSystem = new SolarSystem(canvas);
        
        // Setup controls
        setupControls();
        
        // Window resize
        window.addEventListener('resize', () => {
            try {
                solarSystem.resize();
            } catch (error) {
                console.error('Error resizing canvas:', error);
            }
        });
        
        // Start animation
        animate();
    } catch (error) {
        console.error('Failed to initialize solar system:', error);
        
        // Display error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f44336; color: white; padding: 20px; border-radius: 8px; font-family: Arial, sans-serif; max-width: 500px; text-align: center; z-index: 9999;';
        errorDiv.innerHTML = `
            <h2>Initialization Error</h2>
            <p>${error.message}</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Please check the browser console for more details.</p>
        `;
        document.body.appendChild(errorDiv);
    }
}

function setupControls() {
    try {
        // Time speed
        const timeSpeedSlider = document.getElementById('timeSpeed');
        const timeSpeedValue = document.getElementById('timeSpeedValue');
        if (timeSpeedSlider && timeSpeedValue) {
            timeSpeedSlider.addEventListener('input', (e) => {
                try {
                    const sliderValue = parseFloat(e.target.value);
                    if (isNaN(sliderValue) || !isFinite(sliderValue)) {
                        console.warn('Invalid time speed value:', e.target.value);
                        return;
                    }
                    const actualSpeed = sliderValue * UI_SCALE.timeSpeedMultiplier;
                    if (actualSpeed < 0 || actualSpeed > 100) {
                        console.warn('Time speed out of range:', actualSpeed);
                        return;
                    }
                    solarSystem.timeSpeed = actualSpeed;
                    timeSpeedValue.textContent = `${sliderValue.toFixed(1)}x`;
                } catch (error) {
                    console.error('Error updating time speed:', error);
                }
            });
        }
        
        // Zoom
        const zoomSlider = document.getElementById('zoom');
        const zoomValue = document.getElementById('zoomValue');
        if (zoomSlider && zoomValue) {
            zoomSlider.addEventListener('input', (e) => {
                try {
                    const sliderValue = parseFloat(e.target.value);
                    if (isNaN(sliderValue) || !isFinite(sliderValue)) {
                        console.warn('Invalid zoom value:', e.target.value);
                        return;
                    }
                    const actualZoom = sliderValue * UI_SCALE.zoomMultiplier;
                    if (actualZoom < 0 || actualZoom > 1000) {
                        console.warn('Zoom out of range:', actualZoom);
                        return;
                    }
                    solarSystem.zoom = actualZoom;
                    zoomValue.textContent = `${sliderValue.toFixed(1)}x`;
                } catch (error) {
                    console.error('Error updating zoom:', error);
                }
            });
        }
        
        // Pause/Play
        const pausePlayBtn = document.getElementById('pausePlay');
        if (pausePlayBtn) {
            pausePlayBtn.addEventListener('click', () => {
                try {
                    solarSystem.isPaused = !solarSystem.isPaused;
                    pausePlayBtn.textContent = solarSystem.isPaused ? 'Play' : 'Pause';
                } catch (error) {
                    console.error('Error toggling pause:', error);
                }
            });
        }
        
        // Reset
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                try {
                    solarSystem.currentTime = DEFAULT_CONFIG.startAtCurrentDate ? 
                        (new Date() - DEFAULT_CONFIG.epoch) / (1000 * 60 * 60 * 24) : 0;
                    solarSystem.initializePlanets();
                } catch (error) {
                    console.error('Error resetting simulation:', error);
                }
            });
        }
        
        // Show orbits
        const showOrbitsCheck = document.getElementById('showOrbits');
        if (showOrbitsCheck) {
            showOrbitsCheck.addEventListener('change', (e) => {
                solarSystem.showOrbits = e.target.checked;
            });
        }
        
        // Show labels
        const showLabelsCheck = document.getElementById('showLabels');
        if (showLabelsCheck) {
            showLabelsCheck.addEventListener('change', (e) => {
                solarSystem.showLabels = e.target.checked;
            });
        }
        
        // Show velocity vectors
        const showVelocityCheck = document.getElementById('showVelocityVectors');
        if (showVelocityCheck) {
            showVelocityCheck.addEventListener('change', (e) => {
                solarSystem.showVelocityVectors = e.target.checked;
            });
        }
        
        // Show trails
        const showTrailsCheck = document.getElementById('showTrails');
        if (showTrailsCheck) {
            showTrailsCheck.addEventListener('change', (e) => {
                solarSystem.showTrails = e.target.checked;
            });
        }
        
        // Show perihelion/aphelion
        const showPeriApoCheck = document.getElementById('showPeriApo');
        if (showPeriApoCheck) {
            showPeriApoCheck.addEventListener('change', (e) => {
                solarSystem.showPeriApo = e.target.checked;
            });
        }
        
        // Toggle UI
        const toggleUIBtn = document.getElementById('toggleUI');
        const container = document.querySelector('.container');
        
        if (toggleUIBtn && container) {
            const toggleUI = () => {
                try {
                    container.classList.toggle('ui-hidden');
                    toggleUIBtn.textContent = container.classList.contains('ui-hidden') ? '☰' : '☰';
                } catch (error) {
                    console.error('Error toggling UI:', error);
                }
            };
            
            toggleUIBtn.addEventListener('click', toggleUI);
            
            // Keyboard shortcut: F key to toggle UI
            document.addEventListener('keydown', (e) => {
                if (e.key === 'f' || e.key === 'F') {
                    toggleUI();
                }
            });
        }
    } catch (error) {
        console.error('Error setting up controls:', error);
        throw error; // Re-throw since this is critical for app functionality
    }
}

function animate() {
    try {
        // Update at ~60 FPS
        const deltaTime = 1; // 1 Earth day per frame (scaled by timeSpeed)
        
        if (solarSystem) {
            solarSystem.update(deltaTime);
            solarSystem.draw();
        }
        
        animationId = requestAnimationFrame(animate);
    } catch (error) {
        console.error('Animation error:', error);
        // Try to continue animation despite error
        animationId = requestAnimationFrame(animate);
    }
}

// Start when page loads
window.addEventListener('load', init);
