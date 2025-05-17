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

    // loop through all uniforms in the shader source code
    // get their locations and store them in the GLSL program object for later use
    const uniforms = {}
    for(let i= 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

function setupGeomery() {
    var triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);

    let t = 20;
    let blueUpperLeftQuad = [
        [-8/t, 11/t],
        [ 0,   11/t],
        [-8/t, 10/t],
        [-7/t, 10/t],
        [ 0,   10/t],
        [-8/t, 6/t ],
        [-7/t, 6/t ],
        [-4/t, 6/t ],
        [-8/t, 5/t ],
        [-5/t, 5/t ],
        [-4/t, 5/t ],
        [-5/t, 0   ],
        [-4/t, 0   ],
    ];

    let orangeUpperLeftQuad = [
        [-7/t, 10/t],
        [ 0,   10/t],
        [-7/t, 6/t ],
        [-4/t, 6/t ],
        [ 0,   6/t ],
        [-4/t, 0   ],
        [ 0,   0   ]
    ];

    let blueIndices =
        [
            [0, 1,  4 ],
            [0, 2,  4 ],
            [2, 3,  6 ],
            [2, 5,  6 ],
            [5, 7,  10],
            [5, 8,  10],
            [9, 10, 12],
            [9, 11, 12]
        ];

    let orangeIndices =
        [
            [13, 14, 15],
            [14, 15, 17],
            [16, 17, 18],
            [17, 18, 19]
        ]


    // initialize colors for upper left quad
    let colors = [];
    for (let i = 0; i < blueUpperLeftQuad.length; i++) {
        colors.push([0.075, 0.16, 0.292, 1]);
    }
    for (let i = 0; i < orangeUpperLeftQuad.length; i++) {
        colors.push([1, 0.373, 0.02, 1]);
    }

    let allIndices = blueIndices.concat(orangeIndices);
    let indexBlockSize = allIndices.length;
    let upperLeft = blueUpperLeftQuad.concat(orangeUpperLeftQuad);

    let lowerLeft = [];
    interpolateQuad(0, indexBlockSize, allIndices, 1, -1, upperLeft, lowerLeft, colors, blueUpperLeftQuad.length, orangeUpperLeftQuad.length)
    let upperRight = [];
    interpolateQuad(indexBlockSize, indexBlockSize*2, allIndices, -1, 1, upperLeft, upperRight, colors, blueUpperLeftQuad.length, orangeUpperLeftQuad.length)
    let lowerRight = [];
    interpolateQuad(indexBlockSize*2, indexBlockSize*3, allIndices, -1, -1, upperLeft, lowerRight, colors, blueUpperLeftQuad.length, orangeUpperLeftQuad.length)

    let allVerts = upperLeft.flat()
        .concat(lowerLeft.flat())
        .concat(upperRight.flat())
        .concat(lowerRight.flat());

    let buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVerts), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    let color_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors.flat()), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    let indexBuffer = gl.createBuffer();

    let ind16Array = new Uint16Array(allIndices.flat());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind16Array, gl.DYNAMIC_DRAW);

    return {
        mode: gl.TRIANGLES,
        count: ind16Array.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray,
        buf: buf,
        verts: allVerts
    }
}

/**
 * I'm lazy and since the 'I' logo is symmetrical I can calculate one quadrant in device coordinates
 * and copy it to adjacent quads.
 * There is probably an easier way to buffer this data instead with an offset, but I'm pressed for time right now
 * @param start element indices start position
 * @param end element indices end position
 * @param xModifier used to modify quad x device coordinate to another quadrant symmetrically
 * @param yModifier used to modify quad y device coordinate to another quadrant symmetrically
 * @param indices element indices
 * @param quad quad to be mirrored
 * @param newQuad quad to be mirrored to
 * @param colors colors
 * @param blueColorCount blue count for triangles in the new quad
 * @param orangeColorCount orange count for triangles in the new quad
 */
function interpolateQuad(start, end, indices, xModifier, yModifier, quad, newQuad, colors, blueColorCount, orangeColorCount) {
    for (let i = 0; i < quad.length; i++) {
        let v = quad[i];
        newQuad.push([v[0]*xModifier, v[1]*yModifier])
    }
    for (let i = start; i < end; i++) {
        let triangle = indices[i]
        indices.push([
            triangle[0]+quad.length,
            triangle[1]+quad.length,
            triangle[2]+quad.length
        ])
    }

    for (let i = 0; i < blueColorCount; i++) {
        colors.push([0.075, 0.16, 0.292, 1]);
    }

    for (let i = 0; i < orangeColorCount; i++) {
        colors.push([1, 0.373, 0.02, 1]);
    }
}

function draw(milliseconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniform1f(program.uniforms.seconds, milliseconds/1000)

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindVertexArray(geom.vao)

    let allVerts = geom.verts;

    for (let i = 0; i < allVerts.length; i += 3) {
        allVerts[i] += parseFloat(randomFloat());
        allVerts[i + 1] += parseFloat(randomFloat());
        allVerts[i + 2] += parseFloat(randomFloat());
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, geom.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVerts), gl.STATIC_DRAW);

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

function tick(milliseconds) {
    draw(milliseconds)
    requestAnimationFrame(tick) // asks browser to call tick before next frame
}

function randomFloat() {
    return (Math.random() * 0.002 - 0.001).toFixed(4)
}

window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    let vs = await fetch('vertex_shader.glsl').then(res => res.text())
    let fs = await fetch('frag_shader.glsl').then(res => res.text())
    window.program = compileShader(vs,fs)
    window.geom = setupGeomery()
    requestAnimationFrame(tick) // asks browser to call tick before first frame
})

