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

    let m = m4mul(m4rotX(5), m4rotZ(seconds / 4))
    let v = m4view([0, 1, 4], [0, 0, 0], [0, 1, 0])

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

    let m = m4mul(m4rotX(5), m4rotZ(seconds / 4))
    let v = m4view([0, 1, 4], [0, 0, 0], [0, 1, 0])

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

function addNormals(geom) {
    let ni = 2;
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

async function loadObject(filePath) {
    return await fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Fetch failed')
            }
            return response.text()
        })
        .then(data => {
            let obj = parseOBJ(data);
            // attributes[0] = positions
            // attributes[1] = texCoords
            // attributes[2] = normals
            // attributes[3] = colors
            let geom =
                {
                    "triangles": [],
                    "attributes": [[], [], [], []]
                };

            for (let i = 0; i < obj.indices.length; i += 3) {
                geom.triangles.push([obj.indices[i], obj.indices[i+1], obj.indices[i+2]]);
            }

            for (let i = 0; i < obj.positions.length; i += 3) {
                geom.attributes[0].push([obj.positions[i], obj.positions[i + 1], obj.positions[i + 2]])
            }

            if (obj.texCoords.length === 0 ) {
                geom.attributes[0].map(point => normalize(div(point, mag(point))))
                    .map(normal => {
                        const [x, y, z] = normal;
                        const s = 0.5 + (Math.atan2(z, x) / (2 * Math.PI));
                        const t = 0.5 + (Math.asin(y) / Math.PI);
                        geom.attributes[1].push([s, t])
                    })
                for (let i = 0; i < obj.positions.length; i += 3) {
                }
            } else {
                for (let i = 0; i < obj.texCoords.length; i += 2) {
                    geom.attributes[1].push([obj.texCoords[i], obj.texCoords[i+1]])
                }
            }

            if (obj.normals.length === 0) {
                addNormals(geom)
            } else {
                for (let i = 0; i < obj.normals.length; i += 3) {
                    geom.attributes[2].push([obj.normals[i], obj.normals[i+1], obj.normals[i+2]])
                }
            }

            if (obj.colors.length === 0) {
                for (let i = 0; i < obj.positions.length; i += 3) {
                    geom.attributes[3].push([0.8, 0.8, 0.8])
                }
            } else {
                for (let i = 0; i < obj.colors.length; i += 3) {
                    geom.attributes[3].push([obj.colors[i], obj.colors[i+1], obj.colors[i+2]])
                }
            }

            return geom;
        })
        .catch(error => {
            console.error('Error fetching OBJ file', error)
            throw Error("Error fetching OBJ file")
        });
}

async function generate() {
    const objectFile = String(document.querySelector('#filepath').value)
    const geom = await loadObject(objectFile)
    const textureFile = String(document.querySelector('#imagepath').value)
    await loadMaterial(textureFile, geom)

    window.geom = setupGeometry(geom)
    fillScreen()
    window.addEventListener('resize', fillScreen)

    if (window.animation) {
        cancelAnimationFrame(window.animation)
    }

    requestAnimationFrame(tick)
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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

async function loadMaterial(texturePath, geom) {
    if (texturePath && texturePath.length > 0) {
        window.currentMaterial = await loadTexture(texturePath)
            .catch(e => {
                console.error(e);
                return {
                    type: 'color',
                    data: [0.8, 0.8, 0.8, 1]
                }
            })

    } else if (geom.attributes[3].length > 0) {
        window.currentMaterial = {
            type: 'color',
            data: geom.attributes[3]
        };
    } else {
        window.currentMaterial = {
            type: 'color',
            data: [0.8, 0.8, 0.8, 1]
        };
    }
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
});