// TODO: import and export bridge (json)

let friction = 0.2;

let can;
/** @type {CanvasRenderingContext2D} */
let ctx;

let lastTime = 0;

/** @type {Settings} */
let settings;

let verts = [];
let edges = [];

/** @type {Vertex} */
let selectedVertex = null;

let dragging = false;
let enableGrid = true;
let gridScale = 20;

let simulate = false;

let updateIntervalId;

document.addEventListener('DOMContentLoaded', () => {
    // reset form
    document.querySelector('#settingsForm').reset();
    
    can = document.querySelector('#can');
    ctx = can.getContext('2d');
    
    // canvas mouse events
    
    can.addEventListener('click', (event) => {
        let box = can.getBoundingClientRect();
        let point = new Point(event.x - box.x, event.y - box.y);
        let mode = settings.getSetting('drawMode');
        if(mode == 'AddEdges') { // TODO: rewrite modes so that there is an enable-, disable, and click function for all of them so that for example selected can be reset easier
            let target = getTargetVertex(point);
            if(target && selectedVertex && target != selectedVertex) {
                if(!edges.reduce((p, c) => p || c.a == selectedVertex && c.b == target || c.a == target && c.b == selectedVertex, false)) { // check if edge does not exist yet
                    edges.push(new Edge(selectedVertex, target));
                }
            }
            selectedVertex = target;
        }
        if(mode == 'AddVertices') {
            if(enableGrid) verts.push(new Vertex(snap(point.x, gridScale), snap(point.y, gridScale)));
            else verts.push(new Vertex(point.x, point.y));
        }
        if(mode == 'RemoveVertices') {
            let target = getTargetVertex(point);
            console.log(target);
            let removedEdges = [];
            edges.forEach((e) => {
                if(e.a == target || e.b == target) removedEdges.push(e);
            });
            edges = edges.filter((e) => !removedEdges.includes(e));
            verts = verts.filter((v) => v != target);
        }
        if(mode == 'RemoveEdges') {
            let target = getTargetVertex(point);
            if(target && selectedVertex && target != selectedVertex) {
                let removedEdges = edges.filter((e) => e.a == selectedVertex && e.b == target || e.a == target && e.b == selectedVertex);
                edges = edges.filter((e) => !removedEdges.includes(e));
                selectedVertex = null;
            } else { // includes case when target == null (deselect) and selected == null (select first vertex)
                selectedVertex = target;
            }
        }
        if(mode == 'EditVertices') {
            let target = getTargetVertex(point);
            selectedVertex = target;
            
            if(selectedVertex) {
                document.querySelector('#settingsVertex').disabled = false;
                document.querySelector('#type' + selectedVertex.type).checked = true;
            } else {
                document.querySelector('#settingsVertex').disabled = true;
                // deselect vertex type
                let typeLooseButton = document.querySelector('#typeLoose');
                typeLooseButton.checked = true;
                typeLooseButton.checked = false;
            }
        }
        if(mode == 'EditVertices') {
            let target = getTargetVertex(point);
            selectedVertex = target;
            
            if(selectedVertex) {
                document.querySelector('#settingsVertex').disabled = false;
                document.querySelector('#type' + selectedVertex.type).checked = true;
            } else {
                document.querySelector('#settingsVertex').disabled = true;
                // deselect vertex type
                let typeLooseButton = document.querySelector('#typeLoose');
                typeLooseButton.checked = true;
                typeLooseButton.checked = false;
            }
        }
    });
    
    can.addEventListener('mousedown', (event) => {
        let box = can.getBoundingClientRect();
        let point = new Point(event.x - box.x, event.y - box.y);
        if(settings.getSetting('drawMode') == 'Move') {
            let target = getTargetVertex(point);
            if(target) {
                selectedVertex = target;
                dragging = true;
            }
        }
    });
    
    can.addEventListener('mouseup', (event) => {
        if(settings.getSetting('drawMode') == 'Move') {
            selectedVertex = null;
            dragging = false;
        }
    });
    
    can.addEventListener('mousemove', (event) => {
        let box = can.getBoundingClientRect();
        let point = new Point(event.x - box.x, event.y - box.y);
        if(settings.getSetting('drawMode') == 'Move') {
            if(dragging) {
                if(enableGrid) {
                    selectedVertex.x = snap(point.x, gridScale);
                    selectedVertex.y = snap(point.y, gridScale);
                } else {
                    selectedVertex.x = point.x;
                    selectedVertex.y = point.y;
                }
            }
        }
    });
    
    // form click events
    
    document.querySelector('#settingsMode').addEventListener('change', (event) => {
        selectedVertex = null;
        
        document.querySelector('#settingsVertex').disabled = true;
        // deselect vertex type
        let typeLooseButton = document.querySelector('#typeLoose');
        typeLooseButton.checked = true;
        typeLooseButton.checked = false;
    });
    
    document.querySelector('#settingsVertex').addEventListener('change', (event) => {
        if(settings.getSetting('drawMode') == 'EditVertices') {
            if(selectedVertex) selectedVertex.type = settings.getSetting('vertexType');
        }
    });
    
    document.querySelector('#settingsSimulation').addEventListener('change', (event) => {
        if(settings.getSetting('simulationStart')) {
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
            if(!simulate) updateIntervalId = setInterval(() => update(10 / 1000), 2 /* update delay */);
            simulate = true;
        } else {
            simulate = false;
            document.querySelector('#settingsMode').disabled = false;
        }
    });
    
    document.querySelector('#settingsOther').addEventListener('change', (event) => {
        enableGrid = settings.getSetting('enableGrid');
        friction = settings.getSetting('friction');
    });
    
    settings = new Settings();
    
    requestAnimationFrame(loop);
});

function snap(value, interval) {
    return Math.round(value / interval) * interval;
}

function getTargetVertex(point) {
    return verts.reduce((p, c) => point.sqrDistance(c) <= 10 ** 2 ? c : p, null);
}

function loop(time) {
    let deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    //if(simulate) update(deltaTime);
    draw();
    
    requestAnimationFrame(loop);
}

function update(deltaTime) {
    if(!simulate) {
        clearInterval(updateIntervalId);
        return;
    }
    
    edges.forEach((e) => {
        e.calcForce();
        e.a.force[0] += e.force[0] * 0.5;
        e.a.force[1] += e.force[1] * 0.5;
        e.b.force[0] += -e.force[0] * 0.5;
        e.b.force[1] += -e.force[1] * 0.5;
    });
    let frictionFactor = (1 - deltaTime) ** friction;
    verts.forEach((v) => v.simulationStep(deltaTime, frictionFactor));
}

function draw() {
    let box = can.getBoundingClientRect();
    ctx.clearRect(0, 0, box.width, box.height);
    
    // draw grid
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    if(enableGrid) {
        ctx.beginPath();
        for(let i = 0; i < box.width; i += gridScale) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, box.height);
        }
        for(let i = 0; i < box.height; i += gridScale) {
            ctx.moveTo(0, i);
            ctx.lineTo(box.width, i);
        }
        ctx.stroke();
    }
    
    // draw edges
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 5;
    edges.forEach((e) => {
        if(simulate) {
            if(e.broken) return;
            let stress = magnitudeV(e.force) * 10 /* max force (fully red) */;
            stress = Math.min(stress >> 0, 0xFF);
            ctx.strokeStyle = getColorString(stress, 255 - stress, 0);
            ctx.beginPath();
            ctx.moveTo(e.a.simPosition[0], e.a.simPosition[1]);
            ctx.lineTo(e.b.simPosition[0], e.b.simPosition[1]);
        } else {
            ctx.beginPath();
            ctx.moveTo(e.a.x, e.a.y);
            ctx.lineTo(e.b.x, e.b.y);
        }
        ctx.stroke();
    });
    
    // draw vertices
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    verts.forEach((v) => {
        let x = simulate ? v.simPosition[0] : v.x;
        let y = simulate ? v.simPosition[1] : v.y;
        
        ctx.fillStyle = v == selectedVertex ? '#F00' : '#FFF';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        if(v.type == 'FixedX' || v.type == 'Fixed') {
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x, y + 10);
        }
        if(v.type == 'FixedY' || v.type == 'Fixed') {
            ctx.moveTo(x - 10, y);
            ctx.lineTo(x + 10, y);
        }
        ctx.stroke();
    });
}

function getColorString(r, g, b) {
    let ret = '#';
    [r, g, b].forEach((component) => ret += (component < 0x10 ? '0' : '') + component.toString(16));
    return ret;
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    sqrDistance(otherPoint) {
        return (otherPoint.x - this.x) ** 2 + (otherPoint.y - this.y) ** 2;
    }
}

class Vertex extends Point {
    constructor(x, y) {
        super(x, y);
        this.type = 'Loose';
    }
    
    initSimulation() {
        this.simPosition = [this.x, this.y];
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
        this.length = Math.sqrt(this.a.sqrDistance(this.b));
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
    }
}

class Settings {
    constructor() {
        this.form = document.querySelector('#settingsForm');
    }
    
    getSetting(name) {
        return (new FormData(this.form)).get(name);
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
