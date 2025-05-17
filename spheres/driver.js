const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])

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

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 *
 * @param data a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc the layout location of the vertex shader's `in` attribute
 * @param mode (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 *
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)

    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)

    return buf;
}

function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for (let i = 0; i < geom.attributes.length; i++) {
        let data = geom.attributes[i];
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

function draw(seconds) {
    gl.clearColor(...IlliniBlue);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindVertexArray(geom.vao)

    let lightdir = normalize([1, 1, 1]);
    let halfway = normalize(add(lightdir, [0, 0, 1]));

    gl.uniform3fv(program.uniforms.lightdir, lightdir);
    gl.uniform3fv(program.uniforms.halfway, halfway);
    gl.uniform3fv(program.uniforms.lightcolor, [1, 1, 1]);

    let v = m4view([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    gl.uniformMatrix4fv(program.uniforms.p, false, p);

    SPHERES.forEach(sphere => {
        let m = m4mul(
            m4trans(...sphere.position),
            m4scale(sphere.radius, sphere.radius, sphere.radius)
        );

        gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m));
        gl.uniform4fv(program.uniforms.color, [sphere.r, sphere.g, sphere.b, 1]);

        gl.bindVertexArray(geom.vao);
        gl.drawElements(geom.mode, geom.count, geom.type, 0);
    });
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    if (RESET_TIME === 0 || milliseconds - RESET_TIME > INTERVAL) {
        resetSpheres();
        RESET_TIME = milliseconds
    }

    let seconds = milliseconds / 1000;
    const dt = 1/60;
    updatePhysics(dt);
    draw(seconds)
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

async function loadObject() {
    return await fetch("./sphere.json")
        .then(response => {
            if (!response.ok) {
                throw new Error('Fetch failed')
            }
            return response.text()
        })
        .then(data => {
            let g = JSON.parse(data);

            // attributes[0] = positions
            // attributes[1] = normals
            let geom =
                {
                    "triangles": [],
                    "attributes": [[], []]
                };
            geom.triangles = g.triangles;
            geom.attributes[0] = g.attributes[0];
            geom.attributes[1] = g.attributes[1];
            return geom;
        })
        .catch(error => {
            console.error('Error fetching spheres json', error)
            throw Error("Error fetching spheres json")
        });
}

async function generate() {
    const geom = await loadObject()

    resetSpheres();

    window.geom = setupGeometry(geom)
    fillScreen()
    window.addEventListener('resize', fillScreen)

    if (window.animation) {
        cancelAnimationFrame(window.animation)
    }

    requestAnimationFrame(tick)
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

    await generate();
});