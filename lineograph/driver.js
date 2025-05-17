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
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 *
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
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

function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    let buffers = [];
    let verts = [];
    for(let i = 0; i < geom.attributes.length; i++) {
        let data = geom.attributes[i]
        verts.push(data.flat())
        buffers.push(supplyDataBuffer(data, i));
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray,
        buf: buffers[0],
        verts: verts[0]
    }
}

var octahedron =
    {"triangles":
            [
                [0,1,2],
                [0,2,3],
                [0,3,4],
                [0,4,1],
                [5,1,4],
                [5,4,3],
                [5,3,2],
                [5,2,1]
            ]
        ,"attributes":
            [ // position
                [
                    [1,0,0],
                    [0,1,0],
                    [0,0,1],
                    [0,-1,0],
                    [0,0,-1],
                    [-1,0,0]
                ]
                , // color
                [
                    [1,0.5,0.5],
                    [0.5,1,0.5],
                    [0.5,0.5,1],
                    [0.5,0,0.5],
                    [0.5,0.5,0],
                    [0,0.5,0.5]
                ]
            ]
    }


function draw(seconds) {
    gl.clearColor(...IlliniBlue)
    gl.useProgram(program)

    gl.bindVertexArray(octa.vao)

    let allVerts = octa.verts;

    let movementSpeed = 0.05;
    if (keysBeingPressed['w']) {
        move(1, movementSpeed);
    }

    if (keysBeingPressed['s']) {

        move(1, movementSpeed*-1);
    }

    if (keysBeingPressed['a']) {
        move(0, movementSpeed*-1);
    }

    if (keysBeingPressed['d']) {
        move(0, movementSpeed);
    }

    if (keysBeingPressed['e']) {
        move(2, movementSpeed);
    }

    if (keysBeingPressed['q']) {
        move(2, movementSpeed*-1);
    }

    gl.uniform4fv(program.uniforms.color, IlliniOrange)
    let theSun = m4mul(m4scale(0.5, 0.5, 0.5))
    let v = m4view([0,0,6], [0,0,0], [0,1,0])
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,theSun))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)

    gl.bindBuffer(gl.ARRAY_BUFFER, octa.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVerts), gl.STATIC_DRAW);

    gl.drawElements(octa.mode, octa.count, octa.type, 0)
}

function move(direction, speed) {
    for (let i = 0; i < octa.verts.length; i += 3) {
        octa.verts[i+direction] += speed;
    }
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, preserveDrawingBuffer: true, depth:true}
    )
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    window.program = compileShader(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    window.octa = setupGeomery(octahedron)
    fillScreen()
    window.addEventListener('resize', fillScreen)
    requestAnimationFrame(tick)
})

window.keysBeingPressed = {}
window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)
