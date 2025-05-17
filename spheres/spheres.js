var COUNT = 50;
var SCALE = 0.15;
var GRAVITY = -9.81;
var ELASTICITY = 0.9;
var DRAG = 0.01;
var INTERVAL = 15000;
var BOUNDS = 1.5;
var SPHERES = [];
var RESET_TIME = 0;

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
            let impulse = -(1 + ELASTICITY) * normalVelocity / 2; // Divide by 2 because equal masses

            s1.velocity[0] -= impulse * nx;
            s1.velocity[1] -= impulse * ny;
            s1.velocity[2] -= impulse * nz;

            s2.velocity[0] += impulse * nx;
            s2.velocity[1] += impulse * ny;
            s2.velocity[2] += impulse * nz;

            let correction = (s1.radius + s2.radius - distance) / 2;
            s1.position[0] -= nx * correction;
            s1.position[1] -= ny * correction;
            s1.position[2] -= nz * correction;

            s2.position[0] += nx * correction;
            s2.position[1] += ny * correction;
            s2.position[2] += nz * correction;
        }
    }
}

function resetSpheres() {
    SPHERES = [];
    for (let i = 0; i < COUNT; i++) {
        let pos = [
            Math.random() * (BOUNDS - SCALE),
            Math.random() * (BOUNDS - SCALE),
            Math.random() * (BOUNDS - SCALE)
        ];

        let vel = [
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1)
        ];

        SPHERES.push(
            {
                position: pos,
                velocity: vel,
                radius: SCALE,
                r: Math.random(),
                g: Math.random(),
                b: Math.random(),
                a: Math.random(),
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