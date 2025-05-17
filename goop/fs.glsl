#version 300 es

precision highp float;

in vec4 vcolor;
out vec4 fragColor;

void main() {
    vec2 coord = 2.0 * gl_PointCoord - 1.0;

    float nxylength = length(coord);
    if (nxylength > 1.0) discard;

    fragColor = vcolor;
}