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

    console.log(geom.attributes.length)
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

function drawColor(seconds) {
    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program_color)

    gl.bindVertexArray(geom.vao)

    let lightdir = normalize([1, 1, 1])
    let halfway = normalize(add(lightdir, [0, 0, 1]))

    gl.uniform3fv(program_color.uniforms.lightdir, lightdir)
    gl.uniform3fv(program_color.uniforms.halfway, halfway)
    gl.uniform3fv(program_color.uniforms.lightcolor, [1, 1, 1])

    let m = m4rotY(seconds / 4)
    let v = m4view([0, 1, 3], [0, 0, 0], [0, 1, 0])

    gl.uniform4fv(program_color.uniforms.color, window.currentMaterial.data)
    gl.uniformMatrix4fv(program_color.uniforms.mv, false, m4mul(v, m))
    gl.uniformMatrix4fv(program_color.uniforms.p, false, p)

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

function drawTexture(seconds) {
    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program_texture)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, window.currentMaterial.data)
    gl.uniform1i(program_texture.uniforms.tex, 0)

    gl.bindVertexArray(geom.vao)

    gl.uniform3fv(program_texture.uniforms.lightdir, normalize([1, 1, 1]))
    gl.uniform3fv(program_texture.uniforms.lightcolor, [1, 1, 1])

    let m = m4rotY(seconds / 4)
    let v = m4view([0, 1, 3], [0, 0, 0], [0, 1, 0])

    gl.uniformMatrix4fv(program_texture.uniforms.mv, false, m4mul(v, m))
    gl.uniformMatrix4fv(program_texture.uniforms.p, false, p)

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;
    if (window.currentMaterial.type === 'texture') {
        drawTexture(seconds);
    } else {
        drawColor(seconds)
    }

    window.animation = requestAnimationFrame(tick);
}

function makeGrid(n) {
    var grid =
        {
            "triangles": [],
            "attributes": [[], []]
        };

    let logged = false;
    for (let col = 0; col < n; col++) {
        for (let row = 0; row < n; row++) {
            let x = row / (n - 1) * 2 - 1
            let z = col / (n - 1) * 2 - 1
            grid.attributes[0].push([x, 0, z])

            let s = row / (n - 1)
            let t = col / (n - 1)

            if (!logged) {
                console.log(x)
                console.log(z)
                console.log(row)
                console.log(col)
                console.log(n)
                console.log(s)
                console.log(t)
                logged = true;
            }


            grid.attributes[1].push([s, t])
        }
    }

    for (let i = 0; i < n * n - n; i++) {
        grid.triangles.push([i, i + n, i + 1])
        grid.triangles.push([i + n, i + n + 1, i + 1])

        if (i % n === n - 2) {
            i++;
        }
    }
    return grid
}

function makeFaults(grid, faults) {
    let delta = 0.8;
    let scale = 1;
    let xmin = 0;
    let xmax = 0;
    let ymin = 0;
    let ymax = 0;

    let positions = grid.attributes[0];

    for (let i = 0; i < faults; i++) {
        let p = ([Math.random() * 2 - 1, 0, Math.random() * 2 - 1])
        let ang = Math.random() * Math.PI * 2
        let norm = [Math.cos(ang), 0, Math.sin(ang)]

        for (let j = 0; j < positions.length; j++) {
            let b = positions[j]
            let dotProd = dot(sub(b, p), norm)

            if (dotProd < 0) {
                positions[j][1] -= delta
            } else {
                positions[j][1] += delta
            }

            if (positions[j][0] < xmin) {
                xmin = positions[j][0]
            }
            if (positions[j][0] > xmax) {
                xmax = positions[j][0]
            }
            if (positions[j][1] < ymin) {
                ymin = positions[j][1]
            }
            if (positions[j][1] > ymax) {
                ymax = positions[j][1]
            }
        }
        delta = delta * scale
    }

    let h = (xmax - xmin) * (1 / 2)

    if (h !== 0) {
        for (let i = 0; i < positions.length; i += 1) {
            positions[i][1] = ((positions[i][1] - ymin) / (ymax - ymin)) * h - (h / 2)
        }
    }

    console.log(grid.attributes.length)

    return grid;
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
        window.p = m4perspNegZ(0.1, 10, 1, canvas.width, canvas.height)
    }
}

async function loadTexture(url) {
    return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        const image = new Image();

        image.addEventListener('load', () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
            );

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

            resolve({
                type: 'texture',
                data: texture
            });
        });

        image.addEventListener('error', reject);
        image.src = url;
    });
}

async function loadMaterial(input) {
    if (/^#[0-9a-f]{8}$/i.test(input)) {
        let r = parseInt(input.substring(1, 3), 16) / 255;
        let g = parseInt(input.substring(3, 5), 16) / 255;
        let b = parseInt(input.substring(5, 7), 16) / 255;
        let a = parseInt(input.substring(7, 9), 16) / 255;

        window.currentMaterial = {
            type: 'color',
            data: [r, g, b, a]
        };
    } else if (/[.](jpg|png)$/.test(input)) {
        window.currentMaterial = await loadTexture(input)
            .catch(e => {
                console.error(e);
                return {
                    type: 'color',
                    data: [1, 0, 1, 0]
                }
            })
    } else {
        window.currentMaterial = {
            type: 'color',
            data: [1, 0, 1, 0]
        };
    }
}

async function generate() {
    const n = Number(document.querySelector('#gridsize').value) || 2
    const f = Number(document.querySelector('#faults').value) || 0
    const m = String(document.querySelector('#material').value) || "#FFFFFFFF"
    await loadMaterial(m);
    let grid = makeGrid(n);
    console.log(grid.attributes.length)
    makeFaults(grid, f);
    addNormals(grid)
    window.geom = setupGeometry(grid)
    fillScreen()
    window.addEventListener('resize', fillScreen)

    if (window.animation) {
        cancelAnimationFrame(window.animation)
    }

    window.animation = requestAnimationFrame(tick)
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, depth: true, preserveDrawingBuffer: true}
    )
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    const vs_tex = await fetch('vs_texture.glsl').then(res => res.text())
    const fs_tex = await fetch('fs_texture.glsl').then(res => res.text())
    window.program_color = compileShader(vs, fs)
    window.program_texture = compileShader(vs_tex, fs_tex)

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    document.querySelector('#submit').addEventListener('click', async (event) => {
        await generate();
    });

    await generate()
});