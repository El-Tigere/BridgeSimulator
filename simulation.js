function startSimulation() {
    selectedVertex = null;
    
    document.querySelector('#settingsMode').disabled = true;
    // deselect mode
    let modeAddVerticesButton = document.querySelector('#modeAddVertices');
    modeAddVerticesButton.checked = true;
    modeAddVerticesButton.checked = false;
    
    document.querySelector('#settingsVertex').disabled = true;
    // deselect vertex type
    let typeLooseButton = document.querySelector('#typeLoose');
    typeLooseButton.checked = true;
    typeLooseButton.checked = false;
    
    verts.forEach((v) => v.initSimulation());
    edges.forEach((e) => e.initSimulation());
    if(!simulate) updateIntervalId = setInterval(() => {
        for(let i = 0; i < 10; i++) update(1 / 1000);
    }, 10 /* update delay */);
    simulate = true;
}

function stopSimulation() {
    simulate = false;
    document.querySelector('#settingsMode').disabled = false;
}

function update(deltaTime) {
    if(!simulate) {
        clearInterval(updateIntervalId);
        return;
    }
    
    edges.forEach((e) => e.calcForce());
    let frictionFactor = (1 - deltaTime) ** friction;
    verts.forEach((v) => v.simulationStep(deltaTime, frictionFactor));
}

class Vertex {
    constructor(x, y) {
        this.pos = [x, y];
        this.type = 'Loose';
    }
    
    initSimulation() {
        this.simPosition = [this.pos[0], this.pos[1]];
        this.momentum = [0, 0];
        this.force = [0, 0];
        this.mass = 0;
    }
    
    simulationStep(deltaTime, frictionFactor) {
        this.momentum = mulVS(this.momentum, frictionFactor); // friction
        this.force[1] += 1 * this.mass; // gravitation
        this.momentum = addV(this.momentum, mulVS(this.force, deltaTime));
        if(this.type == 'FixedX' || this.type == 'Fixed') this.momentum[0] = 0;
        if(this.type == 'FixedY' || this.type == 'Fixed') this.momentum[1] = 0;
        this.simPosition = addV(this.simPosition, mulVS(this.momentum, 100 / this.mass /* this "removes" all vertices without edges in the simulation */ * deltaTime));
        this.force = [0, 0];
    }
}

class Edge {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }
    
    initSimulation() {
        this.length = distanceV(this.a.pos, this.b.pos);
        this.force = [0, 0];
        let mass = this.length * 0.005 /* mass per length */;
        this.a.mass += mass * 0.5;
        this.b.mass += mass * 0.5;
        this.broken = false;
    }
    
    calcForce() {
        if(this.broken) {
            this.force = [0, 0];
            return;
        }
        
        let actualLength = Math.sqrt((this.b.simPosition[0] - this.a.simPosition[0]) ** 2 + (this.b.simPosition[1] - this.a.simPosition[1]) ** 2);
        let deviance = actualLength - this.length;
        this.force[0] = (this.b.simPosition[0] - this.a.simPosition[0]) / actualLength * deviance * 50 /* force multiplier */;
        this.force[1] = (this.b.simPosition[1] - this.a.simPosition[1]) / actualLength * deviance * 50 /* force multiplier */;
        
        if(magnitudeV(this.force) > 10 /* max force */) {
            this.broken = true;
        }
        
        // add force to vertices
        this.a.force[0] += this.force[0] * 0.5;
        this.a.force[1] += this.force[1] * 0.5;
        this.b.force[0] += -this.force[0] * 0.5;
        this.b.force[1] += -this.force[1] * 0.5;
    }
}

// TODO: change to 3d vectors (and 3d in general)

function addV(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function subV(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

function mulVS(a, b) {
    return [a[0] * b, a[1] * b];
}

function magnitudeV(a) {
    return Math.sqrt(a[0] ** 2 + a[1] ** 2);
}

function distanceV(a, b) {
    return magnitudeV(subV(b, a));
}