#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec3 normal;

uniform mat4 mv;
uniform mat4 projection;

out vec3 vnormal;

void main() {
    gl_Position = projection * mv * position;
    vnormal = mat3(mv) * normal;
}