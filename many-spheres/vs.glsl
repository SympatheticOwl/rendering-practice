#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in float radius;
layout(location=2) in vec4 color;

uniform mat4 mv;
uniform mat4 p;
uniform float viewport_size;

out vec4 vcolor;

void main() {
    gl_Position = p * mv * position;

    float proj_scale = p[1][1];
    float point_size = viewport_size * proj_scale * radius / gl_Position.w;
    gl_PointSize = point_size;

    vcolor = color;
}