/* ===========================================================
   Campus Accessibility Mapping System
   Pure HTML / CSS / JavaScript — no frameworks
   =========================================================== */

// ============== Data ==============
const BUILDINGS = [
  { id: "lib",  name: "Main Library",        x: 80,  y: 380, w: 110, h: 80, accessible: true,  icon: "📚" },
  { id: "sci",  name: "Science Block",       x: 240, y: 200, w: 120, h: 80, accessible: true,  icon: "🔬" },
  { id: "eng",  name: "Engineering Hall",    x: 460, y: 220, w: 130, h: 90, accessible: true,  icon: "⚙️" },
  { id: "caf",  name: "Cafeteria",           x: 620, y: 80,  w: 110, h: 70, accessible: true,  icon: "🍽️" },
  { id: "art",  name: "Arts Building",       x: 80,  y: 80,  w: 110, h: 80, accessible: false, icon: "🎨" },
  { id: "gym",  name: "Sports Center",       x: 380, y: 380, w: 130, h: 80, accessible: true,  icon: "🏟️" },
];

// Initial seeded reports
let REPORTS = [
  { id: 1, location: "Engineering Hall", type: "Broken ramp",         severity: "high",   status: "open",     description: "Ramp surface cracked near east entrance.", reporter: "Sara",   ts: Date.now() - 1000 * 60 * 60 * 5 },
  { id: 2, location: "Main Library",     type: "Elevator out of service", severity: "medium", status: "open",     description: "Elevator B not responding on floor 2.",    reporter: "Alex",   ts: Date.now() - 1000 * 60 * 60 * 24 },
  { id: 3, location: "Cafeteria",        type: "Blocked pathway",    severity: "low",    status: "resolved", description: "Delivery cart blocking entrance.",         reporter: "Anonymous", ts: Date.now() - 1000 * 60 * 60 * 48 },
];

// In-memory notifications
let NOTIFICATIONS = [];

// Accessibility settings (persisted)
const SETTINGS_KEY = "campus_a11y_settings";
const REPORTS_KEY  = "campus_a11y_reports";

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    if (s.contrast)   document.body.classList.add("hc");
    if (s.largeText)  document.body.classList.add("large-text");
    if (s.reduceMotion) document.body.classList.add("reduce-motion");
    return s;
  } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function loadReports() {
  try {
    const stored = JSON.parse(localStorage.getItem(REPORTS_KEY));
    if (Array.isArray(stored) && stored.length) REPORTS = stored;
  } catch {}
}
function saveReports() { localStorage.setItem(REPORTS_KEY, JSON.stringify(REPORTS)); }

// ============== Toasts / Notifications ==============
function toast({ title, message = "", type = "info", duration = 4000 }) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const ico = type === "success" ? "✅" : type === "error" ? "❌" : type === "warn" ? "⚠️" : "ℹ️";
  el.innerHTML = `
    <span class="t-ico">${ico}</span>
    <div class="t-body">
      <div class="t-title"></div>
      <div class="t-msg"></div>
    </div>
    <button class="t-close" aria-label="Close">×</button>
  `;
  el.querySelector(".t-title").textContent = title;
  el.querySelector(".t-msg").textContent = message;
  el.querySelector(".t-close").addEventListener("click", () => el.remove());
  container.appendChild(el);
  if (duration) setTimeout(() => el.remove(), duration);
}

function pushNotification(n) {
  NOTIFICATIONS.unshift({ ...n, ts: Date.now() });
  if (NOTIFICATIONS.length > 20) NOTIFICATIONS.length = 20;
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById("notif-list");
  const badge = document.getElementById("bell-badge");
  if (!NOTIFICATIONS.length) {
    list.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.textContent = NOTIFICATIONS.length;
  list.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item">
      <span class="n-ico">${n.icon || "🔔"}</span>
      <div>
        <div><strong>${escapeHtml(n.title)}</strong></div>
        <div>${escapeHtml(n.message || "")}</div>
        <div class="n-time">${timeAgo(n.ts)}</div>
      </div>
    </div>
  `).join("");
}

// ============== Helpers ==============
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ============== Router ==============
const routes = {
  "/":            { tpl: "tpl-map",        title: "Home Map",          init: initMapPage,      showRoute: true  },
  "/find-route":  { tpl: "tpl-find-route", title: "Find Route",        init: initFindRoutePage,showRoute: true  },
  "/report":      { tpl: "tpl-report",     title: "Report Obstruction",init: initReportPage,   showRoute: false },
  "/reports":     { tpl: "tpl-reports",    title: "Reports List",      init: initReportsPage,  showRoute: false },
  "/guide":       { tpl: "tpl-guide",      title: "Guide",             init: () => {},         showRoute: false },
  "/about":       { tpl: "tpl-about",      title: "About",             init: () => {},         showRoute: false },
};

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return routes[hash] ? hash : "/";
}

function navigate(path) {
  window.location.hash = path;
}

function renderRoute() {
  const path = getCurrentRoute();
  const route = routes[path];
  const view = document.getElementById("view");
  view.innerHTML = "";
  const tpl = document.getElementById(route.tpl);
  if (!tpl) {
    view.innerHTML = `<div class="card"><h1>404 — Page not found</h1><p><a href="#/">Go home</a></p></div>`;
    return;
  }
  view.appendChild(tpl.content.cloneNode(true));

  // Highlight nav
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === path);
  });

  // Show/hide route panel
  document.getElementById("route-panel").hidden = !route.showRoute || window.innerWidth < 900;

  // Close mobile sidebar
  document.getElementById("sidebar").classList.remove("open");

  // Init page
  try { route.init(); }
  catch (err) {
    console.error(err);
    toast({ title: "Page error", message: err.message, type: "error" });
  }
}

window.addEventListener("hashchange", renderRoute);

// ============== Map rendering ==============
function renderBuildingsAndMarkers() {
  const buildingsGroup = document.getElementById("buildings");
  const markersGroup   = document.getElementById("markers");
  if (!buildingsGroup) return;

  buildingsGroup.innerHTML = BUILDINGS.map(b => `
    <g class="building" data-id="${b.id}" data-name="${escapeHtml(b.name)}">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"
            fill="${b.accessible ? '#dbeafe' : '#fee2e2'}"
            stroke="${b.accessible ? '#3b82f6' : '#ef4444'}" stroke-width="2"/>
      <text x="${b.x + b.w/2}" y="${b.y + b.h/2 - 4}" text-anchor="middle">${b.icon}</text>
      <text x="${b.x + b.w/2}" y="${b.y + b.h/2 + 14}" text-anchor="middle">${escapeHtml(b.name)}</text>
    </g>
  `).join("");

  // Markers from reports
  const open = REPORTS.filter(r => r.status === "open");
  markersGroup.innerHTML = open.map(r => {
    const b = BUILDINGS.find(b => b.name === r.location);
    if (!b) return "";
    const x = b.x + b.w - 12, y = b.y + 12;
    const color = r.severity === "high" ? "var(--danger)" : r.severity === "medium" ? "var(--warn)" : "#22c55e";
    return `<g class="marker" data-id="${r.id}">
      <circle cx="${x}" cy="${y}" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">!</text>
    </g>`;
  }).join("");

  // Tooltips
  const tooltip = document.getElementById("map-tooltip");
  buildingsGroup.querySelectorAll(".building").forEach(g => {
    g.addEventListener("mousemove", (e) => {
      const stage = document.getElementById("map-stage").getBoundingClientRect();
      tooltip.hidden = false;
      tooltip.textContent = g.dataset.name;
      tooltip.style.left = (e.clientX - stage.left) + "px";
      tooltip.style.top  = (e.clientY - stage.top) + "px";
    });
    g.addEventListener("mouseleave", () => tooltip.hidden = true);
    g.addEventListener("click", () => {
      const b = BUILDINGS.find(x => x.id === g.dataset.id);
      toast({
        title: b.name,
        message: b.accessible ? "Step-free access available." : "⚠️ No step-free access.",
        type: b.accessible ? "info" : "warn",
      });
    });
  });
}

// ============== Map page ==============
function initMapPage() {
  renderBuildingsAndMarkers();

  // Layer chips
  document.querySelectorAll(".chip").forEach(c => {
    c.addEventListener("click", () => {
      c.classList.toggle("active");
      toast({ title: `Layer: ${c.dataset.layer}`, message: c.classList.contains("active") ? "Shown" : "Hidden" });
    });
  });

  // Zoom (visual scale on SVG)
  const svg = document.getElementById("map-svg");
  let scale = 1;
  document.getElementById("zoom-in")?.addEventListener("click", () => {
    scale = Math.min(2, scale + 0.2); svg.style.transform = `scale(${scale})`;
  });
  document.getElementById("zoom-out")?.addEventListener("click", () => {
    scale = Math.max(0.6, scale - 0.2); svg.style.transform = `scale(${scale})`;
  });
  document.getElementById("zoom-locate")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      return toast({ title: "Location unavailable", message: "Geolocation is not supported.", type: "error" });
    }
    toast({ title: "Locating…", message: "Requesting your location" });
    navigator.geolocation.getCurrentPosition(
      () => toast({ title: "Location found", message: "Centered map.", type: "success" }),
      () => toast({ title: "Location denied", message: "Permission was denied.", type: "error" })
    );
  });

  // Recent reports
  const list = document.getElementById("recent-list");
  if (list) {
    const recent = [...REPORTS].sort((a,b) => b.ts - a.ts).slice(0, 6);
    list.innerHTML = recent.map(r => `
      <div class="report-card">
        <div class="row">
          <strong>${escapeHtml(r.location)}</strong>
          <span class="tag ${r.severity}">${r.severity}</span>
        </div>
        <div class="muted">${escapeHtml(r.type)}</div>
        <div>${escapeHtml(r.description)}</div>
        <div class="row">
          <span class="tag ${r.status}">${r.status}</span>
          <span class="muted">${timeAgo(r.ts)}</span>
        </div>
      </div>
    `).join("");
  }
}

// ============== Find route page ==============
function initFindRoutePage() {
  renderBuildingsAndMarkers();
}

function buildRoutePath(fromId, toId) {
  const from = BUILDINGS.find(b => b.id === fromId);
  const to   = BUILDINGS.find(b => b.id === toId);
  if (!from || !to) return "";
  const x1 = from.x + from.w/2, y1 = from.y + from.h/2;
  const x2 = to.x + to.w/2,     y2 = to.y + to.h/2;
  const mx = (x1 + x2) / 2;
  // L-shaped accessible path
  return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
}

function setupRoutePanel() {
  const fromSel = document.getElementById("route-from");
  const toSel   = document.getElementById("route-to");
  fromSel.innerHTML = BUILDINGS.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  toSel.innerHTML   = BUILDINGS.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  toSel.selectedIndex = 1;

  document.getElementById("route-go").addEventListener("click", () => {
    const fromId = fromSel.value;
    const toId   = toSel.value;
    const stepFree = document.getElementById("route-stepfree").checked;
    const avoid    = document.getElementById("route-avoid").checked;

    if (fromId === toId) {
      toast({ title: "Invalid route", message: "Please choose two different buildings.", type: "error" });
      return;
    }
    const from = BUILDINGS.find(b => b.id === fromId);
    const to   = BUILDINGS.find(b => b.id === toId);

    if (stepFree && (!from.accessible || !to.accessible)) {
      const blocker = !from.accessible ? from.name : to.name;
      toast({ title: "No step-free route", message: `${blocker} has no step-free access.`, type: "error" });
      pushNotification({ icon: "❌", title: "Route blocked", message: `${blocker} has no step-free access.` });
      document.getElementById("route-result").innerHTML =
        `<strong style="color:var(--danger)">No accessible route available.</strong>`;
      return;
    }

    if (avoid) {
      const blocked = REPORTS.find(r => r.status === "open" && r.severity === "high"
        && (r.location === from.name || r.location === to.name));
      if (blocked) {
        toast({ title: "Obstruction warning", message: `High-severity obstruction at ${blocked.location}.`, type: "warn" });
        pushNotification({ icon: "⚠️", title: "Obstruction on route", message: blocked.location });
      }
    }

    // Draw on Find Route page if planned-route svg is present
    const planned = document.getElementById("planned-route");
    if (planned) planned.setAttribute("d", buildRoutePath(fromId, toId));

    const distance = Math.round(Math.random() * 300 + 200);
    const minutes  = Math.round(distance / 60);
    document.getElementById("route-result").innerHTML = `
      <strong>Accessible route found ✅</strong>
      <div class="muted">${distance}m • ~${minutes} min walk</div>
      <ol>
        <li>Exit ${escapeHtml(from.name)} via main accessible entrance.</li>
        <li>Follow the marked step-free pathway.</li>
        <li>Use ramps where the path crosses elevation changes.</li>
        <li>Arrive at ${escapeHtml(to.name)}.</li>
      </ol>
    `;
    toast({ title: "Route ready", message: `${from.name} → ${to.name}`, type: "success" });
    pushNotification({ icon: "🧭", title: "Route planned", message: `${from.name} → ${to.name}` });
  });
}

// ============== Report page ==============
function initReportPage() {
  const form = document.getElementById("report-form");
  const locSelect = form.querySelector('[name="location"]');
  locSelect.innerHTML += BUILDINGS.map(b => `<option>${escapeHtml(b.name)}</option>`).join("");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const errors = {};
    if (!data.get("location"))  errors.location = "Please select a location.";
    if (!data.get("type"))      errors.type = "Please choose a type.";
    if (!data.get("severity"))  errors.severity = "Please choose a severity.";
    const desc = (data.get("description") || "").toString().trim();
    if (desc.length < 10)       errors.description = "Description must be at least 10 characters.";

    // Reset error UI
    form.querySelectorAll(".field").forEach(f => f.classList.remove("invalid"));
    form.querySelectorAll(".error").forEach(s => s.textContent = "");

    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([k, msg]) => {
        const input = form.querySelector(`[name="${k}"]`);
        const field = input?.closest(".field");
        if (field) field.classList.add("invalid");
        const slot = form.querySelector(`[data-error="${k}"]`);
        if (slot) slot.textContent = msg;
      });
      toast({
        title: "Could not submit report",
        message: `${Object.keys(errors).length} field(s) need attention.`,
        type: "error",
      });
      return;
    }

    const newReport = {
      id: Date.now(),
      location: data.get("location"),
      type: data.get("type"),
      severity: data.get("severity"),
      description: desc,
      reporter: (data.get("reporter") || "").toString().trim() || "Anonymous",
      status: "open",
      ts: Date.now(),
    };
    REPORTS.unshift(newReport);
    saveReports();
    toast({ title: "Report submitted", message: `${newReport.location}: ${newReport.type}`, type: "success" });
    pushNotification({ icon: "⚠️", title: "New obstruction reported", message: `${newReport.location} — ${newReport.type}` });
    form.reset();
    setTimeout(() => navigate("/reports"), 600);
  });
}

// ============== Reports list page ==============
function initReportsPage() {
  const tbody = document.getElementById("reports-tbody");
  const fs = document.getElementById("filter-severity");
  const fst = document.getElementById("filter-status");

  function render() {
    const sev = fs.value, status = fst.value;
    const rows = REPORTS
      .filter(r => !sev || r.severity === sev)
      .filter(r => !status || r.status === status);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No reports match these filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.location)}</td>
        <td>${escapeHtml(r.type)}</td>
        <td><span class="tag ${r.severity}">${r.severity}</span></td>
        <td><span class="tag ${r.status}">${r.status}</span></td>
        <td>${timeAgo(r.ts)}</td>
        <td>
          ${r.status === "open"
            ? `<button class="link-btn" data-resolve="${r.id}">Mark resolved</button>`
            : ""}
        </td>
      </tr>
    `).join("");
    tbody.querySelectorAll("[data-resolve]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.resolve);
        const r = REPORTS.find(x => x.id === id);
        if (r) {
          r.status = "resolved";
          saveReports();
          render();
          toast({ title: "Resolved", message: r.location, type: "success" });
          pushNotification({ icon: "✅", title: "Report resolved", message: r.location });
        }
      });
    });
  }

  fs.addEventListener("change", render);
  fst.addEventListener("change", render);
  render();
}

// ============== Settings / Topbar ==============
function initShell() {
  // Settings
  const s = loadSettings();
  const c = document.getElementById("opt-contrast");
  const lt = document.getElementById("opt-largetext");
  const rm = document.getElementById("opt-motion");
  c.checked  = !!s.contrast;
  lt.checked = !!s.largeText;
  rm.checked = !!s.reduceMotion;

  c.addEventListener("change", () => {
    document.body.classList.toggle("hc", c.checked);
    saveSettings({ ...loadSettings(), contrast: c.checked });
    toast({ title: `High contrast ${c.checked ? "on" : "off"}`, type: "info" });
  });
  lt.addEventListener("change", () => {
    document.body.classList.toggle("large-text", lt.checked);
    saveSettings({ ...loadSettings(), largeText: lt.checked });
    toast({ title: `Large text ${lt.checked ? "on" : "off"}`, type: "info" });
  });
  rm.addEventListener("change", () => {
    document.body.classList.toggle("reduce-motion", rm.checked);
    saveSettings({ ...loadSettings(), reduceMotion: rm.checked });
    toast({ title: `Reduce motion ${rm.checked ? "on" : "off"}`, type: "info" });
  });

  // Mobile menu
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // Bell
  const bell = document.getElementById("bell-btn");
  const dropdown = document.getElementById("notif-dropdown");
  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== bell) dropdown.hidden = true;
  });
  document.getElementById("clear-notifs").addEventListener("click", () => {
    NOTIFICATIONS = [];
    renderNotifications();
    toast({ title: "Notifications cleared", type: "info" });
  });

  // Search
  const search = document.getElementById("search-input");
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = search.value.trim().toLowerCase();
      if (!q) return;
      const match = BUILDINGS.find(b => b.name.toLowerCase().includes(q));
      if (match) {
        toast({ title: "Found", message: match.name, type: "success" });
      } else {
        toast({ title: "No match", message: `Nothing found for "${q}"`, type: "error" });
      }
    }
  });

  // Route panel (lives outside view, set up once)
  setupRoutePanel();

  // Hide route panel when narrow
  window.addEventListener("resize", () => {
    const route = routes[getCurrentRoute()];
    document.getElementById("route-panel").hidden = !route.showRoute || window.innerWidth < 900;
  });
}

// Global error handler — show as toast
window.addEventListener("error", (e) => {
  toast({ title: "Unexpected error", message: e.message || "Something went wrong.", type: "error" });
});
window.addEventListener("unhandledrejection", (e) => {
  toast({ title: "Request failed", message: (e.reason && e.reason.message) || "Promise rejected.", type: "error" });
});

// ============== Boot ==============
document.addEventListener("DOMContentLoaded", () => {
  loadReports();
  initShell();
  renderRoute();
  renderNotifications();
  // Welcome toast
  setTimeout(() => toast({
    title: "Welcome to CampusAccess",
    message: "Plan step-free routes and report obstructions.",
    type: "success",
  }), 400);
});
