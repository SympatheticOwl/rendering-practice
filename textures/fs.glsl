#version 300 es

precision highp float;

in vec3 vnormal;
in float vposition;

uniform vec4 color;
uniform vec3 lightdir;
uniform vec3 halfway;
uniform vec3 lightcolor;

out vec4 fragColor;

void main() {
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = pow(max(dot(n, halfway), 0.0), 150.0);
    fragColor = vec4(color.rgb *
        (lightcolor * lambert) +
        (lightcolor * blinn) * (3.0 * color.a),
        1.0
    );
}