const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])

var LAST_FRAME = 0;

function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }

    const uniforms = {}
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i += 1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

function setupGeometry() {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Create buffers for sphere properties
    const centerBuffer = gl.createBuffer();
    const radiusBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    // Set up attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, radiusBuffer);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    return {
        vao,
        centerBuffer,
        radiusBuffer,
        colorBuffer,
        count: SPHERES.length
    };
}

function updateBuffers() {
    // Update center positions
    const centers = new Float32Array(SPHERES.flatMap(s => s.position).flat());
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.centerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, centers, gl.DYNAMIC_DRAW);

    // Update radii (only needs to be done on reset)
    const radii = new Float32Array(SPHERES.map(s => s.radius));
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.radiusBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, radii, gl.STATIC_DRAW);

    // Update colors (only needs to be done on reset)
    const colors = new Float32Array(SPHERES.flatMap(s => [s.r, s.g, s.b, s.a]).flat());
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

function draw(seconds) {
    gl.clearColor(...IlliniBlue);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindVertexArray(geom.vao);

    // Update dynamic buffers
    updateBuffers();

    const canvas = gl.canvas;
    let projectionMatrix;
    let viewPort;
    if (canvas.width > canvas.height) {
        projectionMatrix = [
            canvas.height / canvas.width, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        viewPort = gl.canvas.height;
    } else {
        projectionMatrix = [
            1, 0, 0, 0,
            0, canvas.width / canvas.height, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        viewPort = gl.canvas.width;
    }

    gl.uniform1f(program.uniforms.viewport_size, viewPort);
    gl.uniformMatrix4fv(program.uniforms.p, false, projectionMatrix);

    // Draw all spheres in a single call
    gl.drawArrays(gl.POINTS, 0, geom.count);
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;
    let dt = seconds - LAST_FRAME;
    LAST_FRAME = seconds;

    const constant_dt = 1/60;
    updatePhysics(constant_dt);
    draw(seconds)

    const fps = 1/dt;
    document.querySelector('#fps').innerHTML = fps.toFixed(1)
    window.animation = requestAnimationFrame(tick);
}

function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0, 0, canvas.width, canvas.height)
        window.p = m4perspNegZ(0.1, 10, 1, canvas.width, canvas.height)
    }
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, depth: true, preserveDrawingBuffer: true}
    )
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    window.program = compileShader(vs, fs)

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    fillScreen();

    resetSpheres();
    window.geom = setupGeometry();
    tick(0);

    document.querySelector('#submit').addEventListener('click', (event) => {
        resetSpheres();
        window.geom = setupGeometry();
    });
});