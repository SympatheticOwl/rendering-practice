#version 300 es

precision highp float;

in vec4 vcolor;
uniform vec3 lightdir;
uniform vec3 halfway;
uniform vec3 lightcolor;

out vec4 fragColor;

void main() {
    vec2 coord = 2.0 * gl_PointCoord - 1.0;

    float nxylength = length(coord);
    if (nxylength > 1.0) discard;

    float nz = sqrt(1.0 - nxylength * nxylength);
    vec3 normal = normalize(vec3(coord, nz));

    float diffuse = max(0.0, dot(normal, lightdir));
    float specular = pow(max(0.0, dot(normal, halfway)), 50.0);

    vec3 color = vcolor.rgb * (diffuse * lightcolor + 0.1) + specular * lightcolor;
    fragColor = vec4(color, vcolor.a);
}