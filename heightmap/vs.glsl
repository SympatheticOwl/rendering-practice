#version 300 es

layout(location = 0) in vec4 position;
layout(location = 1) in vec3 normal;

uniform mat4 mv;
uniform mat4 p;

out vec3 vnormal;
out float vposition;

void main() {
    vnormal = mat3(mv) * normal;
    gl_Position = p * mv * position;
    vposition = position.y;
}
