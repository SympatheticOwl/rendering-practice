function parseOBJ(text) {
    let tempVertices = [];
    let tempNormals = [];
    let tempTexCoords = [];

    let positions = [];
    let colors = [];
    let normals = [];
    let texCoords = [];
    let indices = [];

    let indexMap = new Map();
    let currentIndex = 0;

    const lines = text.split('\n');
    for (const line of lines) {
        const tokens = line.trim().split(/\s+/);
        if (tokens.length === 0) return;

        switch (tokens[0]) {
            case 'v':
                const position = tokens.slice(1, 4).map(Number);
                const color = tokens.length >= 7 ? tokens.slice(4, 7).map(Number) : [0.8, 0.8, 0.8];
                tempVertices.push({position, color});
                break;
            case 'vn':
                const normal = tokens.slice(1, 4).map(Number);
                tempNormals.push(normal);
                break;
            case 'vt':
                const texCoord = tokens.slice(1, 3).map(Number);
                tempTexCoords.push(texCoord);
                break;
            case 'f':
                const vertices = tokens.slice(1);

                for (let i = 1; i < vertices.length - 1; i++) {
                    const v = [vertices[0], vertices[i], vertices[i + 1]].map(item => {
                        if (indexMap.has(item)) {
                            return indexMap.get(item);
                        }

                        const [vIndex, vtIndex, vnIndex] =
                            item.split('/').map(x => x === '' ? undefined : parseInt(x));

                        const position = tempVertices[vIndex - 1].position;
                        const color = tempVertices[vIndex - 1].color;
                        const normal = vnIndex !== undefined ? tempNormals[vnIndex - 1] : undefined;
                        const texCoord = vtIndex !== undefined ? tempTexCoords[vtIndex - 1] : undefined;

                        positions.push(...position);

                        colors.push(...color)

                        if (normal !== undefined) {
                            normals.push(...normal);
                        }

                        if (texCoord !== undefined) {
                            texCoords.push(...texCoord);
                        }

                        indexMap.set(item, currentIndex);
                        return currentIndex++;
                    });
                    indices.push(...v);
                }
                break;
            default:
                break;
        }
    }

    const bounds = calculateBounds(positions);
    const scale = calculateScale(bounds);
    const center = calculateCenter(bounds);

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (positions[i] - center[0]) * scale;
        positions[i + 1] = (positions[i + 1] - center[1]) * scale;
        positions[i + 2] = (positions[i + 2] - center[2]) * scale;
    }

    for (let i = 0; i < normals.length; i += 3) {
        normals[i] = (normals[i] - center[0]) * scale;
        normals[i + 1] = (normals[i + 1] - center[1]) * scale;
        normals[i + 2] = (normals[i + 2] - center[2]) * scale;
    }

    return {
        positions: positions,
        colors: colors,
        normals: normals,
        texCoords: texCoords.length > 0 ? texCoords : [],
        indices: indices
    };

}

function calculateBounds(positions) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < positions.length; i += 3) {
        for (let j = 0; j < 3; j++) {
            min[j] = Math.min(min[j], positions[i + j]);
            max[j] = Math.max(max[j], positions[i + j]);
        }
    }

    return {min, max};
}

function calculateScale(bounds) {
    const size = [
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2]
    ];

    const maxSize = Math.max(...size);
    return maxSize > 0 ? 2.0 / maxSize : 1.0;
}

function calculateCenter(bounds) {
    return [
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2
    ];
}