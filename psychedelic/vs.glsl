#version 300 es

in vec4 position;

uniform float seconds;
out vec4 pos;

void main() {
    gl_Position = gl_VertexID == 0 || gl_VertexID == 3 ?
        vec4(1,1,0,1) :
        gl_VertexID == 1 || gl_VertexID == 4 ?
            vec4(-1,-1, 0, 1) :
            gl_VertexID == 2 ?
                vec4(-1, 1, 0, 1) : vec4(1,-1,0,1);
    pos = gl_Position;
//    if (gl_VertexID == 0 /*|| gl_VertexID == 3*/) {
//        gl_Position = vec4(1,1,0,1);
//        pos = gl_Position;
//    } else if (gl_VertexID == 1 /*|| gl_VertexID == 4*/) {
//        gl_Position = vec4(-1,-1, 0, 1);
//        pos = gl_Position;
//    } else if (gl_VertexID == 2/* || gl_VertexID == 5*/) {
//        gl_Position = gl_VertexID == 2 ? vec4(-1, 1, 0, 1) : vec4(1,-1,0,1);
//        pos = gl_Position;
//    }
}