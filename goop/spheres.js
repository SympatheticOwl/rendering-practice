// Global simulation parameters
var COUNT =  200;
var SPHERES = [];

// SPH parameters that need to be recalculated when count changes
function updateParameters() {
    const h = 3 / (2 * Math.sqrt(COUNT));  // Support radius
    const radius = h / 3;                  // Visual particle radius
    const mass = Math.pow(h, 2) / 9;       // Particle mass in 2D
    const dt = h / 20;                     // Time step for stability

    return {
        h,                  // Support radius
        radius,            // Visual radius
        mass,             // Particle mass
        dt,               // Time step
        rho0: 0.3,        // Target density (lowered to prevent over-pressure)
        k: 0.08,          // Significantly reduced pressure coefficient
        mu: 0.1,          // Reduced viscosity
        g: 9.8,           // Gravity
        bounds: 1,        // Simulation bounds
        maxSpeed: h/dt,   // Maximum allowed particle speed
        maxForce: mass * 50  // Adjusted force limit
    };
}

// Kernel functions for SPH
const Kernels = {
    // Poly6 kernel for density calculation
    poly6: (r, h) => {
        const h2 = h * h;
        if (r >= h) return 0;
        const diff = h2 - r * r;
        return (4 / (Math.PI * Math.pow(h, 8))) * diff * diff * diff;
    },

    // Gradient of Spiky kernel for pressure force
    gradSpiky: (r, h, dx, dy) => {
        if (r >= h || r < 1e-8) return [0, 0];
        const coeff = (-30 / (Math.PI * Math.pow(h, 5))) * Math.pow(h - r, 2) / r;
        return [coeff * dx, coeff * dy];
    },

    // Laplacian of viscosity kernel
    laplaceVisc: (r, h) => {
        if (r >= h) return 0;
        return (40 / (Math.PI * Math.pow(h, 5))) * (h - r);
    }
};

function computeDensityAndPressure(spheres, neighbors, params) {
    // Reset density and compute self-density
    spheres.forEach(sphere => {
        sphere.density = sphere.mass * Kernels.poly6(0, params.h);
    });

    // Add neighbor contributions to density
    neighbors.forEach((neighborList, i) => {
        neighborList.forEach(({j, r}) => {
            const density = spheres[j].mass * Kernels.poly6(r, params.h);
            spheres[i].density += density;
        });
    });

    // Compute pressure and update particle colors based on density
    spheres.forEach(sphere => {
        // Only generate pressure when density exceeds rest density
        sphere.pressure = Math.max(0, params.k * (sphere.density - params.rho0));

        // Update particle color based on density
        const densityFactor = sphere.density / params.rho0;
        sphere.r = Math.min(1.0, densityFactor);
        sphere.g = Math.min(1.0, 0.2 * densityFactor);
        sphere.b = Math.min(1.0, 2.0 * densityFactor);
        sphere.a = 1.0;
    });
}

function computeForces(spheres, neighbors, params) {
    // Reset forces and apply gravity
    spheres.forEach(sphere => {
        // Apply gravity as base force
        sphere.force = [0, -sphere.mass * params.g];
    });

    // Compute pressure and viscosity forces
    neighbors.forEach((neighborList, i) => {
        const sphere = spheres[i];

        neighborList.forEach(({j, r, dx, dy}) => {
            const neighbor = spheres[j];

            // Skip if particles are too close
            if (r < params.radius * 0.1) return;

            // Enforce minimum distance based on particle radius
            if (r < params.radius * 2) {
                const pushout = (params.radius * 2 - r) * 0.5;
                const nx = dx / r;
                const ny = dy / r;
                sphere.position[0] += nx * pushout;
                sphere.position[1] += ny * pushout;
                neighbor.position[0] -= nx * pushout;
                neighbor.position[1] -= ny * pushout;
            }

            // Pressure force following SPH formulation
            if (sphere.pressure > 0 || neighbor.pressure > 0) {
                const pressureForce = Kernels.gradSpiky(r, params.h, dx, dy);
                const pressureMagnitude = sphere.mass *
                    (sphere.pressure / (sphere.density * sphere.density) +
                        neighbor.pressure / (neighbor.density * neighbor.density));

                sphere.force[0] -= pressureMagnitude * pressureForce[0];
                sphere.force[1] -= pressureMagnitude * pressureForce[1];
            }

            // Viscosity force for damping
            const vx = neighbor.velocity[0] - sphere.velocity[0];
            const vy = neighbor.velocity[1] - sphere.velocity[1];

            const viscosity = params.mu * sphere.mass *
                Kernels.laplaceVisc(r, params.h) / neighbor.density;

            sphere.force[0] += viscosity * vx;
            sphere.force[1] += viscosity * vy;
        });
    });
}

function handleWallCollisions(sphere, params) {
    const RESTITUTION = 0.2;  // Increased damping for better settling
    const WALL_FRICTION = 0.95;  // Added friction with walls

    for (let i = 0; i < 2; i++) {
        if (Math.abs(sphere.position[i]) + sphere.radius > params.bounds) {
            // Position correction
            sphere.position[i] = Math.sign(sphere.position[i]) *
                (params.bounds - sphere.radius);

            // Velocity response with damping
            sphere.velocity[i] *= -RESTITUTION;

            // Apply friction to the tangential component
            if (i === 1) {  // For vertical walls
                sphere.velocity[0] *= WALL_FRICTION;
            } else {        // For floor/ceiling
                sphere.velocity[1] *= WALL_FRICTION;
            }
        }
    }
}

function updatePhysics(dt) {
    const params = updateParameters();
    const neighbors = findNeighbors(SPHERES, params);

    computeDensityAndPressure(SPHERES, neighbors, params);
    computeForces(SPHERES, neighbors, params);

    // Update positions and velocities
    SPHERES.forEach(sphere => {
        // Force clamping
        const forceMagnitude = Math.sqrt(
            sphere.force[0] * sphere.force[0] +
            sphere.force[1] * sphere.force[1]
        );

        if (forceMagnitude > params.maxForce) {
            const scale = params.maxForce / forceMagnitude;
            sphere.force[0] *= scale;
            sphere.force[1] *= scale;
        }

        // Semi-implicit Euler with sub-stepping
        const subSteps = 4;
        const subDt = dt / subSteps;

        for (let step = 0; step < subSteps; step++) {
            // Velocity update
            sphere.velocity[0] += (sphere.force[0] / sphere.mass) * subDt;
            sphere.velocity[1] += (sphere.force[1] / sphere.mass) * subDt;

            // Speed limiting
            const speedMagnitude = Math.sqrt(
                sphere.velocity[0] * sphere.velocity[0] +
                sphere.velocity[1] * sphere.velocity[1]
            );

            if (speedMagnitude > params.maxSpeed) {
                const scale = params.maxSpeed / speedMagnitude;
                sphere.velocity[0] *= scale;
                sphere.velocity[1] *= scale;
            }

            // Position update
            sphere.position[0] += sphere.velocity[0] * subDt;
            sphere.position[1] += sphere.velocity[1] * subDt;

            handleWallCollisions(sphere, params);
        }
    });
}


function resetSpheres() {
    COUNT = Number(document.querySelector('#spheres').value) || 200;
    const params = updateParameters();
    SPHERES = [];

    // Initialize particles in a well-spaced near-grid on the left side
    let pos = [params.radius - 1, params.radius - 1];
    const gap = params.radius * 2;

    for (let i = 0; i < COUNT; i++) {
        SPHERES.push({
            position: [0, 0],
            velocity: [0, 0],
            density: 0,
            pressure: 0,
            force: [0, 0],
            mass: params.mass,
            radius: params.radius,
            r: 0, g: 0, b: 0, a: 1  // Color will be updated based on density
        });

        // Position with slight randomness to avoid perfect alignment
        SPHERES[i].position = [
            pos[0] + Math.random() * gap/10,
            pos[1] + Math.random() * gap/10
        ];

        pos[1] += gap;
        if (pos[1] > 1 - params.radius) {
            pos[1] = params.radius - 1;
            pos[0] += gap;
        }
    }
}

// Grid-based spatial hashing for neighbor finding
function createGrid(spheres, cellSize) {
    const grid = new Map();

    spheres.forEach((sphere, i) => {
        const cellX = Math.floor(sphere.position[0] / cellSize);
        const cellY = Math.floor(sphere.position[1] / cellSize);
        const key = `${cellX},${cellY}`;

        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
    });

    return grid;
}

function findNeighbors(spheres, params) {
    const cellSize = params.h * 2;  // Grid cell size based on support radius
    const grid = createGrid(spheres, cellSize);
    const neighbors = new Map();

    spheres.forEach((sphere, i) => {
        const cellX = Math.floor(sphere.position[0] / cellSize);
        const cellY = Math.floor(sphere.position[1] / cellSize);

        neighbors.set(i, []);

        // Check neighboring cells
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                const key = `${cellX + x},${cellY + y}`;
                if (!grid.has(key)) continue;

                for (const j of grid.get(key)) {
                    if (i === j) continue;

                    const dx = sphere.position[0] - spheres[j].position[0];
                    const dy = sphere.position[1] - spheres[j].position[1];
                    const r = Math.sqrt(dx * dx + dy * dy);

                    if (r < params.h) {
                        neighbors.get(i).push({j, r, dx, dy});
                    }
                }
            }
        }
    });

    return neighbors;
}