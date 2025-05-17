#version 300 es
precision highp float;

in vec3 vnormal;

uniform mat4 mv;
uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;

void main() {
    vec3 n = normalize(vnormal);

    // determine slope based on global up
    vec3 up = mat3(mv) * vec3(0.0, 1.0, 0.0);
    float steepness = abs(dot(n, normalize(up)));

    vec3 steep = vec3(0.2, 0.6, 0.1);
    vec3 shallow = vec3(0.6, 0.3, 0.3);
    float cliffThreshold = 0.7;

    vec3 baseColor = (steepness > cliffThreshold) ? steep : shallow;

    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = pow(max(dot(n, halfway), 0.0), 150.0);
    fragColor = vec4(baseColor *
        (lightcolor * lambert) +
        (lightcolor * blinn) * 2.0,
        1.0
    );
}