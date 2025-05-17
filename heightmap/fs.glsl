#version 300 es
precision highp float;

in vec3 vnormal;
in float vposition;

uniform mat4 mv;
uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;

void main() {
    vec3 n = normalize(vnormal);

    float y = vposition + 0.5;

    vec4 multiColor = vec4(
        max(0.0, 1.0 - abs(y - 0.75) * 4.0),
        max(0.0, 1.0 - abs(y - 0.5) * 4.0),
        max(0.0, 1.0 - abs(y - 0.25) * 4.0),
        1.0
    );

    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = pow(max(dot(n, halfway), 0.0), 150.0);
    fragColor = vec4(multiColor.rgb *
        (lightcolor * lambert) +
        (lightcolor * blinn) * 2.0,
        multiColor.a
    );
}