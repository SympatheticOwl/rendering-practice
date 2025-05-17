#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec4 color;

uniform float seconds;
uniform mat4 a_matrix;

out vec4 vColor;

void main() {
    vColor = color;
    gl_Position = a_matrix * vec4(position.xy*0.5, position.zw);
}