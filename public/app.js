let drugs = [];

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("docdata-theme", theme);
  const toggle = $("themeToggle");
  if (!toggle) return;
  const dark = theme === "dark";
  toggle.querySelector("span").textContent = dark ? "☀" : "☾";
  toggle.querySelector("b").textContent = dark ? "Clair" : "Sombre";
  toggle.setAttribute("aria-label", dark ? "Activer le thème clair" : "Activer le thème sombre");
}

const $ = (id) => document.getElementById(id);

setTheme(localStorage.getItem("docdata-theme") || "light");

async function loadData() {
  try {
    console.log("[DEBUG] Chargement de /api/drogues...");
    const response = await fetch("/api/drogues");
    console.log("[DEBUG] /api/drogues HTTP", response.status);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || "Erreur API");
    drugs = payload;
    console.log("[DEBUG] Produits reçus:", drugs.length);
    $("totalCount").textContent = drugs.length;
    render(drugs, $("results"));
    render(drugs, $("filterResults"));
  } catch (err) {
    console.error("[ERREUR] /api/drogues:", err);
    $("results").innerHTML =
      '<div class="empty error">Impossible de charger les données JSON.<br><small>' +
      escapeHtml(err.message || String(err)) + '</small></div>';
  }
}

let filterOptions = { familles: [], effets: [], indesirables: [], prix: [], addiction: { min: 0, max: 10 } };

async function loadFilters() {
  console.log("[DEBUG] Chargement de /api/filtres...");
  const response = await fetch("/api/filtres");
  console.log("[DEBUG] /api/filtres HTTP", response.status);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || payload.error || "Erreur API");
  filterOptions = payload;
  console.log("[DEBUG] Filtres reçus:", filterOptions);

  buildCheckList("familyFilter", filterOptions.familles.map(f => ({value:String(f.id), label:f.name})));
  buildCheckList("effectFilter", filterOptions.effets.map(v => ({value:v, label:v})));
  buildCheckList("badEffectFilter", filterOptions.indesirables.map(v => ({value:v, label:v})));
  buildCheckList("priceFilter", filterOptions.prix.map(v => ({value:v, label:v})));
  renderFamilies();

  document.querySelectorAll(".check-list input").forEach(el => el.addEventListener("change", doFilter));
}

function renderFamilies() {
  const target = $("familyGrid");
  if (!target) return;
  target.innerHTML = filterOptions.familles.length
    ? filterOptions.familles.map((family, index) => {
        const count = drugs.filter(d => Number(d.famille) === Number(family.id)).length;
        return `<button class="family-card" type="button" data-family="${escapeHtml(String(family.id))}">
          <span class="family-number">0${index + 1}</span>
          <strong>${escapeHtml(family.name)}</strong>
          <small>${count} entrée${count > 1 ? "s" : ""}</small>
          <b>↗</b>
        </button>`;
      }).join("")
    : '<div class="empty">Aucune famille disponible.</div>';
  target.querySelectorAll("[data-family]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#familyFilter input").forEach(input => {
        input.checked = input.value === button.dataset.family;
      });
      showView("filter");
      doFilter();
    });
  });
}

function buildCheckList(id, options) {
  const target = $(id);
  if (!options.length) {
    target.innerHTML = '<span class="empty-small">Aucune valeur disponible</span>';
    return;
  }
  target.innerHTML = options.map((o,i) => `
    <label class="check-item">
      <input type="checkbox" value="${escapeHtml(o.value)}">
      <span>${escapeHtml(o.label)}</span>
    </label>
  `).join("");
}

function selectedValues(id) {
  return [...$(id).querySelectorAll("input:checked")].map(x => x.value);
}

function searchable(d) {
  return [
    d.name, d.famille, d.description, d.prix, d.addiction, d.tolerance,
    ...(d.effets || []), ...(d.indesirables || [])
  ].join(" ").toLowerCase();
}

function render(list, target) {
  if (!list.length) {
    target.innerHTML = '<div class="empty">Aucune entrée ne correspond aux critères.</div>';
    return;
  }
  target.innerHTML = list.map(d => `
    <article class="card">
      <div class="card-top">
        <div>
          <h2>${escapeHtml(d.name || "Sans nom")}</h2>
          <span class="badge">ID ${escapeHtml(String(d.id))} · Famille ${escapeHtml(String(d.famille_nom ?? d.famille ?? "—"))}</span>
        </div>
      </div>
      <p>${escapeHtml(d.description || "Aucune description.")}</p>
      <div class="grid">
        <div class="info"><strong>EFFETS</strong><div>${listText(d.effets)}</div></div>
        <div class="info"><strong>EFFETS INDÉSIRABLES</strong><div>${listText(d.indesirables)}</div></div>
        <div class="info"><strong>DURÉE</strong><div>${escapeHtml(d.duree || findDuration(d) || "À renseigner")}</div></div>
        <div class="info"><strong>PRIX</strong><div>${escapeHtml(String(d.prix ?? "À renseigner"))}</div></div>
        <div class="info addiction-info"><strong>ADDICTION</strong><div><span class="addiction-score addiction-${Math.round(Number(d.addiction) || 0)}">${Math.round(Number(d.addiction) || 0)}/10 · ${addictionLabel(d.addiction)}</span></div></div>
        <div class="info tolerance-info"><strong>TOLÉRANCE</strong><div>${escapeHtml(String(d.tolerance ?? "À renseigner"))}</div></div>
      </div>
      <div class="grid">
        <div class="info"><strong>PRODUITS À NE PAS MÉLANGER</strong><div>${listText(d.mauvais_melanges)}</div></div>
        <div class="info"><strong>PRODUITS COMPATIBLES</strong><div>${listText(d.bons_melanges)}</div></div>
        <div class="info"><strong>DOSES</strong><div>${listText(d.doses)}</div></div>
      </div>
    </article>
  `).join("");
}

function findDuration(d) {
  return "";
}

function addictionLabel(value) {
  const n = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
  if (n <= 2) return "Faible";
  if (n <= 4) return "Modérée";
  if (n <= 6) return "Élevée";
  if (n <= 8) return "Très élevée";
  return "Extrême";
}

function listText(arr) {
  if (!Array.isArray(arr) || !arr.length) return "À renseigner";
  return arr.map(x => escapeHtml(String(x))).join("<br>");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function doSearch() {
  const q = $("searchInput").value.trim().toLowerCase();
  render(!q ? drugs : drugs.filter(d => searchable(d).includes(q)), $("results"));
}

function doFilter() {
  const families = selectedValues("familyFilter");
  const effects = selectedValues("effectFilter").map(v => v.toLowerCase());
  const badEffects = selectedValues("badEffectFilter").map(v => v.toLowerCase());
  const prices = selectedValues("priceFilter").map(v => v.toLowerCase());
  const minAddiction = Number($("addictionMin").value);
  const maxAddiction = Number($("addictionMax").value);

  const filtered = drugs.filter(d => {
    const effectText = (d.effets || []).join(" ").toLowerCase();
    const unwantedText = (d.indesirables || []).join(" ").toLowerCase();
    const price = String(d.prix ?? "").toLowerCase();
    const addiction = Math.max(0, Math.min(10, Number(d.addiction) || 0));

    const familyOk = !families.length || families.includes(String(d.famille));
    const effectsOk = !effects.length || effects.some(v => effectText.includes(v));
    // Les éléments sélectionnés dans "à éviter" sont des effets secondaires
    // que l'utilisateur souhaite éviter : l'entrée est donc exclue si elle les contient.
    const badOk = !badEffects.length || !badEffects.some(v => unwantedText.includes(v));
    const priceOk = !prices.length || prices.some(v => price.includes(v));
    const addictionOk = addiction >= minAddiction && addiction <= maxAddiction;

    return familyOk && effectsOk && badOk && priceOk && addictionOk;
  });

  render(filtered, $("filterResults"));
}

function showView(view) {
  $("homeView").classList.toggle("hidden", view !== "home");
  $("searchView").classList.toggle("hidden", view !== "search");
  $("filterView").classList.toggle("hidden", view !== "filter");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[data-view="${view}"]`)?.classList.add("active");
}

function updateAddictionRange() {
  const min = $("addictionMin");
  const max = $("addictionMax");
  if (Number(min.value) > Number(max.value)) {
    if (document.activeElement === min) max.value = min.value;
    else min.value = max.value;
  }
  $("addictionRangeLabel").textContent = `${min.value} à ${max.value}`;
  doFilter();
}

$("addictionMin").addEventListener("input", updateAddictionRange);
$("addictionMax").addEventListener("input", updateAddictionRange);

document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});
$("searchBtn").addEventListener("click", doSearch);
$("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
$("homeSearchBtn").addEventListener("click", () => {
  showView("search");
  $("searchInput").focus();
});
$("themeToggle").addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});


$("resetBtn").addEventListener("click", () => {
  $("searchInput").value = "";
  document.querySelectorAll(".check-list input").forEach(x => x.checked = false);
  $("addictionMin").value = 0;
  $("addictionMax").value = 10;
  $("addictionRangeLabel").textContent = "0 à 10";
  showView("home");
  render(drugs, $("results"));
});

Promise.all([loadData(), loadFilters()]).then(() => showView("home")).catch(() => {
  $("filterResults").innerHTML = '<div class="empty error">Impossible de charger les listes de filtres.</div>';
});