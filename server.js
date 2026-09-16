const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

function debug(message, data) {
  const stamp = new Date().toLocaleTimeString("fr-FR");
  if (data === undefined) console.log(`[${stamp}] [DEBUG] ${message}`);
  else console.log(`[${stamp}] [DEBUG] ${message}`, data);
}

function debugError(message, err) {
  const stamp = new Date().toLocaleTimeString("fr-FR");
  console.error(`[${stamp}] [ERREUR] ${message}`);
  if (err) console.error(err.stack || err);
}

app.use(express.json());

app.use((req, res, next) => {
  debug(`${req.method} ${req.url}`);
  next();
});

app.use(express.static(PUBLIC_DIR));

function readJson(filename) {
  const file = path.join(DATA_DIR, filename);
  debug(`Lecture JSON: ${filename}`);
  debug(`Chemin: ${file}`);

  if (!fs.existsSync(file)) {
    debugError(`Fichier introuvable: ${file}`);
    return [];
  }

  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    debug(`OK: ${filename} (${Array.isArray(parsed) ? parsed.length : "objet"} entrée(s))`);
    return parsed;
  } catch (err) {
    debugError(`JSON invalide: ${filename}`, err);
    throw err;
  }
}

// API principale : les fichiers JSON restent modifiables sans modifier le serveur.
app.get("/api/drogues", (req, res) => {
  debug("Requête reçue: GET /api/drogues");
  try {
    const drogues = readJson("name.json");
    const effets = readJson("effet.json");
    const indesirables = readJson("indesirable.json");
    const dosages = readJson("dos.json");
    const bad = readJson("badmelange.json");
    const good = readJson("goodmelange.json");
    const prix = readJson("prix.json");
    const familles = readJson("familles.json");
    const addictions = readJson("addiction.json");
    const tolerances = readJson("tolerance.json");

    const byId = (items) => Object.fromEntries(items.map(x => [String(x.id), x]));

    const effetMap = byId(effets);
    const indMap = byId(indesirables);
    const dosageMap = byId(dosages);
    const prixMap = byId(prix);
    const familleMap = byId(familles);
    const addictionMap = byId(addictions);
    const toleranceMap = byId(tolerances);
    const drugNameMap = Object.fromEntries(
      drogues.map(d => [String(d.id), d.name])
    );

    // Les fichiers de mélanges contiennent uniquement des IDs.
    // On résout ici ces IDs vers les noms des produits avant d'envoyer
    // les données au navigateur.
    const resolveMixes = (items) => Object.fromEntries(
      items.map(item => [
        String(item.id),
        (item.melanges_ids || [])
          .map(id => drugNameMap[String(id)])
          .filter(Boolean)
      ])
    );

    const badMap = resolveMixes(bad);
    const goodMap = resolveMixes(good);

    const result = drogues.map(d => ({
      ...d,
      famille_nom: familleMap[String(d.famille)]?.name ?? String(d.famille ?? "Autre"),
      effets: effetMap[String(d.id)]?.effets ?? [],
      indesirables: indMap[String(d.id)]?.indesirables ?? [],
      doses: dosageMap[String(d.id)]?.doses ?? [],
      mauvais_melanges: badMap[String(d.id)] ?? [],
      bons_melanges: goodMap[String(d.id)] ?? [],
      prix: prixMap[String(d.id)]?.prix ?? null,
      addiction: Number.isFinite(Number(addictionMap[String(d.id)]?.addiction))
        ? Math.max(0, Math.min(10, Number(addictionMap[String(d.id)]?.addiction)))
        : 0,
      tolerance: toleranceMap[String(d.id)]?.tolerance ?? ""
    }));

    debug(`/api/drogues OK: ${result.length} produit(s) assemblé(s)`);
    res.json(result);
  } catch (err) {
    debugError("Échec de /api/drogues", err);
    res.status(500).json({
      error: "Impossible de lire les données JSON.",
      detail: err.message
    });
  }
});

// Valeurs uniques disponibles pour les filtres.
// Elles sont reconstruites à partir des données JSON, donc les listes évoluent
// automatiquement lorsque les JSON sont modifiés.
app.get("/api/filtres", (req, res) => {
  debug("Requête reçue: GET /api/filtres");
  try {
    const drogues = readJson("name.json");
    const effets = readJson("effet.json");
    const indesirables = readJson("indesirable.json");
    const bad = readJson("badmelange.json");
    const good = readJson("goodmelange.json");
    const prix = readJson("prix.json");
    const familles = readJson("familles.json");
    const addictions = readJson("addiction.json");

    const drugNameMap = Object.fromEntries(
      drogues.map(d => [String(d.id), d.name])
    );
    const resolveMixIds = items => items.flatMap(x =>
      (x.melanges_ids || [])
        .map(id => drugNameMap[String(id)])
        .filter(Boolean)
    );

    const flat = (arr, key) => arr.flatMap(x => Array.isArray(x[key]) ? x[key] : []);
    const unique = arr => [...new Set(arr.filter(v => v !== null && v !== undefined && String(v).trim() !== "").map(String))].sort((a,b) => a.localeCompare(b, "fr"));

    debug(`Filtres construits: ${familles.length} famille(s), ${unique(flat(effets, "effets")).length} effet(s), ${unique(flat(indesirables, "indesirables")).length} effet(s) indésirable(s)`);
    res.json({
      familles: familles.map(f => ({ id: f.id, name: f.name })),
      effets: unique(flat(effets, "effets")),
      indesirables: unique(flat(indesirables, "indesirables")),
      mauvais_melanges: unique(resolveMixIds(bad)),
      bons_melanges: unique(resolveMixIds(good)),
      prix: unique(prix.map(x => x.prix)),
      addiction: { min: 0, max: 10 },
      noms: unique(drogues.map(x => x.name))
    });
  } catch (err) {
    debugError("Échec de /api/filtres", err);
    res.status(500).json({
      error: "Impossible de construire les filtres.",
      detail: err.message
    });
  }
});

// Permet de verifier rapidement qu'un fichier JSON est lisible.
app.get("/api/data/:file", (req, res) => {
  const safe = path.basename(req.params.file);
  if (!safe.endsWith(".json")) return res.status(400).json({ error: "Fichier invalide." });
  try {
    res.json(readJson(safe));
  } catch {
    res.status(500).json({ error: "JSON invalide ou illisible." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("  SERVEUR DE DOCUMENTATION DEMARRE");
  console.log("==============================================");
  console.log(`[INFO] URL      : http://localhost:${PORT}`);
  console.log(`[INFO] Racine   : ${ROOT}`);
  console.log(`[INFO] Data     : ${DATA_DIR}`);
  console.log(`[INFO] Public   : ${PUBLIC_DIR}`);
  console.log("[INFO] Debug actif : chaque requête et lecture JSON sera affichée ici.");
  console.log("==============================================");
  console.log("");
});