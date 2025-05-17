#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec3 normal;

uniform mat4 m;
uniform mat4 v;
uniform mat4 projection;

out vec3 vnormal;
out vec3 worldPos;

void main() {
    vec4 worldPosition = m * position;
    worldPos = worldPosition.xyz;
    gl_Position = projection * v * worldPosition;
    vnormal = mat3(m) * normal;
}