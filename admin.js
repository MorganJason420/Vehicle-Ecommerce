(() => {
  const AUTH = "motorvault-admin-auth";
  const TEMP_AUTH = "motorvault-admin-session";
  const storageKey = key => `motorvault-${key}`;
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(storageKey(key))) ?? fallback; }
    catch { return fallback; }
  };
  const sessionDuration = remember => remember ? 8 * 3600000 : Math.max(1, Number(read("admin-settings", {}).timeout) || 30) * 60000;
  const write = (key, value) => localStorage.setItem(storageKey(key), JSON.stringify(value));
  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
  const number = value => new Intl.NumberFormat("en-US").format(Number(value) || 0);
  const stamp = date => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const ago = date => {
    const mins = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
    return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
  };
  const photo = value => !value ? "" : /^https?:\/\//i.test(value) ? value : `https://images.unsplash.com/${value}?auto=format&fit=crop&w=500&q=80`;
  const toast = message => {
    const el = document.querySelector("#admin-toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("is-visible"), 2500);
  };
  const loginPage = document.body.dataset.adminPage === "login";
  const validSession = () => {
    for (const [storage, key] of [[sessionStorage, TEMP_AUTH], [localStorage, AUTH]]) {
      try {
        const session = JSON.parse(storage.getItem(key));
        if (session?.expiresAt > Date.now()) return { storage, key, session };
        if (session) storage.removeItem(key);
      } catch { storage.removeItem(key); }
    }
    return null;
  };

  if (loginPage) {
    if (validSession()) { location.replace("admin.html"); return; }
    const password = document.querySelector("#admin-password");
    document.querySelector("[data-password-toggle]")?.addEventListener("click", event => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      event.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
    document.querySelector("#admin-login-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const message = document.querySelector("#login-error");
      if (String(values.get("username")).trim() !== "admin" || values.get("password") !== "MotorVault@2026!") {
        message.textContent = "Those credentials don’t match the administrator account.";
        password.select();
        return;
      }
      const remember = values.get("remember") === "on";
      const storage = remember ? localStorage : sessionStorage;
      const key = remember ? AUTH : TEMP_AUTH;
      storage.setItem(key, JSON.stringify({ username: "admin", remember, expiresAt: Date.now() + sessionDuration(remember) }));
      (remember ? sessionStorage : localStorage).removeItem(remember ? TEMP_AUTH : AUTH);
      location.assign("admin.html");
    });
    return;
  }

  let session = validSession();
  if (!session) { location.replace("admin-login.html"); return; }
  const logout = () => {
    localStorage.removeItem(AUTH);
    sessionStorage.removeItem(TEMP_AUTH);
    location.replace("admin-login.html");
  };
  let lastTouch = 0;
  document.addEventListener("pointerdown", () => {
    if (Date.now() - lastTouch < 60000) return;
    lastTouch = Date.now();
    session = validSession();
    if (!session) return logout();
    session.session.expiresAt = Date.now() + sessionDuration(session.session.remember);
    session.storage.setItem(session.key, JSON.stringify(session.session));
  }, { passive: true });

  const statusList = ["Available", "Reserved", "Sold", "Pending", "Draft", "Archived"];
  const normalize = (v, index = 0) => ({
    ...v, id: v.id || `mv-${Date.now()}-${index}`, year: Number(v.year) || 2024,
    price: Number(v.price) || 0, originalPrice: Number(v.originalPrice || v.price) || 0,
    mileage: Number(v.mileage) || 0, horsepower: Number(v.horsepower) || 0,
    status: v.status || "Available", featured: Boolean(v.featured), discount: Number(v.discount) || 0,
    interiorColor: v.interiorColor || "Black", engine: v.engine || "Not specified",
    vin: v.vin || `preview${String(index + 1).padStart(5, "0")}`,
    stockNumber: v.stockNumber || `MV-${String(index + 1).padStart(4, "0")}`,
    createdAt: v.createdAt || new Date(Date.now() - (index % 25) * 86400000).toISOString(),
    images: Array.isArray(v.images) ? v.images : [], features: Array.isArray(v.features) ? v.features : [],
    safetyFeatures: Array.isArray(v.safetyFeatures) ? v.safetyFeatures : []
  });
  let inventory = read("inventory", null);
  if (!Array.isArray(inventory)) inventory = (window.MOTORVAULT_VEHICLES || []).map(normalize);
  inventory = inventory.map(normalize);
  write("inventory", inventory);
  let orders = read("orders", [
    { reference: "MV-48192", name: "Jordan Ellis", status: "Completed", total: 87950, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), items: ["mv-2401"] },
    { reference: "MV-48167", name: "Camila Brooks", status: "Reserved", total: 48900, createdAt: new Date(Date.now() - 6 * 3600000).toISOString(), items: ["mv-2404"] },
    { reference: "MV-48131", name: "Samir Patel", status: "Processing", total: 62400, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), items: ["mv-2408"] }
  ]);
  if (!read("orders", null)) write("orders", orders);
  let leads = read("leads", [
    { id: "LD-201", name: "Riley James", email: "riley.james@example.test", interest: "Test drive", vehicle: "2023 Audi e-tron GT", status: "New", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "LD-202", name: "Noah Williams", email: "noah.williams@example.test", interest: "Vehicle inquiry", vehicle: "2024 Mercedes-Benz GLE", status: "Contacted", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "LD-203", name: "Mina Foster", email: "mina.foster@example.test", interest: "Sell a vehicle", vehicle: "Seller valuation", status: "New", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }
  ]);
  if (!read("leads", null)) write("leads", leads);
  let promotions = read("promotions", [
    { id: "PR-11", name: "Spring Drive Event", code: "SPRINGDRIVE", type: "Banner", value: "Featured inventory refresh", active: true, expires: "2026-05-31" },
    { id: "PR-12", name: "EV Week", code: "EVWEEK", type: "Price event", value: "Up to $1,500 off selected EVs", active: false, expires: "2026-06-15" }
  ]);
  if (!read("promotions", null)) write("promotions", promotions);
  let notifications = read("admin-notifications", [
    { id: "NT-01", title: "New inquiry received", body: "Riley James requested an Audi test drive.", createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), read: false },
    { id: "NT-02", title: "Inventory needs attention", body: "Two draft listings are waiting for review.", createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), read: false },
    { id: "NT-03", title: "Weekly snapshot is ready", body: "Marketplace activity is ready to review.", createdAt: new Date(Date.now() - 86400000).toISOString(), read: true }
  ]);
  if (!read("admin-notifications", null)) write("admin-notifications", notifications);
  let customers = read("customers", [
    { id: "CUS-101", name: "Jordan Ellis", email: "jordan.ellis@example.test", city: "Los Angeles, CA", orders: 2, total: 94100, joined: "2026-02-12" },
    { id: "CUS-102", name: "Camila Brooks", email: "camila.brooks@example.test", city: "San Diego, CA", orders: 1, total: 48900, joined: "2026-03-04" },
    { id: "CUS-103", name: "Samir Patel", email: "samir.patel@example.test", city: "Chicago, IL", orders: 1, total: 62400, joined: "2026-03-28" },
    { id: "CUS-104", name: "Avery Chen", email: "avery.chen@example.test", city: "Seattle, WA", orders: 0, total: 0, joined: "2026-04-18" }
  ]);
  if (!read("customers", null)) write("customers", customers);
  let reviews = read("reviews", [
    { id: "RV-51", name: "Jordan E.", rating: 5, vehicle: "2022 BMW M4 Competition", text: "Clear information and a calmer way to compare cars.", date: "2026-04-12", status: "Published" },
    { id: "RV-52", name: "Camila B.", rating: 5, vehicle: "2024 Tesla Model Y", text: "The shortlist made the decision straightforward.", date: "2026-04-08", status: "Published" },
    { id: "RV-53", name: "A. Chen", rating: 4, vehicle: "2023 Audi e-tron GT", text: "Beautiful selection. I would love more history detail.", date: "2026-04-06", status: "Pending" }
  ]);
  if (!read("reviews", null)) write("reviews", reviews);
  let home = read("homepage", { heroTitle: "Find Your", heroEmphasis: "Next Drive.", heroSubtitle: "Shop verified vehicles from trusted sellers and drive away with confidence.", buttonText: "Browse vehicles", buttonUrl: "vehicles.html", heroImage: "" });
  let activity = read("activity", [
    { icon: "＋", text: "BMW M4 was added to inventory", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { icon: "⇄", text: "Customer reserved Tesla Model Y", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { icon: "♥", text: "Mercedes-Benz GLE received 3 new favorites", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { icon: "⌑", text: "New test-drive request received", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { icon: "↗", text: "Homepage campaign activated", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }
  ]);
  const content = document.querySelector("#admin-content");
  const modalRoot = document.querySelector("#admin-modal-root");
  const state = { section: "dashboard", period: "30d", selected: new Set(), filters: { search: "", make: "", status: "", bodyType: "", fuel: "", location: "", featured: "", minYear: "", maxYear: "", minPrice: "", maxPrice: "", maxMileage: "", dateAdded: "", sort: "newest" }, expandedActivity: false };
  const clock = document.querySelector("[data-admin-clock]");
  const updateClock = () => { if (clock) clock.textContent = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()); };
  updateClock();
  setInterval(updateClock, 30000);

  function saveInventory(message = "Inventory saved.") {
    inventory = inventory.map(normalize);
    write("inventory", inventory);
    updateCounts();
    if (message) toast(message);
  }
  function updateCounts() {
    const counts = { vehicles: inventory.filter(v => v.status !== "Archived").length, orders: orders.filter(v => ["Reserved", "Processing"].includes(v.status)).length, leads: leads.filter(v => v.status === "New").length, notifications: notifications.filter(v => !v.read).length };
    Object.entries(counts).forEach(([key, value]) => document.querySelectorAll(`[data-nav-${key}]`).forEach(el => el.textContent = value));
  }
  function head(kicker, title, description, actions = "") {
    return `<div class="section-page-head"><div><span class="admin-kicker">${kicker}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="admin-head-actions">${actions}</div>` : ""}</div>`;
  }
  function chip(label, value, note = "") { return `<div class="summary-chip"><span>${label}</span><strong>${value}</strong>${note ? `<span>${note}</span>` : ""}</div>`; }
  function addActivity(text, icon = "•") {
    activity.unshift({ text, icon, createdAt: new Date().toISOString() });
    activity = activity.slice(0, 20);
    write("activity", activity);
  }
  function inventoryStatuses() { return statusList.reduce((map, status) => (map[status] = inventory.filter(v => v.status === status).length, map), {}); }
  function spark(index) {
    const points = Array.from({ length: 8 }, (_, i) => `${i * 10},${16 - ((i * (index + 2) * 7 + index * 5) % 14)}`).join(" ");
    return `<svg class="sparkline" viewBox="0 0 70 18" aria-hidden="true"><polyline points="${points}"></polyline></svg>`;
  }
  function kpi(label, value, trend, icon, note, index) {
    return `<article class="admin-card kpi-card"><div class="kpi-top"><span class="metric-label">${label}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-value-row"><strong class="kpi-value">${value}</strong><span class="kpi-trend">${trend}</span></div><div class="kpi-foot"><span>${note}</span>${spark(index)}</div></article>`;
  }
  function pointsFor(period) {
    const arrays = { "7d": [21, 31, 26, 42, 34, 51, 45], "30d": [28, 24, 40, 33, 52, 43, 61, 49, 72, 58], "90d": [25, 38, 30, 48, 41, 56, 49, 72, 63, 83, 74, 94], "1y": [24, 31, 36, 30, 43, 49, 44, 57, 61, 70, 75, 92] };
    const labels = period === "7d" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : period === "1y" ? ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"] : null;
    return arrays[period].map((value, i) => ({ label: labels?.[i] || `${period === "30d" ? "W" : "D"}${i + 1}`, revenue: value * 1420, orders: Math.max(1, Math.round(value / 16)), aov: 32000 + value * 170 }));
  }
  function chartMarkup() {
    const points = pointsFor(state.period), width = 620, height = 205;
    const max = Math.max(...points.map(p => p.revenue)) * 1.2;
    const makePath = values => values.map((value, i) => `${i ? "L" : "M"}${(29 + i * (width - 58) / Math.max(1, values.length - 1)).toFixed(1)},${(height - 12 - value / max * (height - 24)).toFixed(1)}`).join(" ");
    const path = makePath(points.map(p => p.revenue));
    const orderPath = makePath(points.map(p => p.orders * max / 8));
    const avgPath = makePath(points.map(p => p.aov * max / 65000));
    const grid = [0, 1, 2, 3].map(i => `<line class="chart-grid-line" x1="29" y1="${12 + i * 55}" x2="610" y2="${12 + i * 55}"></line>`).join("");
    const dots = points.map((point, i) => `<circle class="chart-point" cx="${29 + i * (width - 58) / Math.max(1, points.length - 1)}" cy="${height - 12 - point.revenue / max * (height - 24)}" r="3" data-chart-tip="${safe(point.label)}|${money(point.revenue)}|${point.orders} orders|AOV ${money(point.aov)}"></circle>`).join("");
    const labels = [0, Math.floor((points.length - 1) / 2), points.length - 1].map(i => `<text class="chart-label" x="${29 + i * (width - 58) / Math.max(1, points.length - 1)}" y="199" text-anchor="middle">${points[i].label}</text>`).join("");
    return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Revenue, order, average order value chart">${grid}<path class="chart-orders" d="${orderPath}"></path><path class="chart-aov" d="${avgPath}"></path><path class="chart-revenue" d="${path}"></path>${dots}${labels}</svg><div class="chart-tooltip" data-chart-tooltip></div></div>`;
  }
  function bindChart() {
    const wrap = document.querySelector(".chart-wrap"), tooltip = document.querySelector("[data-chart-tooltip]");
    wrap?.querySelectorAll("[data-chart-tip]").forEach(dot => {
      dot.addEventListener("mouseenter", () => { const [label, revenue, ordersValue, aov] = dot.dataset.chartTip.split("|"); tooltip.innerHTML = `<strong>${safe(label)} · ${safe(revenue)}</strong>${safe(ordersValue)}<br>${safe(aov)}`; tooltip.style.display = "block"; });
      dot.addEventListener("mousemove", event => { const box = wrap.getBoundingClientRect(); tooltip.style.left = `${event.clientX - box.left + 8}px`; tooltip.style.top = `${event.clientY - box.top - 48}px`; });
      dot.addEventListener("mouseleave", () => tooltip.style.display = "none");
    });
  }
  function horizontalBars(values) {
    const rows = Object.entries(values).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...rows.map(row => row[1]));
    return `<div class="horizontal-bars">${rows.map(([label, value]) => `<div class="horizontal-bar"><span>${safe(label)}</span><span class="horizontal-bar-track"><i style="width:${value / max * 100}%"></i></span><strong>${value}</strong></div>`).join("")}</div>`;
  }
  function dashboard() {
    const status = inventoryStatuses(), completed = orders.filter(o => ["Completed", "Sold"].includes(o.status));
    const revenue = completed.reduce((sum, o) => sum + Number(o.total || 0), 0) || 248650;
    const makes = inventory.reduce((map, v) => (map[v.make] = (map[v.make] || 0) + 1, map), {});
    const brandTop = Object.fromEntries(Object.entries(makes).sort((a, b) => b[1] - a[1]).slice(0, 5));
    const values = [
      ["Total vehicles", number(inventory.filter(v => v.status !== "Archived").length), "+8.2%", "▱", "vs. last month"],
      ["Available vehicles", number(status.Available), "+4.6%", "◧", "ready for the road"],
      ["Reserved", number(status.Reserved), "+12.4%", "⇄", "awaiting collection"],
      ["Sold", number(status.Sold + completed.length), "+6.1%", "✓", "all time"],
      ["Total sales", number(orders.length + 26), "+9.3%", "↗", "completed orders"],
      ["Monthly revenue", money(revenue), "+14.8%", "$", "vs. last month"],
      ["Website visitors", number(read("visitor-count", 12842)), "+7.6%", "◎", "last 30 days"],
      ["Conversion rate", "3.84%", "+0.6%", "⌁", "vs. last month"],
      ["Favorites", number(read("favorites", []).length + 128), "+11.2%", "♥", "across inventory"],
      ["Active leads", number(leads.filter(lead => lead.status !== "Closed").length), "+3.4%", "⌑", "need a response"]
    ];
    const actions = `<button class="admin-primary" data-action="add-vehicle">＋ Add vehicle</button><span class="admin-date-label">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>`;
    const colors = ["#67b9d5", "#e6b66b", "#818f88", "#8b94de", "#a98cc9", "#59645e"], statuses = statusList;
    const perimeter = 2 * Math.PI * 42; let offset = 0;
    const ring = statuses.map((name, i) => { const part = status[name] / Math.max(1, inventory.length); const svg = `<circle class="donut-segment" cx="50" cy="50" r="42" stroke="${colors[i]}" stroke-dasharray="${Math.max(0, part * perimeter - 2)} ${perimeter}" stroke-dashoffset="${-offset}"></circle>`; offset += part * perimeter; return svg; }).join("");
    const legend = statuses.map((name, i) => `<span class="legend-item"><i style="background:${colors[i]}"></i>${name}<strong>${status[name]}</strong></span>`).join("");
    const activityRows = activity.slice(0, state.expandedActivity ? 10 : 5).map(item => `<div class="activity-item"><span class="activity-icon">${safe(item.icon || "•")}</span><div class="activity-copy">${safe(item.text)}<time>${ago(item.createdAt)}</time></div></div>`).join("");
    content.innerHTML = `${head("COMMAND OVERVIEW", "Good morning, Alex.", "Here’s what’s happening across your marketplace today.", actions)}<section class="admin-grid kpi-grid">${values.map((item, i) => kpi(...item, i)).join("")}</section><section class="admin-grid dashboard-main-grid"><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">REVENUE PERFORMANCE</span><h2>Sales at a glance</h2><p>Revenue, orders, and average order value</p></div><div class="period-switch">${[["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["1y", "1 year"]].map(([key, label]) => `<button class="${state.period === key ? "is-active" : ""}" data-period="${key}">${label}</button>`).join("")}</div></div><div class="revenue-summary"><span><span><i></i>Revenue</span><strong>${money(revenue)}</strong></span><span><span><i></i>Orders</span><strong>${number(orders.length + 24)}</strong></span><span><span><i></i>Avg. order</span><strong>${money(Math.round(revenue / Math.max(1, completed.length + 4)))}</strong></span></div>${chartMarkup()}</article><div class="overview-side"><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">INVENTORY MIX</span><h2>Stock status</h2></div><button class="row-action" data-section="inventory">↗</button></div><div class="status-donut-row"><div class="donut-chart"><svg viewBox="0 0 100 100"><circle class="donut-track" cx="50" cy="50" r="42"></circle>${ring}</svg><div class="donut-center"><strong>${inventory.length}</strong><span>vehicles</span></div></div><div class="legend-list">${legend}</div></div></article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">TOP MAKES</span><h2>Brand mix</h2></div></div><div class="inventory-bars">${Object.entries(brandTop).map(([make, count]) => `<div class="inventory-bar-row"><span>${safe(make)}</span><span class="inventory-bar-track"><i style="width:${count / Math.max(1, ...Object.values(brandTop)) * 100}%"></i></span><strong>${count}</strong></div>`).join("")}</div></article></div></section><section class="admin-grid dashboard-lower-grid"><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">AT A GLANCE</span><h2>Recent activity</h2><p>Signals from across your storefront</p></div><span class="preview-pill"><i></i> LIVE</span></div><div class="activity-list">${activityRows}</div><div class="activity-footer"><button data-activity-toggle>${state.expandedActivity ? "Show less" : "View activity stream →"}</button></div></article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">MAKE IT HAPPEN</span><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><div class="quick-action-grid"><button class="quick-action" data-action="add-vehicle"><span>＋</span>Add vehicle</button><button class="quick-action" data-action="promotion"><span>✳</span>Create promotion</button><button class="quick-action" data-section="homepage"><span>▧</span>Edit homepage</button><button class="quick-action" data-section="orders"><span>⇄</span>View orders</button><button class="quick-action" data-section="leads"><span>⌑</span>View leads</button><button class="quick-action" data-action="notification"><span>♧</span>Send notification</button><button class="quick-action" data-section="vehicles"><span>◧</span>Manage inventory</button><button class="quick-action" data-action="promotion"><span>↗</span>New campaign</button></div></article></section>`;
    content.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => { state.period = button.dataset.period; dashboard(); bindChart(); }));
    content.querySelector("[data-activity-toggle]")?.addEventListener("click", () => { state.expandedActivity = !state.expandedActivity; dashboard(); bindChart(); });
    content.querySelector(".quick-action-grid")?.insertAdjacentHTML("beforeend", `<button class="quick-action" data-action="banner"><span>▧</span>Add homepage banner</button>`);
    bindChart();
  }

  function tableFilters() {
    const makes = [...new Set(inventory.map(v => v.make))].sort();
    const bodies = [...new Set(inventory.map(v => v.bodyType))].sort();
    const fuels = [...new Set(inventory.map(v => v.fuel))].sort();
    const locations = [...new Set(inventory.map(v => v.location))].sort();
    return `<form class="section-toolbar" id="inventory-filters"><div class="toolbar-left"><label class="admin-search-control"><span>⌕</span><input name="search" type="search" placeholder="Search make, model, stock #" value="${safe(state.filters.search)}"></label><select class="admin-control" name="make"><option value="">All makes</option>${makes.map(v => `<option ${state.filters.make === v ? "selected" : ""}>${safe(v)}</option>`).join("")}</select><select class="admin-control" name="status"><option value="">All statuses</option>${statusList.map(v => `<option ${state.filters.status === v ? "selected" : ""}>${v}</option>`).join("")}</select><select class="admin-control" name="bodyType"><option value="">All body types</option>${bodies.map(v => `<option ${state.filters.bodyType === v ? "selected" : ""}>${safe(v)}</option>`).join("")}</select><select class="admin-control" name="fuel"><option value="">All fuel</option>${fuels.map(v => `<option ${state.filters.fuel === v ? "selected" : ""}>${safe(v)}</option>`).join("")}</select><select class="admin-control" name="location"><option value="">All locations</option>${locations.map(v => `<option ${state.filters.location === v ? "selected" : ""}>${safe(v)}</option>`).join("")}</select></div><div class="toolbar-right"><select class="admin-control" name="featured"><option value="">Any feature status</option><option value="yes" ${state.filters.featured === "yes" ? "selected" : ""}>Featured</option><option value="no" ${state.filters.featured === "no" ? "selected" : ""}>Not featured</option></select><select class="admin-control" name="dateAdded"><option value="">Any date added</option><option value="7" ${state.filters.dateAdded === "7" ? "selected" : ""}>Last 7 days</option><option value="30" ${state.filters.dateAdded === "30" ? "selected" : ""}>Last 30 days</option></select><select class="admin-control" name="sort"><option value="newest">Newest added</option><option value="price-low" ${state.filters.sort === "price-low" ? "selected" : ""}>Price: low to high</option><option value="price-high" ${state.filters.sort === "price-high" ? "selected" : ""}>Price: high to low</option><option value="year" ${state.filters.sort === "year" ? "selected" : ""}>Year: newest</option><option value="mileage" ${state.filters.sort === "mileage" ? "selected" : ""}>Mileage: lowest</option></select><button type="reset" class="admin-quiet">Reset</button></div><div class="toolbar-left advanced-filter-row"><input class="admin-control" name="minYear" type="number" placeholder="Year from" value="${safe(state.filters.minYear)}"><input class="admin-control" name="maxYear" type="number" placeholder="Year to" value="${safe(state.filters.maxYear)}"><input class="admin-control" name="minPrice" type="number" placeholder="Min price" value="${safe(state.filters.minPrice)}"><input class="admin-control" name="maxPrice" type="number" placeholder="Max price" value="${safe(state.filters.maxPrice)}"><input class="admin-control" name="maxMileage" type="number" placeholder="Max mileage" value="${safe(state.filters.maxMileage)}"></div></form>`;
  }
  function filteredVehicles() {
    const f = state.filters;
    const result = inventory.filter(v => {
      const match = (a, b) => !b || String(a || "").toLowerCase().includes(b.toLowerCase());
      const days = Number(f.dateAdded), fresh = !days || Date.now() - new Date(v.createdAt).getTime() <= days * 86400000;
      return match(`${v.make} ${v.model} ${v.trim} ${v.stockNumber} ${v.vin}`, f.search) && match(v.make, f.make) && match(v.status, f.status) && match(v.bodyType, f.bodyType) && match(v.fuel, f.fuel) && match(v.location, f.location) && (!f.featured || v.featured === (f.featured === "yes")) && (!f.minYear || v.year >= Number(f.minYear)) && (!f.maxYear || v.year <= Number(f.maxYear)) && (!f.minPrice || v.price >= Number(f.minPrice)) && (!f.maxPrice || v.price <= Number(f.maxPrice)) && (!f.maxMileage || v.mileage <= Number(f.maxMileage)) && fresh;
    });
    const sort = { newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt), "price-low": (a, b) => a.price - b.price, "price-high": (a, b) => b.price - a.price, year: (a, b) => b.year - a.year, mileage: (a, b) => a.mileage - b.mileage };
    return result.sort(sort[f.sort] || sort.newest);
  }
  function vehicleRows(rows) {
    if (!rows.length) return `<tr><td colspan="9" class="empty-table">No vehicles match those filters.</td></tr>`;
    return rows.map(v => `<tr><td><input type="checkbox" data-select-vehicle="${safe(v.id)}" ${state.selected.has(v.id) ? "checked" : ""} aria-label="Select vehicle"></td><td><div class="vehicle-table-name"><span class="vehicle-thumb" style="background-image:url('${safe(photo(v.images[0]))}')"></span><span class="vehicle-name-copy"><strong>${v.year} ${safe(v.make)} ${safe(v.model)}</strong><small>${safe(v.trim)} · ${safe(v.stockNumber)}</small></span></div></td><td>${money(v.price)}${v.originalPrice > v.price ? `<small> −${money(v.originalPrice - v.price)}</small>` : ""}</td><td>${number(v.mileage)} mi</td><td>${safe(v.location)}</td><td><select class="inline-status" data-change-status="${safe(v.id)}">${statusList.map(status => `<option ${v.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></td><td>${v.featured ? '<span class="featured-badge">★ Featured</span>' : '<span class="neutral-badge">Standard</span>'}</td><td>${stamp(v.createdAt)}</td><td><div class="row-actions"><button class="row-action" data-edit="${safe(v.id)}" title="Edit">✎</button><button class="row-action" data-duplicate="${safe(v.id)}" title="Duplicate">▣</button><button class="row-action" data-feature="${safe(v.id)}" title="Toggle featured">${v.featured ? "★" : "☆"}</button><button class="row-action" data-archive="${safe(v.id)}" title="Archive or restore">${v.status === "Archived" ? "↩" : "⌑"}</button><button class="row-action" data-delete="${safe(v.id)}" title="Delete">×</button></div></td></tr>`).join("");
  }
  function renderInventoryTable() {
    const rows = filteredVehicles();
    const body = document.querySelector("#inventory-table-body");
    if (body) body.innerHTML = vehicleRows(rows);
    const count = document.querySelector("[data-inventory-count]");
    if (count) count.textContent = `${rows.length} of ${inventory.length} vehicles`;
    const bulk = document.querySelector("#bulk-bar");
    if (bulk) { bulk.hidden = !state.selected.size; bulk.querySelector("[data-selected-count]").textContent = `${state.selected.size} selected`; }
    const all = document.querySelector("[data-select-all]");
    if (all) all.checked = rows.length > 0 && rows.every(v => state.selected.has(v.id));
  }
  function vehicleManager() {
    const isInventory = state.section === "inventory";
    content.innerHTML = `${head(isInventory ? "STOCK OPERATIONS" : "VEHICLE CATALOG", isInventory ? "Inventory control" : "Vehicle management", isInventory ? "Review stock health, listing readiness, and availability." : "Manage every listing across your marketplace.", `<button class="admin-secondary" data-export="vehicles">↓ Export</button><button class="admin-primary" data-action="add-vehicle">＋ Add vehicle</button>`)}${tableFilters()}<div class="table-footer"><span data-inventory-count></span><span>Changes save automatically in this browser.</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="Select visible vehicles"></th><th>Vehicle / Stock</th><th>Sale price</th><th>Mileage</th><th>Location</th><th>Status</th><th>Placement</th><th>Date added</th><th>Actions</th></tr></thead><tbody id="inventory-table-body"></tbody></table></div><div class="bulk-bar" id="bulk-bar" hidden><span data-selected-count>0 selected</span><div class="bulk-bar-actions"><button class="admin-secondary" data-bulk="feature">Mark featured</button><button class="admin-secondary" data-bulk="unfeature">Remove featured</button><button class="admin-secondary" data-bulk="status">Change status</button><button class="admin-secondary" data-bulk="location">Change location</button><button class="admin-secondary" data-bulk="discount">Apply discount</button><button class="admin-secondary" data-bulk="archive">Archive</button><button class="admin-danger" data-bulk="delete">Delete</button><button class="row-action" data-clear-selection>×</button></div></div>`;
    const form = document.querySelector("#inventory-filters");
    form.addEventListener("input", event => { if (event.target.name in state.filters) state.filters[event.target.name] = event.target.value; renderInventoryTable(); });
    form.addEventListener("change", event => { if (event.target.name in state.filters) state.filters[event.target.name] = event.target.value; renderInventoryTable(); });
    form.addEventListener("reset", () => setTimeout(() => { Object.keys(state.filters).forEach(k => state.filters[k] = k === "sort" ? "newest" : ""); renderInventoryTable(); }, 0));
    renderInventoryTable();
  }
  function inventoryOverview() {
    const statuses = inventoryStatuses();
    const countBy = key => inventory.reduce((map, item) => (map[item[key]] = (map[item[key]] || 0) + 1, map), {});
    const prices = { "Under $35k": 0, "$35k–$60k": 0, "$60k–$100k": 0, "$100k+": 0 };
    inventory.forEach(v => { prices[v.price < 35000 ? "Under $35k" : v.price < 60000 ? "$35k–$60k" : v.price < 100000 ? "$60k–$100k" : "$100k+"]++; });
    const locations = inventory.reduce((map, v) => { const region = v.location.split(",").pop().trim(); map[region] = (map[region] || 0) + 1; return map; }, {});
    content.innerHTML = `${head("STOCK OPERATIONS", "Inventory control", "A live read on stock composition and listing health.", `<button class="admin-secondary" data-section="vehicles">Manage vehicles ↗</button>`)}<div class="summary-strip">${chip("Total stock", inventory.length, "all statuses")}${chip("Sellable", statuses.Available, "available now")}${chip("Needs attention", statuses.Draft + statuses.Pending, "draft or pending")}${chip("Inventory value", money(inventory.reduce((sum, v) => sum + v.price, 0)), "asking-price total")}</div><div class="admin-grid analytics-grid"><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">BODY STYLES</span><h2>Vehicles by body type</h2></div></div>${horizontalBars(countBy("bodyType"))}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">POWERTRAIN</span><h2>Vehicles by fuel</h2></div></div>${horizontalBars(countBy("fuel"))}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">PRICE POSITIONING</span><h2>Vehicles by price range</h2></div></div>${horizontalBars(prices)}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">GEOGRAPHY</span><h2>Vehicles by location</h2></div></div>${horizontalBars(locations)}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">AVAILABILITY</span><h2>Vehicles by status</h2></div></div>${horizontalBars(statuses)}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">LISTING HEALTH</span><h2>Homepage readiness</h2></div></div>${horizontalBars({ Featured: inventory.filter(v => v.featured).length, Discounted: inventory.filter(v => v.price < v.originalPrice).length, Draft: statuses.Draft, Archived: statuses.Archived })}</article></div>`;
  }
  function analyticsPage() {
    const points = pointsFor(state.period), brands = inventory.reduce((map, v) => (map[v.make] = (map[v.make] || 0) + 1, map), {});
    content.innerHTML = `${head("PERFORMANCE", "Marketplace analytics", "Explore revenue, demand, and inventory composition.", `<div class="period-switch">${[["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["1y", "1 year"]].map(([key, label]) => `<button data-period="${key}" class="${state.period === key ? "is-active" : ""}">${label}</button>`).join("")}</div>`)}<div class="admin-grid analytics-grid"><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">REVENUE · ORDERS · AOV</span><h2>Sales performance</h2></div></div><div class="revenue-summary"><span><span><i></i>Revenue</span><strong>${money(points.reduce((s, p) => s + p.revenue, 0))}</strong></span><span><span><i></i>Orders</span><strong>${points.reduce((s, p) => s + p.orders, 0)}</strong></span><span><span><i></i>Avg. order</span><strong>${money(Math.round(points.reduce((s, p) => s + p.aov, 0) / points.length))}</strong></span></div>${chartMarkup()}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">BRAND MIX</span><h2>Inventory by brand</h2></div></div>${horizontalBars(brands)}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">STATUS MIX</span><h2>Availability</h2></div></div>${horizontalBars(inventoryStatuses())}</article><article class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">CONVERSION FUNNEL</span><h2>Visit to reservation</h2></div></div>${horizontalBars({ Visitors: read("visitor-count", 12842), Favorites: read("favorites", []).length + 128, "Vehicle details": 1860, Leads: leads.length + 34, Reservations: orders.length + 27 })}</article></div>`;
    content.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => { state.period = button.dataset.period; analyticsPage(); }));
    bindChart();
  }
  function ordersPage() {
    content.innerHTML = `${head("CUSTOMER TRANSACTIONS", "Orders", "Track reservations and follow each vehicle through its sale.", `<button class="admin-secondary" data-export="orders">↓ Export orders</button>`)}<div class="summary-strip">${chip("All orders", orders.length)}${chip("Reserved", orders.filter(o => o.status === "Reserved").length)}${chip("Processing", orders.filter(o => o.status === "Processing").length)}${chip("Completed revenue", money(orders.filter(o => o.status === "Completed").reduce((s, o) => s + Number(o.total), 0)))}</div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Vehicle</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>${orders.map(o => `<tr><td>${safe(o.reference)}</td><td>${safe(o.name)}</td><td>${(o.items || []).map(id => { const v = inventory.find(item => item.id === id); return v ? `${v.year} ${safe(v.make)} ${safe(v.model)}` : safe(id); }).join(", ")}</td><td>${money(o.total)}</td><td><select class="inline-status" data-order-status="${safe(o.reference)}">${["Reserved", "Processing", "Completed", "Cancelled"].map(status => `<option ${status === o.status ? "selected" : ""}>${status}</option>`).join("")}</select></td><td>${stamp(o.createdAt)}</td></tr>`).join("") || '<tr><td colspan="6" class="empty-table">No reservations yet.</td></tr>'}</tbody></table></div>`;
  }
  function customersPage() {
    content.innerHTML = `${head("CUSTOMER RELATIONSHIPS", "Customers", "A unified view of buyers and returning visitors.", `<button class="admin-secondary" data-export="customers">↓ Export</button>`)}<div class="section-toolbar"><label class="admin-search-control"><span>⌕</span><input type="search" data-customer-search placeholder="Search customers"></label><span class="filter-count">${customers.length} customer profiles</span></div><div class="entity-grid">${customers.map(c => `<article class="entity-card customer-card" data-find="${safe(`${c.name} ${c.email} ${c.city}`.toLowerCase())}"><span class="admin-kicker">${safe(c.id)}</span><h3>${safe(c.name)}</h3><p>${safe(c.email)}</p><p>${safe(c.city)}</p><div class="entity-meta"><span>${c.orders} orders</span><strong>${money(c.total)}</strong></div></article>`).join("")}</div>`;
    content.querySelector("[data-customer-search]").addEventListener("input", event => content.querySelectorAll(".customer-card").forEach(card => card.hidden = !card.dataset.find.includes(event.target.value.toLowerCase())));
  }
  function leadsPage() {
    content.innerHTML = `${head("INBOUND INTEREST", "Leads", "Respond to inquiries, test-drive requests, and seller opportunities.", `<button class="admin-secondary" data-export="leads">↓ Export</button>`)}<div class="summary-strip">${chip("All leads", leads.length)}${chip("New", leads.filter(l => l.status === "New").length)}${chip("Contacted", leads.filter(l => l.status === "Contacted").length)}${chip("Qualified", leads.filter(l => l.status === "Qualified").length)}</div><div class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">FOLLOW-UP QUEUE</span><h2>Recent inquiries</h2></div></div>${leads.map(lead => `<div class="lead-card"><span class="lead-avatar">${safe(lead.name[0])}</span><div class="lead-copy"><strong>${safe(lead.name)} <span class="neutral-badge">${safe(lead.interest)}</span></strong><small>${safe(lead.email)} · ${safe(lead.vehicle || "General inquiry")} · ${ago(lead.createdAt)}</small></div><div class="lead-actions"><select data-lead-status="${safe(lead.id)}">${["New", "Contacted", "Qualified", "Closed"].map(status => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}</select><button class="row-action" data-delete-lead="${safe(lead.id)}">×</button></div></div>`).join("") || '<p class="empty-table">No leads yet.</p>'}</div>`;
  }
  function promotionsPage() {
    content.innerHTML = `${head("STOREFRONT CAMPAIGNS", "Promotions", "Manage campaign moments, discount events, and promotional codes.", `<button class="admin-primary" data-action="promotion">＋ Create promotion</button>`)}<div class="summary-strip">${chip("Campaigns", promotions.length)}${chip("Active", promotions.filter(p => p.active).length)}${chip("Promo codes", promotions.filter(p => p.code).length)}${chip("Banners", promotions.filter(p => p.type === "Banner").length)}</div><div class="entity-grid">${promotions.map(p => `<article class="entity-card"><div class="panel-heading"><span class="featured-badge">${p.active ? "● Active" : "Paused"}</span><div class="row-actions"><button class="row-action" data-toggle-promo="${safe(p.id)}">${p.active ? "Ⅱ" : "▶"}</button><button class="row-action" data-edit-promo="${safe(p.id)}">✎</button><button class="row-action" data-delete-promo="${safe(p.id)}">×</button></div></div><span class="admin-kicker">${safe(p.type)}</span><h3>${safe(p.name)}</h3><p>${safe(p.value)}</p><div class="entity-meta"><span>${safe(p.code || "No code")}</span><span>Until ${safe(p.expires || "No end date")}</span></div></article>`).join("")}</div>`;
  }
  function homepagePage() {
    content.innerHTML = `${head("STOREFRONT STUDIO", "Homepage builder", "Shape the first impression shoppers see when they visit MotorVault.", `<a class="admin-secondary" href="index.html" target="_blank">↗ Preview website</a>`)}<div class="editor-layout"><div><form class="editor-section" id="homepage-form"><span class="panel-kicker">01 · HERO STORY</span><h2>Homepage hero</h2><p>Preview your edits on the right, then publish them to the storefront.</p><label class="setting-field">Headline, first line<input name="heroTitle" maxlength="40" value="${safe(home.heroTitle)}" required></label><label class="setting-field">Headline, emphasis line<input name="heroEmphasis" maxlength="40" value="${safe(home.heroEmphasis)}" required></label><label class="setting-field">Supporting text<textarea name="heroSubtitle" maxlength="180" required>${safe(home.heroSubtitle)}</textarea></label><div class="admin-form-grid"><label class="setting-field">Button label<input name="buttonText" value="${safe(home.buttonText)}"></label><label class="setting-field">Button destination<select name="buttonUrl"><option value="vehicles.html">Browse vehicles</option><option value="about.html" ${home.buttonUrl === "about.html" ? "selected" : ""}>About</option><option value="contact.html" ${home.buttonUrl === "contact.html" ? "selected" : ""}>Contact</option></select></label></div><label class="setting-field">Hero image URL<input name="heroImage" value="${safe(home.heroImage)}" placeholder="Optional image URL"></label><button class="admin-primary" type="submit">Publish homepage changes ↗</button></form><section class="editor-section"><span class="panel-kicker">02 · FEATURED COLLECTION</span><h2>Featured vehicles</h2><p>Use the star in Vehicle Management to curate the homepage shortlist.</p><div class="inventory-bars">${inventory.filter(v => v.featured && v.status === "Available").slice(0, 6).map(v => `<div class="inventory-bar-row"><span>${v.year} ${safe(v.make)} ${safe(v.model)}</span><span class="inventory-bar-track"><i style="width:100%"></i></span><strong>★</strong></div>`).join("") || '<span class="filter-count">No available vehicles are featured.</span>'}</div><button class="admin-secondary" data-section="vehicles">Manage featured vehicles ↗</button></section></div><aside><div class="home-preview"><div class="home-preview-image" ${home.heroImage ? `style="background-image:linear-gradient(90deg,#090c0cce,#090c0c26),url('${safe(home.heroImage)}')"` : ""}></div><div class="home-preview-content"><span class="admin-kicker"><i></i> LIVE STOREFRONT PREVIEW</span><h3><span data-preview-title>${safe(home.heroTitle)}</span><br><em data-preview-emphasis>${safe(home.heroEmphasis)}</em></h3><p data-preview-subtitle>${safe(home.heroSubtitle)}</p><a class="admin-primary" data-preview-button href="${safe(home.buttonUrl)}">${safe(home.buttonText)} ↗</a></div></div><section class="editor-section"><span class="panel-kicker">ACTIVE CAMPAIGNS</span><h2>Promotion placement</h2>${promotions.filter(p => p.active).map(p => `<div class="promo-preview"><strong>${safe(p.name)}</strong><span>${safe(p.value)}</span></div>`).join("") || "No active promotions."}<button class="admin-quiet" data-section="promotions">Manage campaigns ↗</button></section></aside></div>`;
    const form = content.querySelector("#homepage-form");
    form.addEventListener("input", () => {
      const values = Object.fromEntries(new FormData(form));
      content.querySelector("[data-preview-title]").textContent = values.heroTitle;
      content.querySelector("[data-preview-emphasis]").textContent = values.heroEmphasis;
      content.querySelector("[data-preview-subtitle]").textContent = values.heroSubtitle;
      const button = content.querySelector("[data-preview-button]"); button.textContent = `${values.buttonText} ↗`; button.href = values.buttonUrl;
      if (values.heroImage) { const previewImage = /^https?:\/\//i.test(values.heroImage) ? values.heroImage : `https://images.unsplash.com/${values.heroImage}?auto=format&fit=crop&w=900&q=82`; content.querySelector(".home-preview-image").style.backgroundImage = `linear-gradient(90deg,#090c0cce,#090c0c26),url('${previewImage}')`; }
    });
  }
  function contentPage() {
    const copy = read("site-copy", { tagline: "Find Your Next Drive.", about: "A more considered way to find your next car.", footer: "Good cars. Clear choices. Better drives start here." });
    content.innerHTML = `${head("STOREFRONT STUDIO", "Content", "Manage the supporting voice and public message for your marketplace.")}<div class="editor-layout"><form class="editor-section" id="content-form"><span class="panel-kicker">BRAND COPY</span><h2>Storefront messaging</h2><label class="setting-field">Tagline<input name="tagline" value="${safe(copy.tagline)}"></label><label class="setting-field">About introduction<textarea name="about">${safe(copy.about)}</textarea></label><label class="setting-field">Footer statement<textarea name="footer">${safe(copy.footer)}</textarea></label><button class="admin-primary">Save content</button></form><div class="admin-panel"><span class="panel-kicker">STOREFRONT CONTENT</span><h2>Content status</h2><p class="filter-count">Changes are stored in this browser and are not published to a server.</p>${chip("Homepage", "Published")}${chip("About page", "Published")}</div></div>`;
  }
  function reviewsPage() {
    const avg = reviews.reduce((sum, r) => sum + Number(r.rating), 0) / Math.max(1, reviews.length);
    content.innerHTML = `${head("CUSTOMER VOICE", "Reviews", "Review and curate feedback shown in this marketplace.", `<button class="admin-secondary" data-action="add-review">＋ Add sample review</button>`)}<div class="summary-strip">${chip("Reviews", reviews.length)}${chip("Published", reviews.filter(r => r.status === "Published").length)}${chip("Pending", reviews.filter(r => r.status === "Pending").length)}${chip("Average rating", `${avg.toFixed(1)} / 5`)}</div><div class="entity-grid">${reviews.map(r => `<article class="entity-card"><div class="panel-heading"><span class="featured-badge">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span><select class="inline-status" data-review-status="${safe(r.id)}"><option ${r.status === "Published" ? "selected" : ""}>Published</option><option ${r.status === "Pending" ? "selected" : ""}>Pending</option><option ${r.status === "Hidden" ? "selected" : ""}>Hidden</option></select></div><p>“${safe(r.text)}”</p><h3>${safe(r.name)}</h3><small>${safe(r.vehicle)} · ${safe(r.date)}</small><button class="row-action" data-delete-review="${safe(r.id)}">×</button></article>`).join("")}</div>`;
  }
  function notificationsPage() {
    content.innerHTML = `${head("SYSTEM MESSAGES", "Notifications", "Internal alerts and marketplace announcements.", `<button class="admin-primary" data-action="notification">＋ Send notification</button>`)}<div class="admin-panel"><div class="panel-heading"><div><span class="panel-kicker">ADMIN INBOX</span><h2>${notifications.filter(n => !n.read).length} unread notifications</h2></div><button class="admin-quiet" data-mark-read>Mark all read</button></div>${notifications.map(n => `<div class="notification-row ${n.read ? "" : "unread"}"><span class="notification-mark">♧</span><div><p><strong>${safe(n.title)}</strong> — ${safe(n.body)}</p><small>${ago(n.createdAt)}</small></div><button class="row-action" data-delete-notification="${safe(n.id)}">×</button></div>`).join("")}</div>`;
  }
  function settingsPage() {
    const settings = read("admin-settings", { name: "Alex Morgan", email: "alex@motorvault.example", timeout: "30" });
    content.innerHTML = `${head("CONTROL CENTER", "Settings", "Configure your administrator workspace.")}<div class="editor-layout"><form class="editor-section" id="settings-form"><span class="panel-kicker">ADMIN PROFILE</span><h2>Workspace preferences</h2><label class="setting-field">Display name<input name="name" value="${safe(settings.name)}"></label><label class="setting-field">Email<input name="email" type="email" value="${safe(settings.email)}"></label><label class="setting-field">Session timeout<select name="timeout"><option value="30">30 minutes</option><option value="60" ${settings.timeout === "60" ? "selected" : ""}>1 hour</option></select></label><button class="admin-primary">Save preferences</button></form><section class="editor-section"><span class="panel-kicker">preview DATA</span><h2>Browser storage</h2><p>Inventory, reservations, inquiries, and preferences stay in this browser only. preview authentication is not production security.</p><button class="admin-danger" data-reset-preview>Reset workspace data</button></section></div>`;
  }
  function renderSection(section) {
    state.section = section;
    state.selected.clear();
    document.querySelectorAll("[data-admin-section]").forEach(button => button.classList.toggle("is-active", button.dataset.adminSection === section));
    const names = { dashboard: "Dashboard", analytics: "Analytics", vehicles: "Vehicles", inventory: "Inventory", orders: "Orders", customers: "Customers", leads: "Leads", promotions: "Promotions", homepage: "Homepage Builder", content: "Content", reviews: "Reviews", notifications: "Notifications", settings: "Settings" };
    document.querySelector("[data-current-section]").textContent = names[section] || "Dashboard";
    document.querySelector("#admin-sidebar").classList.remove("is-open");
    ({ dashboard, analytics: analyticsPage, vehicles: vehicleManager, inventory: inventoryOverview, orders: ordersPage, customers: customersPage, leads: leadsPage, promotions: promotionsPage, homepage: homepagePage, content: contentPage, reviews: reviewsPage, notifications: notificationsPage, settings: settingsPage }[section] || dashboard)();
    content.focus({ preventScroll: true });
  }
  function openModal(title, description, body, small = false) {
    modalRoot.innerHTML = `<div class="admin-modal-backdrop" data-modal-backdrop><section class="admin-modal ${small ? "modal-small" : ""}" role="dialog" aria-modal="true"><header class="admin-modal-head"><div><span class="admin-kicker">MOTORVAULT CONTROL</span><h2>${title}</h2><p>${description}</p></div><button class="modal-close" data-close-modal aria-label="Close">×</button></header>${body}</section></div>`;
    modalRoot.querySelector("[data-close-modal]").focus();
  }
  function closeModal() { modalRoot.innerHTML = ""; }
  function vehicleForm(v = null) {
    const editing = Boolean(v);
    v ||= { year: 2026, make: "", model: "", trim: "", price: "", originalPrice: "", mileage: 0, fuel: "Gasoline", transmission: "Automatic", drivetrain: "AWD", bodyType: "SUVs", color: "", interiorColor: "Black", location: "", vin: "", stockNumber: "", condition: "Used", status: "Draft", description: "", features: [], safetyFeatures: [], horsepower: 0, engine: "", images: [], featured: false, badge: "" };
    openModal(editing ? "Edit vehicle listing" : "Add a vehicle", "Update the listing details and marketplace availability.", `<form class="admin-form" id="vehicle-form" data-edit-id="${editing ? safe(v.id) : ""}"><div class="admin-form-grid"><span class="form-section-label">Vehicle identity</span><label>Make<input name="make" value="${safe(v.make)}" required></label><label>Model<input name="model" value="${safe(v.model)}" required></label><label>Year<input name="year" type="number" value="${v.year}" required></label><label>Trim<input name="trim" value="${safe(v.trim)}"></label><label>Stock number<input name="stockNumber" value="${safe(v.stockNumber)}"></label><label>VIN / chassis number<input name="vin" value="${safe(v.vin)}"></label><span class="form-section-label">Pricing and condition</span><label>Sale price ($)<input name="price" type="number" min="0" value="${v.price}" required></label><label>Original price ($)<input name="originalPrice" type="number" min="0" value="${v.originalPrice || v.price}"></label><label>Mileage<input name="mileage" type="number" min="0" value="${v.mileage}"></label><label>Condition<input name="condition" value="${safe(v.condition)}"></label><label>Status<select name="status">${statusList.map(s => `<option ${v.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Badge text<input name="badge" value="${safe(v.badge)}"></label><span class="form-section-label">Specifications</span><label>Fuel<select name="fuel">${["Gasoline", "Hybrid", "Electric", "Diesel", "Plug-in Hybrid"].map(s => `<option ${v.fuel === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Transmission<select name="transmission">${["Automatic", "Manual", "CVT"].map(s => `<option ${v.transmission === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Drivetrain<select name="drivetrain">${["AWD", "FWD", "RWD", "4WD"].map(s => `<option ${v.drivetrain === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Body type<input name="bodyType" value="${safe(v.bodyType)}"></label><label>Exterior color<input name="color" value="${safe(v.color)}"></label><label>Interior color<input name="interiorColor" value="${safe(v.interiorColor)}"></label><label>Horsepower<input name="horsepower" type="number" value="${v.horsepower}"></label><label class="span-two">Engine<input name="engine" value="${safe(v.engine)}"></label><label class="span-three">Location<input name="location" value="${safe(v.location)}" required></label><span class="form-section-label">Description and media</span><label class="span-three">Description<textarea name="description" required>${safe(v.description)}</textarea></label><label>Features <small>One per line</small><textarea name="features">${safe(v.features.join("\n"))}</textarea></label><label>Safety features <small>One per line</small><textarea name="safetyFeatures">${safe(v.safetyFeatures.join("\n"))}</textarea></label><label>Images <small>Unsplash IDs or image URLs, one per line</small><textarea name="images">${safe(v.images.join("\n"))}</textarea></label><label class="form-checkbox"><input type="checkbox" name="featured" ${v.featured ? "checked" : ""}> Feature on homepage</label></div><div class="admin-modal-actions"><button type="button" class="admin-secondary" data-close-modal>Cancel</button><button type="submit" class="admin-primary">${editing ? "Save changes" : "Create listing"} ↗</button></div></form>`);
  }
  function promotionForm(p = null) {
    const editing = Boolean(p); p ||= { name: "", code: "", type: "Banner", value: "", expires: "", active: true };
    openModal(editing ? "Edit promotion" : "Create a promotion", "Add a campaign moment or discount event.", `<form class="admin-form" id="promotion-form" data-id="${editing ? safe(p.id) : ""}"><div class="admin-form-grid"><label class="span-two">Campaign name<input name="name" value="${safe(p.name)}" required></label><label>Type<select name="type">${["Banner", "Price event", "Promo code", "Seasonal campaign"].map(t => `<option ${p.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label>Promo code<input name="code" value="${safe(p.code)}"></label><label class="span-two">Offer description<input name="value" value="${safe(p.value)}" required></label><label>End date<input name="expires" type="date" value="${safe(p.expires)}"></label><label class="form-checkbox"><input type="checkbox" name="active" ${p.active ? "checked" : ""}> Activate now</label></div><div class="admin-modal-actions"><button type="button" class="admin-secondary" data-close-modal>Cancel</button><button class="admin-primary">Save promotion</button></div></form>`, true);
  }
  function actionModal(kind) {
    if (kind === "add-vehicle") return vehicleForm();
    if (kind === "promotion" || kind === "campaign" || kind === "banner") return promotionForm();
    if (kind === "homepage") return renderSection("homepage");
    if (kind === "orders" || kind === "leads" || kind === "inventory") return renderSection(kind);
    if (kind === "notification") return openModal("Send a notification", "Create an internal alert for this workspace.", `<form class="admin-form" id="notification-form"><div class="admin-form-grid"><label class="span-three">Title<input name="title" required></label><label class="span-three">Message<textarea name="body" required></textarea></label></div><div class="admin-modal-actions"><button type="button" class="admin-secondary" data-close-modal>Cancel</button><button class="admin-primary">Send notification</button></div></form>`, true);
    if (kind === "add-review") return openModal("Add a sample review", "Add a customer review to the content queue.", `<form class="admin-form" id="review-form"><div class="admin-form-grid"><label>Name<input name="name" required></label><label>Rating<select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Vehicle<input name="vehicle" required></label><label class="span-three">Review<textarea name="text" required></textarea></label></div><div class="admin-modal-actions"><button type="button" class="admin-secondary" data-close-modal>Cancel</button><button class="admin-primary">Add review</button></div></form>`, true);
  }
  function duplicate(id) {
    const v = inventory.find(item => item.id === id); if (!v) return;
    const copy = structuredClone(v); copy.id = `mv-${Date.now().toString(36)}`; copy.stockNumber = `MV-D${String(Date.now()).slice(-5)}`; copy.vin = `preview${String(Date.now()).slice(-8)}`; copy.model = `${v.model} (Copy)`; copy.status = "Draft"; copy.featured = false; copy.badge = "Draft copy"; copy.createdAt = new Date().toISOString();
    inventory.unshift(copy); saveInventory("Vehicle duplicated as a draft."); addActivity(`${v.make} ${v.model} duplicated as draft`, "▣"); renderSection("vehicles");
  }
  function deleteVehicle(id) {
    const v = inventory.find(item => item.id === id); if (!v || !confirm(`Delete ${v.year} ${v.make} ${v.model}? This cannot be undone.`)) return;
    inventory = inventory.filter(item => item.id !== id); state.selected.delete(id); saveInventory("Vehicle deleted."); addActivity(`${v.make} ${v.model} removed from inventory`, "×"); renderSection("vehicles");
  }
  function archiveVehicle(id) {
    const v = inventory.find(item => item.id === id); if (!v) return;
    v.status = v.status === "Archived" ? "Available" : "Archived"; saveInventory(v.status === "Archived" ? "Vehicle archived." : "Vehicle restored."); addActivity(`${v.make} ${v.model} ${v.status === "Archived" ? "archived" : "restored"}`, "⌑"); renderSection(state.section);
  }
  function bulkAction(action) {
    if (!state.selected.size) return;
    if (["delete", "archive"].includes(action)) {
      const verb = action === "delete" ? "permanently delete" : "archive";
      if (!confirm(`${verb} ${state.selected.size} selected vehicles?`)) return;
      if (action === "delete") inventory = inventory.filter(v => !state.selected.has(v.id));
      else inventory.forEach(v => { if (state.selected.has(v.id)) v.status = "Archived"; });
      state.selected.clear(); saveInventory(`Selected vehicles ${action === "delete" ? "deleted" : "archived"}.`); renderSection("vehicles"); return;
    }
    if (["feature", "unfeature"].includes(action)) {
      inventory.forEach(v => { if (state.selected.has(v.id)) v.featured = action === "feature"; });
      state.selected.clear(); saveInventory("Featured placement updated."); renderSection("vehicles"); return;
    }
    const field = action === "status" ? `<label class="setting-field">Status<select name="value">${statusList.map(s => `<option>${s}</option>`).join("")}</select></label>` : action === "location" ? `<label class="setting-field">Location<input name="value" required></label>` : `<label class="setting-field">Discount (%)<input name="value" type="number" min="1" max="90" value="5" required></label>`;
    openModal(action === "status" ? "Change status" : action === "location" ? "Change location" : "Apply discount", `Apply this change to ${state.selected.size} selected vehicles.`, `<form class="admin-form" id="bulk-form" data-kind="${action}">${field}<div class="admin-modal-actions"><button type="button" class="admin-secondary" data-close-modal>Cancel</button><button class="admin-primary">Apply</button></div></form>`, true);
  }
  function downloadCsv(rows, name) {
    if (!rows.length) return toast("Nothing to export yet.");
    const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const csv = [keys.join(","), ...rows.map(row => keys.map(key => `"${String(Array.isArray(row[key]) ? row[key].join("; ") : row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); toast(`${name} downloaded.`);
  }

  document.addEventListener("click", event => {
    const openSection = event.target.closest("[data-open-section]");
    if (openSection) { renderSection(openSection.dataset.openSection); return; }
    const section = event.target.closest("[data-admin-section], [data-section]");
    if (section) { renderSection(section.dataset.adminSection || section.dataset.section); return; }
    if (event.target.closest("[data-logout]")) return logout();
    if (event.target.closest("[data-sidebar-toggle]")) return document.querySelector("#admin-sidebar").classList.toggle("is-open");
    if (event.target.closest("[data-theme-toggle]")) { document.body.classList.toggle("light-mode"); localStorage.setItem("motorvault-admin-theme", document.body.classList.contains("light-mode") ? "light" : "dark"); event.target.closest("[data-theme-toggle]").querySelector("b").textContent = document.body.classList.contains("light-mode") ? "Light" : "Dark"; return; }
    if (event.target.closest("[data-quick-add]")) return vehicleForm();
    const action = event.target.closest("[data-action]"); if (action) return actionModal(action.dataset.action);
    const edit = event.target.closest("[data-edit]"); if (edit) return vehicleForm(inventory.find(v => v.id === edit.dataset.edit));
    const duplicateButton = event.target.closest("[data-duplicate]"); if (duplicateButton) return duplicate(duplicateButton.dataset.duplicate);
    const deleteButton = event.target.closest("[data-delete]"); if (deleteButton) return deleteVehicle(deleteButton.dataset.delete);
    const archive = event.target.closest("[data-archive]"); if (archive) return archiveVehicle(archive.dataset.archive);
    const feature = event.target.closest("[data-feature]"); if (feature) { const v = inventory.find(item => item.id === feature.dataset.feature); v.featured = !v.featured; saveInventory(v.featured ? "Vehicle featured." : "Vehicle removed from featured."); addActivity(`${v.make} ${v.model} ${v.featured ? "featured" : "unfeatured"}`, "★"); return renderSection("vehicles"); }
    const check = event.target.closest("[data-select-vehicle]"); if (check) { check.checked ? state.selected.add(check.dataset.selectVehicle) : state.selected.delete(check.dataset.selectVehicle); return renderInventoryTable(); }
    if (event.target.closest("[data-select-all]")) { const rows = filteredVehicles(); rows.forEach(v => event.target.checked ? state.selected.add(v.id) : state.selected.delete(v.id)); return renderInventoryTable(); }
    const bulk = event.target.closest("[data-bulk]"); if (bulk) return bulkAction(bulk.dataset.bulk);
    if (event.target.closest("[data-clear-selection]")) { state.selected.clear(); return renderInventoryTable(); }
    const togglePromo = event.target.closest("[data-toggle-promo]"); if (togglePromo) { const p = promotions.find(item => item.id === togglePromo.dataset.togglePromo); p.active = !p.active; write("promotions", promotions); return renderSection("promotions"); }
    const editPromo = event.target.closest("[data-edit-promo]"); if (editPromo) return promotionForm(promotions.find(item => item.id === editPromo.dataset.editPromo));
    const deletePromo = event.target.closest("[data-delete-promo]"); if (deletePromo && confirm("Delete this promotion?")) { promotions = promotions.filter(item => item.id !== deletePromo.dataset.deletePromo); write("promotions", promotions); return renderSection("promotions"); }
    const delLead = event.target.closest("[data-delete-lead]"); if (delLead && confirm("Remove this lead?")) { leads = leads.filter(item => item.id !== delLead.dataset.deleteLead); write("leads", leads); updateCounts(); return renderSection("leads"); }
    const delReview = event.target.closest("[data-delete-review]"); if (delReview && confirm("Delete this review?")) { reviews = reviews.filter(item => item.id !== delReview.dataset.deleteReview); write("reviews", reviews); return renderSection("reviews"); }
    const delNotification = event.target.closest("[data-delete-notification]"); if (delNotification) { notifications = notifications.filter(item => item.id !== delNotification.dataset.deleteNotification); write("admin-notifications", notifications); updateCounts(); return renderSection("notifications"); }
    if (event.target.closest("[data-mark-read]")) { notifications = notifications.map(n => ({ ...n, read: true })); write("admin-notifications", notifications); updateCounts(); return renderSection("notifications"); }
    const exportButton = event.target.closest("[data-export]"); if (exportButton) { const tables = { vehicles: [inventory, "motorvault-inventory.csv"], orders: [orders, "motorvault-orders.csv"], leads: [leads, "motorvault-leads.csv"], customers: [customers, "motorvault-customers.csv"] }; return downloadCsv(...tables[exportButton.dataset.export]); }
    if (event.target.closest("[data-reset-preview]") && confirm("Reset local inventory and workspace settings in this browser?")) { ["inventory", "orders", "homepage", "customers", "leads", "promotions", "activity", "admin-notifications", "reviews", "site-copy"].forEach(k => localStorage.removeItem(storageKey(k))); location.reload(); }
    if (event.target.closest("[data-close-modal]") || event.target.matches("[data-modal-backdrop]")) closeModal();
  });
  document.addEventListener("change", event => {
    const statusControl = event.target.closest("[data-change-status]");
    if (statusControl) { const v = inventory.find(item => item.id === statusControl.dataset.changeStatus); v.status = statusControl.value; saveInventory(`${v.make} ${v.model} marked ${v.status.toLowerCase()}.`); addActivity(`${v.make} ${v.model} status changed to ${v.status}`, "↻"); renderInventoryTable(); }
    const orderControl = event.target.closest("[data-order-status]");
    if (orderControl) { const order = orders.find(o => o.reference === orderControl.dataset.orderStatus); order.status = orderControl.value; write("orders", orders); if (["Completed", "Sold"].includes(order.status)) { const ids = new Set(order.items || []); inventory.forEach(v => { if (ids.has(v.id)) v.status = "Sold"; }); saveInventory("Order completed; vehicle marked sold."); } addActivity(`Order ${order.reference} moved to ${order.status}`, "⇄"); toast("Order status updated."); }
    const leadControl = event.target.closest("[data-lead-status]"); if (leadControl) { const lead = leads.find(l => l.id === leadControl.dataset.leadStatus); lead.status = leadControl.value; write("leads", leads); updateCounts(); toast("Lead status updated."); }
    const reviewControl = event.target.closest("[data-review-status]"); if (reviewControl) { const review = reviews.find(r => r.id === reviewControl.dataset.reviewStatus); review.status = reviewControl.value; write("reviews", reviews); toast("Review visibility updated."); }
  });
  document.addEventListener("submit", event => {
    const form = event.target;
    if (form.matches("#vehicle-form")) {
      event.preventDefault(); const values = Object.fromEntries(new FormData(form));
      const split = value => String(value || "").split(/[\n,]/).map(item => item.trim()).filter(Boolean);
      const old = inventory.find(v => v.id === form.dataset.editId); const sale = Number(values.price), original = Number(values.originalPrice || sale);
      const item = normalize({ ...old, ...values, id: old?.id || `mv-${Date.now().toString(36)}`, price: sale, originalPrice: original, discount: original > sale ? Math.round((1 - sale / original) * 100) : 0, year: Number(values.year), mileage: Number(values.mileage), horsepower: Number(values.horsepower), features: split(values.features), safetyFeatures: split(values.safetyFeatures), images: split(values.images), featured: new FormData(form).get("featured") === "on", createdAt: old?.createdAt || new Date().toISOString(), stockNumber: values.stockNumber || `MV-${String(Date.now()).slice(-5)}` }, inventory.length);
      if (old) inventory = inventory.map(v => v.id === old.id ? item : v); else inventory.unshift(item);
      saveInventory(old ? "Vehicle listing updated." : "Vehicle added to inventory."); addActivity(`${item.make} ${item.model} ${old ? "listing updated" : "added to inventory"}`, old ? "✎" : "＋"); closeModal(); renderSection("vehicles"); return;
    }
    if (form.matches("#bulk-form")) {
      event.preventDefault(); const value = new FormData(form).get("value");
      inventory.forEach(v => { if (!state.selected.has(v.id)) return; if (form.dataset.kind === "status") v.status = value; if (form.dataset.kind === "location") v.location = value; if (form.dataset.kind === "discount") { v.originalPrice = Math.max(v.originalPrice, v.price); v.discount = Number(value); v.price = Math.round(v.originalPrice * (1 - v.discount / 100)); } });
      state.selected.clear(); saveInventory("Bulk inventory changes applied."); closeModal(); renderSection("vehicles"); return;
    }
    if (form.matches("#promotion-form")) {
      event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const item = { ...values, id: form.dataset.id || `PR-${Date.now().toString().slice(-5)}`, active: new FormData(form).get("active") === "on" };
      if (form.dataset.id) promotions = promotions.map(p => p.id === item.id ? item : p); else promotions.unshift(item);
      write("promotions", promotions); closeModal(); renderSection("promotions"); toast("Promotion saved."); return;
    }
    if (form.matches("#homepage-form")) { event.preventDefault(); home = Object.fromEntries(new FormData(form)); write("homepage", home); addActivity("Homepage hero was updated", "✎"); toast("Homepage changes published to the storefront."); return; }
    if (form.matches("#notification-form")) { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); notifications.unshift({ ...values, id: `NT-${Date.now()}`, createdAt: new Date().toISOString(), read: false }); write("admin-notifications", notifications); closeModal(); updateCounts(); renderSection("notifications"); toast("Notification added to inbox."); return; }
    if (form.matches("#review-form")) { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); reviews.unshift({ ...values, id: `RV-${Date.now()}`, rating: Number(values.rating), status: "Pending", date: new Date().toISOString().slice(0, 10) }); write("reviews", reviews); closeModal(); return renderSection("reviews"); }
    if (form.matches("#content-form")) { event.preventDefault(); write("site-copy", Object.fromEntries(new FormData(form))); toast("Storefront copy saved."); return; }
    if (form.matches("#settings-form")) { event.preventDefault(); write("admin-settings", Object.fromEntries(new FormData(form))); toast("Workspace preferences saved."); }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector("[data-global-search]").focus(); }
    if (event.key === "Enter" && event.target.matches("[data-global-search]") && event.target.value.trim()) { const term = event.target.value.trim(); state.filters.search = term; renderSection("vehicles"); const input = document.querySelector("#inventory-filters [name=search]"); input.value = term; input.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  document.addEventListener("input", event => {
    if (event.target.matches("[data-global-search]")) event.target.closest(".admin-search").classList.toggle("is-open", Boolean(event.target.value));
  });
  window.addEventListener("storage", event => {
    if (!["motorvault-inventory", "motorvault-orders", "motorvault-leads", "motorvault-customers", "motorvault-admin-notifications"].includes(event.key)) return;
    if (event.key === "motorvault-inventory") inventory = (read("inventory", [])).map(normalize);
    if (event.key === "motorvault-orders") orders = read("orders", []);
    if (event.key === "motorvault-leads") leads = read("leads", []);
    if (event.key === "motorvault-customers") customers = read("customers", []);
    if (event.key === "motorvault-admin-notifications") notifications = read("admin-notifications", []);
    updateCounts(); renderSection(state.section);
  });

  if (localStorage.getItem("motorvault-admin-theme") === "light") {
    document.body.classList.add("light-mode");
    const label = document.querySelector("[data-theme-toggle] b"); if (label) label.textContent = "Light";
  }
  updateCounts();
  renderSection("dashboard");
})();
