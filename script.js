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

let gravityForce = 1;

let updateIntervalId;

let zoomFactor = 1;
let screenCenter = [0, 0];
const screenOffset = [800 / 2, 500 / 2];
const zoomSpeed = 0.2;

document.addEventListener('DOMContentLoaded', () => {
    // reset form
    document.querySelector('#settingsForm').reset();
    
    can = document.querySelector('#can');
    ctx = can.getContext('2d');
    
    // canvas mouse events
    
    can.addEventListener('click', (event) => {
        let box = can.getBoundingClientRect();
        let point = screenToWorld([event.x - box.x, event.y - box.y]);
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
            if(enableGrid) verts.push(new Vertex(snap(point[0], gridScale), snap(point[1], gridScale)));
            else verts.push(new Vertex(point[0], point[1]));
        }
        if(mode == 'RemoveVertices') {
            let target = getTargetVertex(point);
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
        let point = screenToWorld([event.x - box.x, event.y - box.y]);
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
        let point = screenToWorld([event.x - box.x, event.y - box.y]);
        if(settings.getSetting('drawMode') == 'Move') {
            if(dragging) {
                if(enableGrid) {
                    selectedVertex.pos[0] = snap(point[0], gridScale);
                    selectedVertex.pos[1] = snap(point[1], gridScale);
                } else {
                    selectedVertex.pos[0] = point[0];
                    selectedVertex.pos[1] = point[1];
                }
            }
        }
    });
    
    can.addEventListener('wheel', (event) => {
        let direction = event.wheelDelta > 0 ? 1 : -1;
        zoomFactor *= 1 + direction * zoomSpeed;
        
        let box = can.getBoundingClientRect();
        let point = screenToWorld([event.x - box.x, event.y - box.y]);
        let offset = subV(point, screenCenter);
        screenCenter = addV(screenCenter, mulVS(offset, zoomSpeed * direction));
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
            startSimulation();
        } else {
            stopSimulation();
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
    return verts.reduce((p, c) => distanceV(point, c.pos) <= 10 ? c : p, null);
}

function loop(time) {
    draw();
    
    requestAnimationFrame(loop);
}

function draw() {
    let box = can.getBoundingClientRect();
    ctx.clearRect(0, 0, box.width, box.height);
    
    // draw grid
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    if(enableGrid) {
        ctx.beginPath();
        let offsetX = ((box.width % (gridScale * zoomFactor * 2)) / 2) - (screenCenter[0] % gridScale) * zoomFactor;
        for(let i = offsetX; i < box.width; i += gridScale * zoomFactor) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, box.height);
        }
        let offsetY = ((box.height % (gridScale * zoomFactor * 2)) / 2) - (screenCenter[1] % gridScale) * zoomFactor;
        for(let i = offsetY; i < box.height; i += gridScale * zoomFactor) {
            ctx.moveTo(0, i);
            ctx.lineTo(box.width, i);
        }
        ctx.stroke();
    }
    
    // draw edges
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 5 * zoomFactor;
    edges.forEach((e) => {
        if(simulate) {
            if(e.broken) return;
            let stress = magnitudeV(e.force) * 10 /* max force (fully red) */;
            stress = Math.min(stress >> 0, 0xFF);
            ctx.strokeStyle = `rgb(${stress}, ${255 - stress}, 0)`;
            ctx.beginPath();
            let posA = worldToScreen(e.a.simPosition);
            let posB = worldToScreen(e.b.simPosition);
            ctx.moveTo(posA[0], posA[1]);
            ctx.lineTo(posB[0], posB[1]);
        } else {
            ctx.beginPath();
            let posA = worldToScreen(e.a.pos);
            let posB = worldToScreen(e.b.pos);
            ctx.moveTo(posA[0], posA[1]);
            ctx.lineTo(posB[0], posB[1]);
        }
        ctx.stroke();
    });
    
    // draw vertices
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    verts.forEach((v) => {
        let pos = simulate ? worldToScreen(v.simPosition) : worldToScreen(v.pos);
        
        ctx.fillStyle = v == selectedVertex ? '#F00' : '#FFF';
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 10 * zoomFactor, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        if(v.type == 'FixedX' || v.type == 'Fixed') {
            ctx.moveTo(pos[0], pos[1] - 10 * zoomFactor);
            ctx.lineTo(pos[0], pos[1] + 10 * zoomFactor);
        }
        if(v.type == 'FixedY' || v.type == 'Fixed') {
            ctx.moveTo(pos[0] - 10 * zoomFactor, pos[1]);
            ctx.lineTo(pos[0] + 10 * zoomFactor, pos[1]);
        }
        ctx.stroke();
    });
}

class Settings {
    constructor() {
        this.form = document.querySelector('#settingsForm');
    }
    
    getSetting(name) {
        return (new FormData(this.form)).get(name);
    }
}

function screenToWorld(screenPos) {
    return addV(mulVS(subV(screenPos, screenOffset), 1 / zoomFactor), screenCenter);
}

function worldToScreen(worldPos) {
    return addV(mulVS(subV(worldPos, screenCenter), zoomFactor), screenOffset);
}
