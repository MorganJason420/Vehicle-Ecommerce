(() => {
	const vehicles = (() => {
		try {
			const managed = JSON.parse(localStorage.getItem("motorvault-inventory"));
			const catalog = Array.isArray(managed) ? managed : (window.MOTORVAULT_VEHICLES || []);
			return catalog.filter(vehicle => !vehicle.status || vehicle.status === "Available");
		} catch { return window.MOTORVAULT_VEHICLES || []; }
	})();
	const store = {
		get(key, fallback = []) {
			try { return JSON.parse(localStorage.getItem(`motorvault-${key}`)) || fallback; }
			catch { return fallback; }
		},
		set(key, value) { localStorage.setItem(`motorvault-${key}`, JSON.stringify(value)); }
	};
	const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
	const image = (id, width = 900) => {
		if (!id) return `https://images.unsplash.com/photo-1492144534655-ae79c964cdd8?auto=format&fit=crop&w=${width}&q=85`;
		if (/^https?:\/\//i.test(id)) { try { return new URL(id).href; } catch { return ""; } }
		return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
	};
	const byId = id => vehicles.find(vehicle => vehicle.id === id);
	const query = new URLSearchParams(location.search);
	const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
	const favorites = () => store.get("favorites");
	const compareList = () => store.get("compare");
	const cart = () => store.get("cart");

	function mountShell() {
		const header = document.querySelector("#site-header");
		if (header) header.innerHTML = `
			<header class="site-header"><div class="nav-wrap">
				<a class="brand" href="index.html" aria-label="MotorVault home"><span class="brand-mark">M</span><span>MOTOR<span>VAULT</span></span></a>
				<button class="menu-toggle icon-button" aria-label="Open menu" aria-expanded="false" data-menu-toggle><span></span><span></span></button>
				<nav class="main-nav" aria-label="Main navigation"><a href="index.html">Home</a><a href="vehicles.html">Browse Vehicles</a><a href="compare.html">Compare</a><a href="favorites.html">Favorites <span class="nav-count" data-favorites-count>0</span></a><a href="about.html">About</a><a href="contact.html">Contact</a></nav>
				<div class="nav-actions"><a class="icon-button search-link" href="vehicles.html" aria-label="Search vehicles" title="Search vehicles">⌕</a><a class="icon-button cart-link" href="cart.html" aria-label="Shopping cart" title="Cart">▱<span class="nav-count" data-cart-count>0</span></a><a class="button button-small button-outline nav-sell" href="contact.html#sell">Sell Your Vehicle <span>↗</span></a></div>
			</div></header>`;
		const footer = document.querySelector("#site-footer");
		if (footer) footer.innerHTML = `<footer class="site-footer"><div class="footer-main"><a class="brand" href="index.html"><span class="brand-mark">M</span><span>MOTOR<span>VAULT</span></span></a><p>Good cars. Clear choices.<br>Better drives start here.</p><div class="footer-links"><a href="vehicles.html">Browse inventory</a><a href="about.html">Our story</a><a href="contact.html">Contact</a><a href="favorites.html">Saved vehicles</a></div><div class="footer-news"><span class="eyebrow">THE MOTORVAULT NOTE</span><p>Considered cars, straight to your inbox.</p><form data-newsletter><label class="sr-only" for="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required><button aria-label="Subscribe">→</button></form><span class="form-note" data-newsletter-note></span></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} MotorVault. Demo marketplace.</span><span>Designed for the road ahead.</span></div></footer>`;
		const siteCopy = store.get("site-copy", {});
		const footerCopy = footer?.querySelector(".footer-main > p");
		if (footerCopy && siteCopy.footer) footerCopy.textContent = siteCopy.footer;
		updateCounts();
	}

	function updateCounts() {
		document.querySelectorAll("[data-favorites-count]").forEach(el => { el.textContent = favorites().length; });
		document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = cart().length; });
	}

	 function isFavorite(id) { return favorites().includes(id); }
	function setFavorite(id) {
		const list = favorites();
		store.set("favorites", list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
		const saved = isFavorite(id);
		document.querySelectorAll(`[data-favorite="${id}"]`).forEach(button => {
			button.classList.toggle("is-active", saved);
			button.setAttribute("aria-pressed", String(saved));
			button.setAttribute("aria-label", `${saved ? "Remove from" : "Add to"} favorites`);
			if (button.closest(".detail-buy")) button.textContent = saved ? "♥ Saved to favorites" : "♡ Save to favorites";
		});
		if (document.body.dataset.page === "favorites") renderFavorites();
		updateCounts();
	}
	function setCompare(id) {
		const list = compareList();
		if (list.includes(id)) store.set("compare", list.filter(item => item !== id));
		else if (list.length >= 4) { showToast("Compare up to four vehicles at a time."); return; }
		else store.set("compare", [...list, id]);
		const active = compareList().includes(id);
		document.querySelectorAll(`[data-compare="${id}"]`).forEach(button => {
			button.classList.toggle("is-active", active);
			button.setAttribute("aria-pressed", String(active));
			button.textContent = button.closest(".detail-buy") ? (active ? "✓ In comparison" : "+ Add to compare") : (active ? "✓ Added" : "+ Compare");
		});
		if (document.body.dataset.page === "compare") renderCompare();
		updateCounts();
	}
	function showToast(message) {
		let toast = document.querySelector(".toast");
		if (!toast) { toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.append(toast); }
		toast.textContent = message;
		toast.classList.add("is-visible");
		clearTimeout(showToast.timer);
		showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
	}
	function card(vehicle) {
		const saved = isFavorite(vehicle.id);
		const compareActive = compareList().includes(vehicle.id);
		return `<article class="vehicle-card">
			<div class="vehicle-card-image"><a href="vehicle-details.html?id=${encodeURIComponent(vehicle.id)}" aria-label="View ${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}"><img src="${image(vehicle.images[0], 900)}" alt="${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}" loading="lazy"></a>
				${vehicle.featured ? '<span class="vehicle-badge">EDITOR’S PICK</span>' : `<span class="vehicle-condition">${escapeHtml(vehicle.condition)}</span>`}
				<button class="favorite-button ${saved ? "is-active" : ""}" type="button" data-favorite="${vehicle.id}" aria-label="${saved ? "Remove from" : "Add to"} favorites" aria-pressed="${saved}">♥</button>
			</div><div class="vehicle-card-body"><div class="vehicle-card-heading"><div><span class="vehicle-year">${vehicle.year} · ${escapeHtml(vehicle.trim)}</span><h3><a href="vehicle-details.html?id=${encodeURIComponent(vehicle.id)}">${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</a></h3></div><strong class="vehicle-price">${vehicle.originalPrice > vehicle.price ? `<del>${money(vehicle.originalPrice)}</del>` : ""}${money(vehicle.price)}${vehicle.originalPrice > vehicle.price ? `<small> −${Math.round((1 - vehicle.price / vehicle.originalPrice) * 100)}%</small>` : ""}</strong></div>
				<div class="vehicle-meta"><span>${vehicle.mileage.toLocaleString()} mi</span><span>${escapeHtml(vehicle.fuel)}</span><span>${escapeHtml(vehicle.transmission)}</span></div><div class="vehicle-monthly">Est. ${money(monthlyPayment(vehicle.price * .9, .079, 72))}/mo <span>with 10% down</span></div>
				<div class="vehicle-card-foot"><span class="vehicle-location">⌖ ${escapeHtml(vehicle.location)}</span><div class="card-actions"><button class="compare-button ${compareActive ? "is-active" : ""}" type="button" data-compare="${vehicle.id}" aria-pressed="${compareActive}">${compareActive ? "✓ Added" : "+ Compare"}</button><a class="text-link" href="vehicle-details.html?id=${encodeURIComponent(vehicle.id)}">Details <span>↗</span></a></div></div>
			</div></article>`;
	}

	function renderCards(target, list) {
		const element = typeof target === "string" ? document.querySelector(target) : target;
		if (!element) return;
		element.innerHTML = list.length ? list.map(card).join("") : `<div class="empty-inline"><p>No vehicles match those filters.</p><a class="text-link" href="vehicles.html">Clear your search ↗</a></div>`;
	}

	function searchUrl(form) {
		const params = new URLSearchParams(new FormData(form));
		[...params.entries()].forEach(([key, value]) => { if (!value) params.delete(key); });
		location.href = `vehicles.html${params.size ? `?${params}` : ""}`;
	}

	function renderHome() {
		try {
			const content = JSON.parse(localStorage.getItem("motorvault-homepage")) || {};
			const heroTitle = document.querySelector(".hero-content h1");
			const heroSubtitle = document.querySelector(".hero-content > p");
			const heroImage = document.querySelector(".hero-image");
			const heroButton = document.querySelector(".hero-actions .button-primary");
			const heroEyebrow = document.querySelector(".hero-content .eyebrow");
			const siteCopy = JSON.parse(localStorage.getItem("motorvault-site-copy")) || {};
			if (heroEyebrow && siteCopy.tagline) heroEyebrow.innerHTML = `<i></i>${escapeHtml(siteCopy.tagline.toUpperCase())}`;
			if (heroTitle && (content.heroTitle || content.heroEmphasis)) heroTitle.innerHTML = `${escapeHtml(content.heroTitle || "Find Your")}<br><em>${escapeHtml(content.heroEmphasis || "Next Drive.")}</em>`;
			if (heroSubtitle && content.heroSubtitle) heroSubtitle.textContent = content.heroSubtitle;
			if (heroButton && content.buttonText) { heroButton.innerHTML = `${escapeHtml(content.buttonText)} <span>↗</span>`; heroButton.href = content.buttonUrl || "vehicles.html"; }
			if (heroImage && content.heroImage) heroImage.style.backgroundImage = `url("${/^https?:\/\//i.test(content.heroImage) ? content.heroImage : image(content.heroImage, 2200)}")`;
		} catch { /* Keep the bundled homepage copy when local settings are unavailable. */ }
		renderCards("#featured-grid", vehicles.filter(vehicle => vehicle.featured).slice(0, 6));
		renderCards("#latest-grid", vehicles.slice().sort((a, b) => b.year - a.year || a.mileage - b.mileage).slice(0, 4));
		const makeSelect = document.querySelector("#search-make");
		if (makeSelect) [...new Set(vehicles.map(vehicle => vehicle.make))].sort().forEach(make => makeSelect.insertAdjacentHTML("beforeend", `<option>${escapeHtml(make)}</option>`));
	}

	function renderListings() {
		const form = document.querySelector("#filter-form");
		if (!form) return;
		const makeField = form.elements.namedItem("make");
		[...new Set(vehicles.map(vehicle => vehicle.make))].sort().forEach(make => makeField.insertAdjacentHTML("beforeend", `<option>${escapeHtml(make)}</option>`));
		for (const [key, value] of query.entries()) { const field = form.elements.namedItem(key); if (field) field.value = value; }
		const state = { page: 1, sort: query.get("sort") || "recommended" };
		const grid = document.querySelector("#listing-grid");
		const count = document.querySelector("[data-result-count]");
		const sortSelect = document.querySelector("#sort-by");
		if (sortSelect) sortSelect.value = state.sort;
		const apply = () => {
			const values = Object.fromEntries(new FormData(form));
			let result = vehicles.filter(vehicle => {
				const contains = (field, value) => !value || String(field).toLowerCase().includes(String(value).toLowerCase());
				return contains(vehicle.make, values.make) && contains(vehicle.model, values.model) && (!values.minPrice || vehicle.price >= Number(values.minPrice)) && (!values.maxPrice || vehicle.price <= Number(values.maxPrice)) && (!values.minYear || vehicle.year >= Number(values.minYear)) && (!values.maxYear || vehicle.year <= Number(values.maxYear)) && contains(vehicle.bodyType, values.bodyType) && contains(vehicle.fuel, values.fuel) && contains(vehicle.transmission, values.transmission) && (!values.maxMileage || vehicle.mileage <= Number(values.maxMileage)) && contains(vehicle.location, values.location) && contains(`${vehicle.make} ${vehicle.model} ${vehicle.trim}`, values.q);
			});
			const comparators = { recommended: (a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price, priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, newest: (a, b) => b.year - a.year, mileage: (a, b) => a.mileage - b.mileage };
			result.sort(comparators[state.sort] || comparators.recommended);
			if (count) count.textContent = `${result.length} ${result.length === 1 ? "vehicle" : "vehicles"}`;
			const visible = result.slice(0, state.page * 9);
			if (grid) grid.innerHTML = visible.length ? visible.map(card).join("") : `<div class="empty-inline"><p>No vehicles match your search.</p><button class="text-link" type="button" data-clear-filters>Clear filters ↗</button></div>`;
			const more = document.querySelector("[data-load-more]");
			if (more) more.hidden = visible.length >= result.length;
			const searchInput = document.querySelector("#listing-search");
			if (searchInput && !searchInput.value) searchInput.value = values.q || "";
		};
		form.addEventListener("input", () => { state.page = 1; apply(); });
		form.addEventListener("change", () => { state.page = 1; apply(); });
		sortSelect?.addEventListener("change", () => { state.sort = sortSelect.value; apply(); });
		document.querySelector("#listing-search")?.addEventListener("input", event => { form.elements.namedItem("q").value = event.target.value; state.page = 1; apply(); });
		document.querySelector("[data-load-more]")?.addEventListener("click", () => { state.page += 1; apply(); });
		apply();
	}

	function renderDetails() {
		const vehicle = byId(query.get("id")) || vehicles[0];
		const host = document.querySelector("#vehicle-detail");
		if (!host) return;
		document.title = `${vehicle.year} ${vehicle.make} ${vehicle.model} | MOTORVAULT`;
		host.innerHTML = `<div class="detail-topline"><a href="vehicles.html" class="back-link">← Back to inventory</a><span class="eyebrow">${escapeHtml(vehicle.condition)} · STOCK ${escapeHtml(vehicle.stockNumber)}</span></div>
			<div class="detail-layout"><div class="gallery"><div class="gallery-main"><img id="gallery-main-image" src="${image(vehicle.images[0], 1500)}" alt="${vehicle.year} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}"></div><div class="gallery-thumbs">${vehicle.images.map((img, index) => `<button class="gallery-thumb ${index === 0 ? "is-active" : ""}" data-gallery-image="${image(img, 1500)}" aria-label="View photo ${index + 1}"><img src="${image(img, 280)}" alt=""></button>`).join("")}</div>
				<section class="detail-section overview-section"><span class="eyebrow">AT A GLANCE</span><h2>Overview</h2><div class="spec-grid"><div><span>Year</span><strong>${vehicle.year}</strong></div><div><span>Mileage</span><strong>${vehicle.mileage.toLocaleString()} mi</strong></div><div><span>Fuel</span><strong>${escapeHtml(vehicle.fuel)}</strong></div><div><span>Transmission</span><strong>${escapeHtml(vehicle.transmission)}</strong></div><div><span>Drivetrain</span><strong>${escapeHtml(vehicle.drivetrain)}</strong></div><div><span>Body style</span><strong>${escapeHtml(vehicle.bodyType)}</strong></div><div><span>Exterior</span><strong>${escapeHtml(vehicle.color)}</strong></div><div><span>Location</span><strong>${escapeHtml(vehicle.location)}</strong></div></div></section>
				<section class="detail-section"><span class="eyebrow">MADE FOR THE DRIVE</span><h2>Features</h2><ul class="check-list">${vehicle.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}</ul></section>
				<section class="detail-section"><span class="eyebrow">PEACE OF MIND</span><h2>Safety</h2><ul class="check-list">${vehicle.safetyFeatures.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}</ul></section>
				<section class="detail-section"><span class="eyebrow">THE DETAILS</span><h2>Vehicle description</h2><p>${escapeHtml(vehicle.description)}</p></section>
				<section class="detail-section seller-block"><span class="seller-avatar">${escapeHtml(vehicle.seller.slice(0, 1))}</span><div><span class="eyebrow">VERIFIED SELLER</span><h3>${escapeHtml(vehicle.seller)}</h3><p>${escapeHtml(vehicle.location)} · Vehicle history reviewed</p></div><a class="button button-outline" href="contact.html?vehicle=${encodeURIComponent(vehicle.id)}">Contact seller</a></section>
			</div><aside class="detail-buy"><span class="eyebrow">${vehicle.year} · ${escapeHtml(vehicle.trim)}</span><h1>${escapeHtml(vehicle.make)} <span>${escapeHtml(vehicle.model)}</span></h1><div class="detail-price">${money(vehicle.price)}</div><p class="payment-hint">Est. ${money(monthlyPayment(vehicle.price, 0.079, 72))}/mo · 7.9% APR for 72 months</p><div class="buy-specs"><span>${vehicle.mileage.toLocaleString()} miles</span><span>${escapeHtml(vehicle.fuel)}</span><span>${escapeHtml(vehicle.transmission)}</span></div><div class="buy-actions"><button class="button button-primary button-wide" data-add-cart="${vehicle.id}">Reserve this vehicle <span>↗</span></button><button class="button button-outline button-wide" data-favorite="${vehicle.id}">${isFavorite(vehicle.id) ? "♥ Saved to favorites" : "♡ Save to favorites"}</button><button class="compare-button detail-compare" data-compare="${vehicle.id}">${compareList().includes(vehicle.id) ? "✓ In comparison" : "+ Add to compare"}</button><a class="text-link" href="contact.html?vehicle=${encodeURIComponent(vehicle.id)}">Ask a question ↗</a><a class="text-link" href="contact.html?vehicle=${encodeURIComponent(vehicle.id)}#test-drive">Schedule a test drive ↗</a></div><div class="seller-note">✓ &nbsp;Verified listing <span>Secure demo reservation</span></div></aside></div>
			<section class="finance-section"><div><span class="eyebrow">PLAN YOUR PURCHASE</span><h2>Financing calculator</h2><p>A planning estimate, not a credit offer.</p></div><form id="finance-form" class="finance-fields"><label>Vehicle price<input name="price" type="number" value="${vehicle.price}" min="1"></label><label>Down payment<input name="down" type="number" value="${Math.round(vehicle.price * 0.1)}" min="0"></label><label>Interest rate (%)<input name="rate" type="number" value="7.9" min="0" step="0.1"></label><label>Loan term<select name="term"><option value="48">48 months</option><option value="60">60 months</option><option value="72" selected>72 months</option><option value="84">84 months</option></select></label><div class="finance-result"><span>ESTIMATED MONTHLY PAYMENT</span><strong data-monthly-result>${money(monthlyPayment(vehicle.price - Math.round(vehicle.price * 0.1), 0.079, 72))}</strong><small data-loan-summary></small></div></form></section>
			<section class="section similar-section"><div class="section-heading"><div><span class="eyebrow">IN THE SAME GARAGE</span><h2>Similar vehicles</h2></div><a class="text-link" href="vehicles.html">View all inventory ↗</a></div><div class="vehicle-grid" id="similar-grid"></div></section>`;
		if (vehicle.originalPrice > vehicle.price) document.querySelector(".detail-price").innerHTML = `<del>${money(vehicle.originalPrice)}</del>${money(vehicle.price)}<small>${Math.round((1 - vehicle.price / vehicle.originalPrice) * 100)}% off</small>`;
		renderCards("#similar-grid", vehicles.filter(item => item.id !== vehicle.id && item.bodyType === vehicle.bodyType).slice(0, 3));
	}

	function monthlyPayment(principal, rate, months) {
		const monthlyRate = rate / 12;
		return monthlyRate ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)) : principal / months;
	}

	function initFinance() {
		const form = document.querySelector("#finance-form");
		if (!form) return;
		const calculate = () => {
			const values = new FormData(form);
			const principal = Math.max(0, Number(values.get("price")) - Number(values.get("down")));
			const months = Number(values.get("term"));
			const rate = Number(values.get("rate")) / 100;
			const monthly = monthlyPayment(principal, rate, months);
			document.querySelector("[data-monthly-result]").textContent = money(monthly);
			document.querySelector("[data-loan-summary]").textContent = `${money(principal)} financed · ${money(monthly * months - principal)} estimated interest`;
		};
		form.addEventListener("input", calculate);
		calculate();
	}

	function renderFavorites() {
		const list = favorites().map(byId).filter(Boolean);
		const grid = document.querySelector("#favorites-grid");
		if (!grid) return;
		document.querySelector("[data-favorites-empty]").hidden = list.length > 0;
		grid.hidden = list.length === 0;
		renderCards(grid, list);
	}

	function renderCompare() {
		const selected = compareList().map(byId).filter(Boolean);
		const empty = document.querySelector("[data-compare-empty]");
		const table = document.querySelector("#compare-table-wrap");
		if (!table) return;
		empty.hidden = selected.length > 0;
		table.hidden = selected.length === 0;
		if (!selected.length) return;
		const rows = [["Price", v => money(v.price)], ["Year", v => v.year], ["Mileage", v => `${v.mileage.toLocaleString()} mi`], ["Fuel", v => v.fuel], ["Transmission", v => v.transmission], ["Drivetrain", v => v.drivetrain], ["Body type", v => v.bodyType], ["Horsepower", v => `${v.horsepower} hp`], ["Safety features", v => v.safetyFeatures.join(", ")], ["Features", v => v.features.join(", ")]];
		table.innerHTML = `<table class="compare-table"><thead><tr><th scope="col">Compare</th>${selected.map(v => `<th scope="col"><button class="remove-compare" data-remove-compare="${v.id}" aria-label="Remove ${escapeHtml(v.model)}">×</button><img src="${image(v.images[0], 400)}" alt=""><span>${v.year} ${escapeHtml(v.make)} ${escapeHtml(v.model)}</span><strong>${money(v.price)}</strong><a class="text-link" href="vehicle-details.html?id=${v.id}">View vehicle ↗</a></th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => { const different = new Set(selected.map(value)).size > 1; return `<tr><th scope="row">${label}</th>${selected.map(v => `<td class="${different ? "is-different" : ""}">${escapeHtml(value(v))}</td>`).join("")}</tr>`; }).join("")}</tbody></table>`;
	}

	function renderCart() {
		const host = document.querySelector("#cart-content");
		if (!host) return;
		const items = cart().map(byId).filter(Boolean);
		if (!items.length) { host.innerHTML = `<div class="empty-state"><span class="empty-mark">M</span><span class="eyebrow">YOUR GARAGE</span><h2>Your cart is taking a breather.</h2><p>When a vehicle catches your eye, reserve it here.</p><a class="button button-primary" href="vehicles.html">Browse vehicles ↗</a></div>`; return; }
		const subtotal = items.reduce((sum, vehicle) => sum + vehicle.price, 0);
		const taxes = Math.round(subtotal * 0.06);
		const fees = 395 * items.length;
		host.innerHTML = `<div class="cart-layout"><div class="cart-items"><div class="cart-head"><span>${items.length} unique vehicle${items.length === 1 ? "" : "s"}</span><a href="vehicles.html" class="text-link">Continue browsing ↗</a></div>${items.map(v => `<article class="cart-item"><a href="vehicle-details.html?id=${v.id}"><img src="${image(v.images[0], 420)}" alt="${v.year} ${escapeHtml(v.make)} ${escapeHtml(v.model)}"></a><div class="cart-item-info"><span class="eyebrow">${v.year} · ${escapeHtml(v.trim)}</span><h3><a href="vehicle-details.html?id=${v.id}">${escapeHtml(v.make)} ${escapeHtml(v.model)}</a></h3><span>${v.mileage.toLocaleString()} mi · ${escapeHtml(v.location)}</span><span class="unique-stock">Unique inventory · ${escapeHtml(v.stockNumber)}</span></div><strong>${money(v.price)}</strong><button class="remove-cart" data-remove-cart="${v.id}" aria-label="Remove ${escapeHtml(v.model)}">×</button></article>`).join("")}<p class="cart-note">Each listing is one unique vehicle. Quantity is fixed at one; duplicate reservations are prevented.</p></div><aside class="order-summary"><span class="eyebrow">ORDER SUMMARY</span><h2>Your reservation</h2><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Estimated taxes</span><strong>${money(taxes)}</strong></div><div><span>Documentation fee</span><strong>${money(fees)}</strong></div><div class="summary-total"><span>Estimated total</span><strong>${money(subtotal + taxes + fees)}</strong></div><a class="button button-primary button-wide" href="checkout.html">Proceed to checkout <span>↗</span></a><p>Taxes and fees are estimates for this demo.</p><span class="secure-note">⌑ &nbsp;Secure demo checkout</span></aside></div>`;
	}

	function renderCheckout() {
		const host = document.querySelector("#checkout-content");
		if (!host) return;
		const items = cart().map(byId).filter(Boolean);
		if (!items.length) { host.innerHTML = `<div class="empty-state"><span class="eyebrow">CHECKOUT</span><h2>Your cart is empty.</h2><p>Add a vehicle to begin your demo checkout.</p><a class="button button-primary" href="vehicles.html">Explore inventory ↗</a></div>`; return; }
		const subtotal = items.reduce((sum, vehicle) => sum + vehicle.price, 0);
		const total = subtotal + Math.round(subtotal * 0.06) + 395 * items.length;
		host.innerHTML = `<div class="checkout-layout"><form class="checkout-form" id="checkout-form"><section class="checkout-section"><span class="eyebrow">01 · YOUR DETAILS</span><h2>Contact information</h2><div class="form-grid"><label class="span-two">Full name<input name="name" autocomplete="name" required></label><label>Email address<input name="email" type="email" autocomplete="email" required></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" required></label></div></section><section class="checkout-section"><span class="eyebrow">02 · BILLING</span><h2>Billing information</h2><div class="form-grid"><label class="span-two">Street address<input name="address" autocomplete="street-address" required></label><label>City<input name="city" autocomplete="address-level2" required></label><label>State / region<input name="region" autocomplete="address-level1" required></label><label>Postal code<input name="postal" autocomplete="postal-code" required></label><label>Country<select name="country" autocomplete="country-name" required><option value="">Choose country</option><option>United States</option><option>Canada</option></select></label></div></section><section class="checkout-section"><span class="eyebrow">03 · DEMO PAYMENT</span><h2>Payment details</h2><div class="demo-callout"><span>DEMO MODE</span><p>No real payment will be collected. This form simulates a secure payment step entirely in your browser.</p></div><div class="form-grid"><label class="span-two">Name on card<input name="cardName" autocomplete="cc-name" required></label><label class="span-two">Card number<input name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" minlength="12" maxlength="19" required></label><label>Expiry date<input name="expiry" placeholder="MM / YY" autocomplete="cc-exp" required></label><label>Security code<input name="cvc" inputmode="numeric" autocomplete="cc-csc" maxlength="4" required></label></div></section><label class="consent-check"><input type="checkbox" required> I understand this is a demo reservation and no payment will be processed.</label><button class="button button-primary button-wide" type="submit">Place demo reservation · ${money(total)} <span>↗</span></button></form><aside class="checkout-summary"><span class="eyebrow">YOUR VEHICLES</span><h2>Order summary</h2>${items.map(v => `<div class="checkout-mini"><img src="${image(v.images[0], 220)}" alt=""><span>${v.year} ${escapeHtml(v.make)} ${escapeHtml(v.model)}</span><strong>${money(v.price)}</strong></div>`).join("")}<div class="summary-total"><span>Estimated total</span><strong>${money(total)}</strong></div><p>Including estimated tax and documentation fees.</p></aside></div>`;
	}

	function initPage() {
		const page = document.body.dataset.page;
		if (page === "home") renderHome();
		if (page === "vehicles") renderListings();
		if (page === "details") { renderDetails(); initFinance(); }
		if (page === "favorites") renderFavorites();
		if (page === "compare") renderCompare();
		if (page === "cart") renderCart();
		if (page === "checkout") renderCheckout();
		if (page === "about") {
			const siteCopy = store.get("site-copy", {});
			const aboutIntro = document.querySelector(".about-hero p");
			if (aboutIntro && siteCopy.about) aboutIntro.textContent = siteCopy.about;
		}
		if (page === "contact") {
			const vehicle = byId(query.get("vehicle"));
			const contactForm = document.querySelector("[data-contact-form]");
			contactForm.id = "test-drive";
			document.querySelector("#sell")?.removeAttribute("id");
			document.querySelector(".contact-form-wrap").id = "sell";
			if (vehicle) document.querySelector("[name=vehicle]").value = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
			if (location.hash === "#test-drive") document.querySelector("[name=topic]").value = "Scheduling a test drive";
			if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
		}
	}

	document.addEventListener("click", event => {
		const favorite = event.target.closest("[data-favorite]");
		const compare = event.target.closest("[data-compare]");
		const addCart = event.target.closest("[data-add-cart]");
		const removeCart = event.target.closest("[data-remove-cart]");
		const removeCompare = event.target.closest("[data-remove-compare]");
		const gallery = event.target.closest("[data-gallery-image]");
		if (favorite) setFavorite(favorite.dataset.favorite);
		else if (compare) setCompare(compare.dataset.compare);
		else if (addCart) {
			const id = addCart.dataset.addCart;
			const items = cart();
			if (items.includes(id)) showToast("This unique vehicle is already reserved in your cart.");
			else { store.set("cart", [...items, id]); updateCounts(); showToast("Vehicle added to your reservation."); }
		} else if (removeCart) { store.set("cart", cart().filter(id => id !== removeCart.dataset.removeCart)); renderCart(); updateCounts(); }
		else if (removeCompare) { store.set("compare", compareList().filter(id => id !== removeCompare.dataset.removeCompare)); renderCompare(); updateCounts(); }
		else if (gallery) { document.querySelector("#gallery-main-image").src = gallery.dataset.galleryImage; document.querySelectorAll(".gallery-thumb").forEach(item => item.classList.toggle("is-active", item === gallery)); }
		else if (event.target.closest("[data-clear-all-favorites]")) { store.set("favorites", []); renderFavorites(); updateCounts(); }
		else if (event.target.closest("[data-clear-all-compare]")) { store.set("compare", []); renderCompare(); updateCounts(); }
		else if (event.target.closest("[data-clear-filters]")) { const form = document.querySelector("#filter-form"); form?.reset(); form?.dispatchEvent(new Event("input", { bubbles: true })); }
	});

	document.addEventListener("submit", event => {
		if (event.target.matches("[data-vehicle-search]")) { event.preventDefault(); searchUrl(event.target); }
		if (event.target.matches("[data-newsletter]")) { event.preventDefault(); event.target.querySelector("button").disabled = true; document.querySelector("[data-newsletter-note]").textContent = "You're on the list. Thank you."; }
		if (event.target.matches("#checkout-form")) {
			event.preventDefault();
			const reference = `MV-${Date.now().toString().slice(-7)}`;
			const order = { reference, name: new FormData(event.target).get("name"), items: cart(), status: "Reserved", total: cart().map(byId).filter(Boolean).reduce((sum, vehicle) => sum + vehicle.price, 0), createdAt: new Date().toISOString() };
			store.set("last-order", order);
			store.set("orders", [order, ...store.get("orders")]);
			const checkoutValues = new FormData(event.target);
			const customers = store.get("customers");
			const email = String(checkoutValues.get("email") || "").toLowerCase();
			const existingCustomer = customers.find(customer => String(customer.email).toLowerCase() === email);
			if (existingCustomer) { existingCustomer.orders = Number(existingCustomer.orders || 0) + 1; existingCustomer.total = Number(existingCustomer.total || 0) + order.total; }
			else customers.unshift({ id: `CUS-${Date.now().toString().slice(-6)}`, name: checkoutValues.get("name"), email, city: `${checkoutValues.get("city")}, ${checkoutValues.get("region")}`, orders: 1, total: order.total, joined: new Date().toISOString().slice(0, 10) });
			store.set("customers", customers);
			try {
				const inventory = JSON.parse(localStorage.getItem("motorvault-inventory")) || window.MOTORVAULT_VEHICLES || [];
				const reservedIds = new Set(order.items);
				localStorage.setItem("motorvault-inventory", JSON.stringify(inventory.map(vehicle => reservedIds.has(vehicle.id) ? { ...vehicle, status: "Reserved" } : vehicle)));
			} catch { /* Checkout remains a local demo if inventory storage is unavailable. */ }
			store.set("cart", []);
			document.querySelector("#checkout-content").innerHTML = `<div class="success-state"><span class="success-mark">✓</span><span class="eyebrow">RESERVATION RECEIVED</span><h2>Thank you. The next drive is closer.</h2><p>Your demo reservation <strong>${escapeHtml(store.get("last-order", {}).reference)}</strong> is confirmed. No payment was charged.</p><a class="button button-primary" href="index.html">Return home ↗</a></div>`;
			updateCounts();
		}
		if (event.target.matches("[data-contact-form]")) {
			event.preventDefault();
			const values = new FormData(event.target);
			const lead = { id: `LD-${Date.now().toString().slice(-6)}`, name: values.get("name"), email: values.get("email"), interest: values.get("topic"), vehicle: values.get("vehicle") || "General inquiry", message: values.get("message"), status: "New", createdAt: new Date().toISOString() };
			const leads = JSON.parse(localStorage.getItem("motorvault-leads") || "[]");
			localStorage.setItem("motorvault-leads", JSON.stringify([lead, ...leads]));
			const notifications = JSON.parse(localStorage.getItem("motorvault-admin-notifications") || "[]");
			localStorage.setItem("motorvault-admin-notifications", JSON.stringify([{ id: `NT-${Date.now()}`, title: "New customer inquiry", body: `${lead.name} sent a ${lead.interest.toLowerCase()} inquiry.`, createdAt: lead.createdAt, read: false }, ...notifications]));
			event.target.innerHTML = `<div class="form-success"><strong>Message received.</strong><p>A MotorVault specialist will be in touch shortly in this demo.</p></div>`;
		}
	});

	document.addEventListener("click", event => {
		const toggle = event.target.closest("[data-menu-toggle]");
		if (toggle) { const nav = document.querySelector(".main-nav"); const open = nav.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open); }
		if (event.target.closest("[data-grid-view]")) { document.querySelector("#listing-grid")?.classList.remove("is-list"); document.querySelectorAll("[data-grid-view], [data-list-view]").forEach(button => button.classList.toggle("is-active", button.hasAttribute("data-grid-view"))); }
		if (event.target.closest("[data-list-view]")) { document.querySelector("#listing-grid")?.classList.add("is-list"); document.querySelectorAll("[data-grid-view], [data-list-view]").forEach(button => button.classList.toggle("is-active", button.hasAttribute("data-list-view"))); }
	});

	mountShell();
	initPage();
})();
