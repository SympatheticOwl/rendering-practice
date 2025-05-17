#version 300 es

precision highp float;

in vec3 vnormal;

uniform vec4 color;
uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;
uniform float fogDensity;
uniform bool fogEnabled;
uniform vec4 fogColor;

out vec4 fragColor;

void main() {
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = pow(max(dot(n, halfway), 0.0), 150.0);
    vec4 baseColor = vec4(color.rgb *
        (lightcolor * lambert) +
        (lightcolor * blinn) * 5.0,
        color.a
    );

    if (fogEnabled) {
        float distance = 1.0 / gl_FragCoord.w;
        float visibility = exp(-fogDensity * distance);
        visibility = clamp(visibility, 0.0, 1.0);
        fragColor = mix(fogColor, baseColor, visibility);
    } else {
        fragColor = baseColor;
    }
}