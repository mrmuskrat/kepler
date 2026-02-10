# Solar System Model

An interactive web-based solar system visualization implementing orbital mechanics equations from the **OpenStax Astronomy 2e** textbook.

## Features

- **Real Astronomical Data**: All 8 planets with accurate orbital parameters
- **Current Date Positions**: Simulation starts with planets at their approximate current positions for today's date
- **Kepler's Laws**: Full implementation of Kepler's equations of motion
- **Interactive Controls**: 
  - Adjustable time speed (speed up or slow down orbits)
  - Zoom in/out (keyboard and pinch-to-zoom on mobile)
  - Click/tap planets for detailed information
  - Toggle orbits, labels, and velocity vectors
- **Mobile-Optimized**: 
  - Touch controls with pinch-to-zoom
  - Responsive layout for all screen sizes
  - Portrait and landscape orientation support
  - Larger touch targets for easy interaction
- **Real-time Calculations**:
  - Distance from Sun
  - Orbital velocity
  - Orbital period
  - Eccentricity
  - Current date display

## Physics & Equations

### 1. Kepler's Third Law
**T² = (4π²/GM) × a³**

The square of a planet's orbital period is proportional to the cube of its semi-major axis.

- `T` = orbital period (seconds)
- `a` = semi-major axis (meters)
- `G` = gravitational constant (6.674×10⁻¹¹ m³/kg·s²)
- `M` = mass of the Sun (1.989×10³⁰ kg)

### 2. Kepler's Equation
**E - e·sin(E) = M**

Relates the eccentric anomaly (E) to the mean anomaly (M) for elliptical orbits.

- `E` = eccentric anomaly
- `e` = eccentricity (0 = circle, 0 < e < 1 = ellipse)
- `M` = mean anomaly = 2πt/T

This equation is solved using Newton-Raphson iteration:
```
E(n+1) = E(n) - [E(n) - e·sin(E(n)) - M] / [1 - e·cos(E(n))]
```

### 3. Orbital Position (Cartesian)
**x = a(cos E - e)**  
**y = a√(1-e²) sin E**

Converts eccentric anomaly to position in the orbital plane.

### 4. Vis-Viva Equation
**v² = GM(2/r - 1/a)**

Calculates orbital velocity at any point in the orbit.

- `v` = orbital velocity
- `r` = current distance from Sun
- `a` = semi-major axis

### 5. Newton's Law of Universal Gravitation
**F = GMm/r²**

The gravitational force between the Sun and a planet.

- `F` = gravitational force
- `M` = mass of Sun
- `m` = mass of planet
- `r` = distance between centers

## Astronomical Data

All planetary data is based on real astronomical measurements:

| Planet  | Semi-Major Axis (AU) | Eccentricity | Period (years) |
|---------|---------------------|--------------|----------------|
| Mercury | 0.387               | 0.206        | 0.241          |
| Venus   | 0.723               | 0.007        | 0.615          |
| Earth   | 1.000               | 0.017        | 1.000          |
| Mars    | 1.524               | 0.093        | 1.881          |
| Jupiter | 5.203               | 0.048        | 11.86          |
| Saturn  | 9.537               | 0.056        | 29.46          |
| Uranus  | 19.191              | 0.046        | 84.01          |
| Neptune | 30.069              | 0.010        | 164.79         |

**AU** = Astronomical Unit = 1.496×10¹¹ meters (Earth-Sun distance)

## How to Run

1. Open `index.html` in a modern web browser
2. No server or build process required!

Alternatively, use a local server:
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve
```

Then open http://localhost:8000
## Project Structure

- **index.html**: Main HTML structure and UI layout
- **style.css**: Styling and visual design
- **config.js**: All constants, planetary data, and default settings
- **script.js**: Orbital mechanics implementation and simulation logic
- **README.md**: This documentation file
## Controls

### Mouse Controls
- **Click a Planet**: View detailed orbital information
- **Toggle Button (☰)**: Show/hide UI for fullscreen view

### Sliders
- **Time Speed Slider**: Control how fast the simulation runs (0-10x displayed, scaled to 0-1x actual for precision)
- **Zoom Slider**: Zoom in/out (1-15x displayed, scaled to 5-75x actual for better visibility at all levels)

### Buttons & Checkboxes
- **Pause/Play**: Freeze or resume the simulation
- **Reset to Today**: Return all planets to current real-world date positions
- **Show Orbits**: Toggle orbital path visualization
- **Show Labels**: Toggle planet name labels
- **Show Velocity Vectors**: Display velocity direction for each planet
- **Show Orbital Trails**: Display recent orbital paths (shows elliptical motion)
- **Show Perihelion/Aphelion**: Mark closest (red) and farthest (blue) points

### Keyboard Shortcuts
- **Space**: Pause/Play simulation
- **↑/↓ or +/-**: Zoom in/out
- **←/→**: Decrease/Increase time speed
- **1-8**: Select planets (1=Mercury, 2=Venus, 3=Earth, 4=Mars, 5=Jupiter, 6=Saturn, 7=Uranus, 8=Neptune)
- **Esc**: Deselect planet
- **F**: Toggle UI (fullscreen mode)

### Mobile/Touch Controls
- **Tap on Planet**: Select planet to view detailed information
- **Pinch Gesture**: Zoom in/out with two fingers
- **Sliders**: Touch and drag to adjust speed and zoom
- **Touch-Friendly Buttons**: All buttons sized for easy tapping (minimum 44×44px)
- **Responsive Layout**: 
  - **Portrait Mode**: Control panel moves to bottom, occupies up to 40% of screen
  - **Landscape Mode**: Control panel stays on right side for easier viewing
  - **Very Small Screens (<480px)**: Optimized layout with collapsible controls
- **Swipe Indicator**: On small screens, swipe up/down to access controls
- **Auto-Hide Keyboard Shortcuts**: Desktop keyboard help hidden on mobile devices, replaced with touch controls guide

### Mobile Optimizations
- Larger touch targets (48×48px minimum) for all interactive elements
- Smooth scrolling for control panel on mobile (`-webkit-overflow-scrolling: touch`)
- Pinch-to-zoom disabled on page to prevent conflicts with canvas zoom
- Larger hit radius for planet selection on touch devices (20px vs 10px on desktop)
- Mobile device auto-detection (adjusts UI based on screen size and user agent)
- Landscape orientation support with adaptive layout
- Context menu disabled on canvas (prevents long-press interference)
- Fast tap recognition (<300ms) for responsive planet selection

## Implementation Details

### Solving Kepler's Equation

The most challenging part of orbital mechanics is solving Kepler's equation, which has no closed-form solution. This app uses the **Newton-Raphson method**:

1. Start with initial guess E₀ = M
2. Iterate: E(n+1) = E(n) - f(E)/f'(E)
3. Continue until |E(n+1) - E(n)| < tolerance
4. Typically converges in ~5 iterations

### Coordinate Systems

The simulation uses multiple coordinate systems:

1. **Astronomical Units (AU)**: For orbital calculations
2. **Screen Pixels**: For rendering (with y-axis flipped for counterclockwise motion)
3. **Time in Earth Days**: For animation

All conversions maintain physical accuracy while ensuring smooth visualization.

### Real-Time Date Synchronization

The simulation calculates planetary positions based on the current date:
- Uses J2000.0 (January 1, 2000, 12:00 UTC) as the reference epoch
- Calculates time elapsed since epoch in days
- Computes mean anomaly for each planet based on its orbital period
- Positions are approximate but realistic for educational purposes
- Date display shows actual calendar dates as simulation progresses
- Reset button returns to current real-world date and positions

Note: Positions are calculated using simplified two-body mechanics and don't account for perturbations from other planets, so they're close approximations rather than exact ephemeris data.

### Configuration

All astronomical data and constants are stored in [config.js](config.js) for easy customization:
- **Physical constants**: G, AU, SOLAR_MASS
- **Planetary data**: orbital parameters, colors, masses for all 8 planets
- **Simulation defaults**: initial speed, zoom, display options
- **UI scaling**: multipliers for slider values
- **Date settings**: `startAtCurrentDate` - set to `true` to start at current real-world date, or `false` to start at epoch with all planets at perihelion

To modify planet data or add new celestial bodies, edit `config.js` and reload the page.

### Kepler's Second Law

Planets automatically move faster when closer to the Sun (perihelion) and slower when farther away (aphelion). This is calculated using:
- Mean anomaly increases linearly with time
- Kepler's equation converts to eccentric anomaly
- Position and velocity are derived from eccentric anomaly
- Vis-viva equation ensures correct orbital speed at each point

### Visual Features

**Orbital Trails**: Shows the recent path traveled by each planet, making the elliptical motion and variable speed more visible.

**Perihelion/Aphelion Markers**: Red dots mark perihelion (closest point to Sun), blue dots mark aphelion (farthest point). These points demonstrate orbital eccentricity.

**Scale Indicator**: A dynamic 1 AU scale bar in the bottom-left shows real astronomical distances and updates with zoom level.

**Keyboard Controls**: Full keyboard support for zoom, pause/play, and planet selection improves accessibility and user experience.

## Robustness & Error Handling

The application includes comprehensive error handling to ensure stability and provide user feedback:

### Input Validation
- **Kepler Equation Solver**: Validates eccentricity bounds (0 ≤ e < 1) and checks for convergence
- **Orbital Calculations**: Validates all numerical inputs and results against NaN and Infinity
- **User Controls**: Range checks for zoom (1-15x) and speed (0-10x) values from sliders and keyboard
- **Date Calculations**: Validates epoch and current date before computing planet positions

### Graceful Degradation
- **Individual Planet Errors**: If one planet fails to initialize, others continue normally
- **Drawing Errors**: Canvas rendering errors are caught and logged without stopping animation
- **Calculation Fallbacks**: Invalid orbital calculations return safe default values
- **UI Resilience**: Missing DOM elements are checked before use; gracefully degrades if unavailable

### User Feedback
- **Error Notifications**: User-friendly error messages appear in the bottom-right corner
- **Console Logging**: Detailed error information logged to browser console for debugging
- **Auto-dismiss**: Error messages automatically disappear after 10 seconds or can be clicked to dismiss
- **Simulation Pause**: Critical errors pause the simulation to prevent cascading failures

### Error Recovery
- **Try-Catch Blocks**: Critical methods wrapped in error handlers
- **Null Checks**: All DOM element access validated before use
- **Numeric Validation**: All calculations check for valid finite numbers
- **Animation Continuity**: Animation loop continues even if individual frames encounter errors

## Educational Goals

This project demonstrates:

- ✅ Kepler's Laws of Planetary Motion
- ✅ Newton's Law of Universal Gravitation
- ✅ Elliptical orbits and eccentricity
- ✅ How velocity changes with distance (faster at perihelion, slower at aphelion)
- ✅ Relationship between orbital period and distance from Sun
- ✅ Real astronomical data and scales

## References

- **OpenStax Astronomy 2e**: https://openstax.org/books/astronomy-2e/
  - Chapter 3: Orbits and Gravity
  - Chapter 13: The Solar System
- **NASA Planetary Fact Sheets**: https://nssdc.gsfc.nasa.gov/planetary/factsheet/

## License

Educational project using OpenStax resources (CC BY 4.0 license)

## Future Enhancements

Potential additions:
- Dwarf planets (Pluto, Ceres, etc.)
- Asteroid belt
- Comet trajectories
- Planet rotation and axial tilt
- Moon systems
- Gravitational influences between planets
- Export orbital data
