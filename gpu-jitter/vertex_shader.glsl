#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec4 color;

uniform float seconds;

out vec4 vColor;

// https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float psuedo_rand(vec2 v) {
    return (fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453 + seconds/2.0) - 0.5) * 0.1;
}

void main() {
    vColor = color;
    float jitterX = psuedo_rand(position.xy);
    float jitterY = psuedo_rand(position.xy);

    gl_Position = gl_VertexID%3 == 0 ?
        vec4(
            position.x + jitterX,
            position.y + jitterY,
            position.z,
            position.w
        ) :
        gl_VertexID%3 == 1 ?
            vec4(
                position.x + jitterX,
                position.y - jitterY,
                position.z,
                position.w
            ) :
            vec4(
                position.x - jitterX,
                position.y - jitterY,
                position.z,
                position.w
            );
}