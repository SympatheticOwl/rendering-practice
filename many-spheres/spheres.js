var COUNT = 50;
var GRAVITY = -9.81;
var ELASTICITY = 0.9;
var DRAG = 0.01;
var INTERVAL = 15000;
var BOUNDS = 1.5;
var SPHERES = [];
var RESET_TIME = 0;

function calculateRadius(n) {
    return (Math.random() + 0.25) * (0.75 / Math.pow(n, 1 / 3));
    // return (0.5 / Math.pow(n, 2));
}

function sphereCollision(s1, s2) {
    let dx = s2.position[0] - s1.position[0];
    let dy = s2.position[1] - s1.position[1];
    let dz = s2.position[2] - s1.position[2];
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < s1.radius + s2.radius) {
        let nx = dx / distance;
        let ny = dy / distance;
        let nz = dz / distance;

        let rvx = s2.velocity[0] - s1.velocity[0];
        let rvy = s2.velocity[1] - s1.velocity[1];
        let rvz = s2.velocity[2] - s1.velocity[2];

        let normalVelocity = rvx * nx + rvy * ny + rvz * nz;

        if (normalVelocity < 0) {
            let reducedMass = (s1.mass * s2.mass) / (s1.mass + s2.mass);
            let impulse = -(1 + ELASTICITY) * normalVelocity * reducedMass;

            let s1Impulse = impulse / s1.mass;
            let s2Impulse = impulse / s2.mass;

            s1.velocity[0] -= s1Impulse * nx;
            s1.velocity[1] -= s1Impulse * ny;
            s1.velocity[2] -= s1Impulse * nz;

            s2.velocity[0] += s2Impulse * nx;
            s2.velocity[1] += s2Impulse * ny;
            s2.velocity[2] += s2Impulse * nz;

            let correction = (s1.radius + s2.radius - distance) / 2;
            let s1Correction = correction * (s2.mass / (s1.mass + s2.mass));
            let s2Correction = correction * (s1.mass / (s1.mass + s2.mass));

            s1.position[0] -= nx * s1Correction;
            s1.position[1] -= ny * s1Correction;
            s1.position[2] -= nz * s1Correction;

            s2.position[0] += nx * s2Correction;
            s2.position[1] += ny * s2Correction;
            s2.position[2] += nz * s2Correction;
        }
    }
}

function resetSpheres() {
    COUNT = Number(document.querySelector('#spheres').value) || 50
    SPHERES = [];
    for (let i = 0; i < COUNT; i++) {
        let radius = calculateRadius(COUNT);
        let mass = Math.pow(radius, 3);

        let pos = [
            Math.random() * (BOUNDS - radius),
            Math.random() * (BOUNDS - radius),
            Math.random() * (BOUNDS - radius)
        ];

        let vel = [
            Math.random() - 1,
            Math.random() - 1,
            Math.random() - 1
        ];

        SPHERES.push(
            {
                position: pos,
                velocity: vel,
                radius: radius,
                mass: mass,
                r: Math.random(),
                g: Math.random(),
                b: Math.random(),
                a: 1,
            }
        );
    }
}

function handleWallCollisions(sphere) {
    for (let i = 0; i < 3; i++) {
        if (Math.abs(sphere.position[i]) + sphere.radius > BOUNDS) {
            sphere.position[i] = Math.sign(sphere.position[i]) * (BOUNDS - sphere.radius);
            sphere.velocity[i] = -sphere.velocity[i] * ELASTICITY;
        }
    }
}

function update(sphere, dt) {
    sphere.velocity[1] += GRAVITY * dt;

    for (let i = 0; i < 3; i++) {
        sphere.velocity[i] *= (1 - DRAG * dt);
    }

    for (let i = 0; i < 3; i++) {
        sphere.position[i] += sphere.velocity[i] * dt;
    }

    handleWallCollisions(sphere);
}

function updatePhysics(dt) {
    SPHERES.forEach(sphere => update(sphere, dt));

    for (let i = 0; i < SPHERES.length; i++) {
        for (let j = i + 1; j < SPHERES.length; j++) {
            sphereCollision(SPHERES[i], SPHERES[j]);
        }
    }
}