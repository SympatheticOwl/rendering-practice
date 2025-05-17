#version 300 es
precision highp float;

uniform float seconds;

in vec4 pos;
out vec4 fragColor;

void main() {
    float sec_sin = sin(seconds);
    float sec_cos = cos(seconds);
    float sec_tan = tan(seconds);

    float r = tan(sin(3.0 * (pos.x * pos.x)) * sec_sin + sin(2.0 * (pos.y * pos.y)) + seconds);
    float g = sin(sin(3.0 * (pos.x * pos.x)) * sec_sin + sin(1.5 * (pos.y * pos.y + pos.x)) * sec_sin);
    float b = cos(sin(3.0 * (pos.x * pos.x)) * seconds + sin(2.0 * (pos.y * pos.y)) * seconds);

    fragColor = vec4(r, g, b, 1);
}

