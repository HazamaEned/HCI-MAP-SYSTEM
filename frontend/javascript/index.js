const CELL_WIDTH = 20;
const CELL_HEIGHT = 15;

const GRID_COLS = Math.floor(680 / CELL_WIDTH);
const GRID_ROWS = Math.floor(120 / CELL_HEIGHT);

let grid = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => 0)
);

let mode = 'wall';
let startPoint = null;
let endPoint = null;

// ── Mode & toolbar ──────────────────────────────────────────

function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + newMode).classList.add('active');
}

function clearAll() {
    const svg = document.querySelector("#map-container svg");
    if (!svg) return;
    document.querySelectorAll(".path-cell, #start-marker, #end-marker").forEach(el => el.remove());
    startPoint = null;
    endPoint = null;
}

// ── Navigation ──────────────────────────────────────────────

function selectFloor(btn) {
    document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadFloor(btn.dataset.floor);
}

function showHome() {
    document.getElementById("home-view").classList.remove("hidden");
    document.getElementById("map-view").classList.add("hidden");
}

function showMap() {
    document.getElementById("home-view").classList.add("hidden");
    document.getElementById("map-view").classList.remove("hidden");
    const defaultBtn = document.querySelector('.floor-btn[data-floor="1"]');
    if (defaultBtn) selectFloor(defaultBtn);
}

// ── Floor loading ───────────────────────────────────────────

function loadFloor(floorNumber) {
    fetch(`../components/floor${floorNumber}.html`)
        .then(res => res.text())
        .then(html => {
            document.getElementById("map-container").innerHTML = html;

            grid = Array.from({ length: GRID_ROWS }, () =>
                Array.from({ length: GRID_COLS }, () => 0)
            );

            startPoint = null;
            endPoint = null;

            setupFloor();
        });
}

function setupFloor() {
    const svg = document.querySelector("#map-container svg");
    if (!svg) return;

    drawGridOverlay(svg);
    generateWallsFromSVG(svg);

    svg.addEventListener("click", (e) => {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

        const gridX = Math.floor(svgPoint.x / CELL_WIDTH);
        const gridY = Math.floor(svgPoint.y / CELL_HEIGHT);

        if (gridY < 0 || gridY >= GRID_ROWS || gridX < 0 || gridX >= GRID_COLS) return;

        if (mode === 'wall') {
            grid[gridY][gridX] = grid[gridY][gridX] === 1 ? 0 : 1;
            drawBlockedCells(svg);

        } else if (mode === 'path') {
            if (grid[gridY][gridX] === 1) return;

            if (!startPoint) {
                startPoint = { x: gridX, y: gridY };
                drawMarker(svg, gridX, gridY, "green", "start-marker");

            } else if (!endPoint) {
                endPoint = { x: gridX, y: gridY };
                drawMarker(svg, gridX, gridY, "blue", "end-marker");
                runPathfinding(svg);

            } else {
                clearAll();
                startPoint = { x: gridX, y: gridY };
                drawMarker(svg, gridX, gridY, "green", "start-marker");
            }
        }
    });
}

// ── Grid drawing ────────────────────────────────────────────

function drawGridOverlay(svg) {
    const overlay = document.getElementById("grid-overlay");
    overlay.innerHTML = "";

    for (let x = 0; x <= 680; x += CELL_WIDTH) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x); line.setAttribute("y1", 0);
        line.setAttribute("x2", x); line.setAttribute("y2", 120);
        line.setAttribute("stroke", "#ccc");
        overlay.appendChild(line);
    }

    for (let y = 0; y <= 120; y += CELL_HEIGHT) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", 0);   line.setAttribute("y1", y);
        line.setAttribute("x2", 680); line.setAttribute("y2", y);
        line.setAttribute("stroke", "#ccc");
        overlay.appendChild(line);
    }
}

function drawBlockedCells(svg) {
    document.querySelectorAll(".blocked-cell").forEach(el => el.remove());

    grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 1) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", x * CELL_WIDTH);
                rect.setAttribute("y", y * CELL_HEIGHT);
                rect.setAttribute("width", CELL_WIDTH);
                rect.setAttribute("height", CELL_HEIGHT);
                rect.setAttribute("fill", "rgba(255,0,0,0.3)");
                rect.setAttribute("pointer-events", "none");
                rect.classList.add("blocked-cell");
                svg.appendChild(rect);
            }
        });
    });
}

function generateWallsFromSVG(svg) {
    const walls = svg.querySelectorAll(".wall, .room");

    walls.forEach(el => {
        if (el.tagName === "rect") {
            const x = parseFloat(el.getAttribute("x"));
            const y = parseFloat(el.getAttribute("y"));
            const w = parseFloat(el.getAttribute("width"));
            const h = parseFloat(el.getAttribute("height"));

            const startX = Math.floor(x / CELL_WIDTH);
            const startY = Math.floor(y / CELL_HEIGHT);
            const endX = Math.ceil((x + w) / CELL_WIDTH) - 1;
            const endY = Math.ceil((y + h) / CELL_HEIGHT) - 1;

            for (let gy = startY; gy <= endY; gy++) {
                for (let gx = startX; gx <= endX; gx++) {
                    if (grid[gy] && grid[gy][gx] !== undefined) {
                        grid[gy][gx] = 1;
                    }
                }
            }
        }
    });

    drawBlockedCells(svg);
}

// ── Markers ─────────────────────────────────────────────────

function drawMarker(svg, gridX, gridY, color, id) {
    const old = document.getElementById(id);
    if (old) old.remove();

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", gridX * CELL_WIDTH + CELL_WIDTH / 2);
    circle.setAttribute("cy", gridY * CELL_HEIGHT + CELL_HEIGHT / 2);
    circle.setAttribute("r", 6);
    circle.setAttribute("fill", color);
    circle.setAttribute("pointer-events", "none");
    circle.setAttribute("id", id);
    svg.appendChild(circle);
}

// ── Pathfinding ─────────────────────────────────────────────

function runPathfinding(svg) {
    const start = startPoint;
    const end = endPoint;

    const queue = [{ ...start, path: [start] }];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.x === end.x && current.y === end.y) {
            drawPath(svg, current.path);
            return;
        }

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x,     y: current.y + 1 },
            { x: current.x,     y: current.y - 1 },
        ];

        for (const n of neighbors) {
            const key = `${n.x},${n.y}`;
            if (
                n.x >= 0 && n.x < GRID_COLS &&
                n.y >= 0 && n.y < GRID_ROWS &&
                grid[n.y][n.x] !== 1 &&
                !visited.has(key)
            ) {
                visited.add(key);
                queue.push({ ...n, path: [...current.path, n] });
            }
        }
    }

    alert("No path found!");
}

function drawPath(svg, path) {
    path.forEach(point => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", point.x * CELL_WIDTH);
        rect.setAttribute("y", point.y * CELL_HEIGHT);
        rect.setAttribute("width", CELL_WIDTH);
        rect.setAttribute("height", CELL_HEIGHT);
        rect.setAttribute("fill", "rgba(255, 200, 0, 0.5)");
        rect.setAttribute("pointer-events", "none");
        rect.classList.add("path-cell");
        svg.appendChild(rect);
    });
}