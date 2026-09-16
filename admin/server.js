const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;
const HOST = "127.0.0.1";
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));

const FILES = [
  "name.json",
  "effet.json",
  "indesirable.json",
  "dos.json",
  "badmelange.json",
  "goodmelange.json",
  "prix.json",
  "addiction.json",
  "tolerance.json",
  "familles.json"
];

function log(msg) {
  console.log(`[ADMIN] ${msg}`);
}

function readJson(filename) {
  if (!FILES.includes(filename)) throw new Error("Fichier non autorisé.");
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(filename, value) {
  if (!FILES.includes(filename)) throw new Error("Fichier non autorisé.");
  const file = path.join(DATA_DIR, filename);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function allData() {
  const out = {};
  for (const f of FILES) out[f] = readJson(f);
  return out;
}

function nextId(items) {
  const ids = items.map(x => Number(x.id)).filter(Number.isInteger);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

app.get("/api/state", (req, res) => {
  try {
    res.json(allData());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/families", (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Le nom de la famille est obligatoire." });
    }

    const data = allData();
    if (data["familles.json"].some(f => String(f.name).trim().toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: "Cette famille existe déjà." });
    }

    const id = nextId(data["familles.json"]);
    data["familles.json"].push({ id, name });

    writeJson("familles.json", data["familles.json"]);

    log(`Famille ajoutée: #${id} ${name}`);
    res.json({ ok: true, id, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/drugs", (req, res) => {
  try {
    const d = req.body || {};
    if (!d.name || !String(d.name).trim()) {
      return res.status(400).json({ error: "Le nom est obligatoire." });
    }

    const data = allData();
    const id = Number.isInteger(Number(d.id)) && Number(d.id) > 0
      ? Number(d.id)
      : nextId(data["name.json"]);

    if (data["name.json"].some(x => Number(x.id) === id)) {
      return res.status(409).json({ error: `L'ID ${id} existe déjà.` });
    }

    const famille = Number(d.famille);
    const base = {
      id,
      name: String(d.name).trim(),
      famille: Number.isFinite(famille) ? famille : 10,
      description: String(d.description || "").trim()
    };

    data["name.json"].push(base);

    data["effet.json"].push({
      id,
      effets: Array.isArray(d.effets) ? d.effets.filter(Boolean) : [],
      duree: String(d.duree || "").trim()
    });

    data["indesirable.json"].push({
      id,
      indesirables: Array.isArray(d.indesirables) ? d.indesirables.filter(Boolean) : []
    });

    data["dos.json"].push({
      id,
      doses: Array.isArray(d.doses) ? d.doses.filter(Boolean) : []
    });

    data["badmelange.json"].push({
      id,
      melanges_ids: Array.isArray(d.badIds) ? d.badIds.map(Number).filter(Number.isInteger) : []
    });

    data["goodmelange.json"].push({
      id,
      melanges_ids: Array.isArray(d.goodIds) ? d.goodIds.map(Number).filter(Number.isInteger) : []
    });

    data["prix.json"].push({
      id,
      prix: String(d.prix || "").trim()
    });

    data["addiction.json"].push({
      id,
      addiction: Math.max(0, Math.min(10, Number.isFinite(Number(d.addiction)) ? Number(d.addiction) : 0))
    });

    data["tolerance.json"].push({
      id,
      tolerance: String(d.tolerance || "").trim()
    });

    // Atomic-ish batch write: all files are serialized before writes.
    for (const f of FILES) writeJson(f, data[f]);

    log(`Produit ajouté: #${id} ${base.name}`);
    res.json({ ok: true, id, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/drugs/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID invalide." });

    const d = req.body || {};
    const data = allData();
    const exists = data["name.json"].some(x => Number(x.id) === id);
    if (!exists) return res.status(404).json({ error: "Produit introuvable." });

    const replace = (filename, obj) => {
      const arr = data[filename];
      const idx = arr.findIndex(x => Number(x.id) === id);
      if (idx >= 0) arr[idx] = obj;
      else arr.push(obj);
    };

    replace("name.json", {
      id,
      name: String(d.name || "").trim(),
      famille: Number(d.famille) || 10,
      description: String(d.description || "").trim()
    });

    replace("effet.json", {
      id,
      effets: Array.isArray(d.effets) ? d.effets.filter(Boolean) : [],
      duree: String(d.duree || "").trim()
    });

    replace("indesirable.json", {
      id,
      indesirables: Array.isArray(d.indesirables) ? d.indesirables.filter(Boolean) : []
    });

    replace("dos.json", {
      id,
      doses: Array.isArray(d.doses) ? d.doses.filter(Boolean) : []
    });

    replace("badmelange.json", {
      id,
      melanges_ids: Array.isArray(d.badIds) ? d.badIds.map(Number).filter(Number.isInteger) : []
    });

    replace("goodmelange.json", {
      id,
      melanges_ids: Array.isArray(d.goodIds) ? d.goodIds.map(Number).filter(Number.isInteger) : []
    });

    replace("prix.json", {
      id,
      prix: String(d.prix || "").trim()
    });

    replace("addiction.json", {
      id,
      addiction: Math.max(0, Math.min(10, Number.isFinite(Number(d.addiction)) ? Number(d.addiction) : 0))
    });

    replace("tolerance.json", {
      id,
      tolerance: String(d.tolerance || "").trim()
    });

    for (const f of FILES) writeJson(f, data[f]);

    log(`Produit modifié: #${id}`);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/drugs/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = allData();
    for (const f of FILES) {
      if (f === "familles.json") continue;
      data[f] = data[f].filter(x => Number(x.id) !== id);
    }
    for (const f of FILES) writeJson(f, data[f]);
    log(`Produit supprimé: #${id}`);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log("==============================================");
  console.log(" ADMIN LOCAL - GESTION DES DONNEES");
  console.log("==============================================");
  console.log(`URL: http://${HOST}:${PORT}`);
  console.log(`Données: ${DATA_DIR}`);
  console.log("Accessible uniquement depuis cet ordinateur.");
  console.log("==============================================");
});
