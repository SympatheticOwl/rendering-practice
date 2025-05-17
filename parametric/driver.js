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
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
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

function draw() {
    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    gl.bindVertexArray(geom.vao)

    let lightdir = normalize([1,1,1])
    let halfway = normalize(add(lightdir, [0,0,1]))

    gl.uniform3fv(program.uniforms.lightdir, lightdir)
    gl.uniform3fv(program.uniforms.halfway, halfway)
    gl.uniform3fv(program.uniforms.lightcolor, [1,1,1])

    gl.uniform4fv(program.uniforms.color, IlliniOrange);

    let v = m4view([0, 1, 10], [0, 0, 0], [0, 0, 1])
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    if (torus > 0) {
        window.m = m4mul(m4rotX(45), m4rotZ(seconds / 2))
    } else {
        window.m = m4rotY(seconds / 2)
    }

    draw()
    window.animation = requestAnimationFrame(tick);
}

function makeSphere(rings, slices) {
    let grid =
        {
            "triangles": [],
            "attributes": []
        }

    grid.attributes.push([])

    for (let i = 0; i <= rings; i++) {
        const ang1 = i * Math.PI / (rings-1)

        for (let j = 0; j <= slices; j++) {
            const ang2 = j * 2 * Math.PI / slices

            let x = Math.cos(ang2) * Math.sin(ang1)
            let y = Math.sin(ang2) * Math.sin(ang1)
            let z = Math.cos(ang1)

            grid.attributes[0].push([x, y, z])
        }
    }

    for (let i = 0; i < rings-1; i++) {
        for (let j = 0; j < slices; j++) {
            let v1 = i * (slices + 1) + j
            let v2 = v1 + slices + 1

            grid.triangles.push([v1, v2, v1 + 1])
            grid.triangles.push([v2, v2 + 1, v1 + 1])
        }
    }

    return grid
}

function makeTorus(rings, points) {
    let inner = 3;
    let outer = 1;
    let grid = {
        "triangles": [],
        "attributes": []
    }

    grid.attributes.push([])

    for (let i = 0; i <= points; i++) {
        const ang1 = i * 2 * Math.PI / points

        for (let j = 0; j <= rings; j++) {
            const ang2 = j * 2 * Math.PI / rings

            let x = (inner + outer * Math.cos(ang1)) * Math.cos(ang2)
            let y = outer * Math.sin(ang1)
            let z = (inner + outer * Math.cos(ang1)) * Math.sin(ang2)

            grid.attributes[0].push([x, y, z])
        }
    }

    // get the vertices to form the triangles
    for (let i = 0; i < points; i++) {
        for (let j = 0; j < rings; j++) {
            let vertex1 = i * (rings + 1) + j
            let vertex2 = vertex1 + rings + 1

            grid.triangles.push([vertex1, vertex2, vertex1 + 1])
            grid.triangles.push([vertex2, vertex2 + 1, vertex1 + 1])
        }
    }

    return grid
}

function addNormals(geom) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for (let i = 0; i < geom.attributes[0].length; i++) {
        geom.attributes[ni].push([0, 0, 0])
    }

    for (let i = 0; i < geom.triangles.length; i++) {
        let p0 = geom.attributes[0][geom.triangles[i][0]]
        let p1 = geom.attributes[0][geom.triangles[i][1]]
        let p2 = geom.attributes[0][geom.triangles[i][2]]
        let e1 = sub(p1, p0)
        let e2 = sub(p2, p0)
        let n = cross(e1, e2)
        geom.attributes[ni][geom.triangles[i][0]] = add(geom.attributes[ni][geom.triangles[i][0]], n)
        geom.attributes[ni][geom.triangles[i][1]] = add(geom.attributes[ni][geom.triangles[i][1]], n)
        geom.attributes[ni][geom.triangles[i][2]] = add(geom.attributes[ni][geom.triangles[i][2]], n)
    }
    for (let i = 0; i < geom.attributes[0].length; i++) {
        geom.attributes[ni][i] = normalize(geom.attributes[ni][i])
    }
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
        window.p = m4perspNegZ(0.1, 100, 1, canvas.width, canvas.height)
    }
}

function generate() {
    const r = Number(document.querySelector('#rings').value) || 3
    const s = Number(document.querySelector('#slices').value) || 3
    window.torus = Number(document.querySelector('#torus').checked) || 0
    let grid;
    if (torus > 0) {
        console.log("torus")
        grid = makeTorus(r, s);
    } else {
        console.log("sphere")
        grid = makeSphere(r, s);
    }
    addNormals(grid)
    window.geom = setupGeometry(grid)
    fillScreen()
    window.addEventListener('resize', fillScreen)
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

    document.querySelector('#submit').addEventListener('click', (event) => {
        if (window.animation) {
            cancelAnimationFrame(window.animation)
        }
        generate();
    });

});