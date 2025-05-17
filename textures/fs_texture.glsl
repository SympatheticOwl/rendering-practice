#version 300 es

precision highp float;

in vec3 vnormal;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform sampler2D tex;

in vec2 st;

out vec4 fragColor;

void main() {
    vec4 textureColor = texture(tex, st);
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0);
    fragColor = vec4(textureColor.rgb * (lightcolor * lambert), textureColor.a);
}