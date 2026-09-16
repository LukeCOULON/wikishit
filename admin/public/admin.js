let state = {};
let editingId = null;

const $ = id => document.getElementById(id);

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

setTheme(localStorage.getItem("docdata-theme") || "light");

async function api(url, options={}) {
  const r = await fetch(url, {
    headers: {"Content-Type":"application/json", ...(options.headers||{})},
    ...options
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function load() {
  state = await api("/api/state");
  renderList();
}

function drugs() {
  return state["name.json"] || [];
}

function families() {
  return state["familles.json"] || [];
}

function renderList() {
  const q = $("searchAdmin").value.trim().toLowerCase();
  const arr = drugs().filter(d => `${d.name} ${d.id} ${d.description}`.toLowerCase().includes(q));
  $("list").innerHTML = arr.length ? arr.map(d => `
    <div class="row">
      <div><strong>#${esc(String(d.id))} — ${esc(d.name)}</strong>
      <span class="meta">${esc(familyName(d.famille))}</span></div>
      <button data-edit="${d.id}">Modifier</button>
    </div>`).join("") :
    '<div class="row"><span class="meta">Aucune entrée.</span></div>';
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick=()=>openEditor(Number(b.dataset.edit)));
}

function familyName(id) {
  return families().find(f => Number(f.id)===Number(id))?.name || `Famille ${id}`;
}

function fillFamilies(selected=null) {
  const list = families();
  const selectedId = selected != null
    ? Number(selected)
    : (list[0] ? Number(list[0].id) : null);

  $("family").innerHTML = list.length
    ? list.map(f =>
        `<option value="${esc(String(f.id))}" ${Number(f.id)===selectedId?"selected":""}>${esc(f.name)}</option>`
      ).join("")
    : '<option value="">Aucune famille — créez-en une</option>';
}

function sourceById(filename, id) {
  return (state[filename]||[]).find(x => Number(x.id)===Number(id));
}

function textLines(id, values=[]) {
  const box=$(id);
  box.innerHTML="";
  (values.length?values:[""]).forEach(v=>addLine(id,v));
}

function addLine(id, value="") {
  const box=$(id);
  const line=document.createElement("div");
  line.className="line";
  line.innerHTML=`<input value="${esc(value)}"><button type="button" class="secondary">×</button>`;
  line.querySelector("button").onclick=()=>line.remove();
  box.appendChild(line);
}

function getLines(id) {
  return [...$(id).querySelectorAll("input")].map(x=>x.value.trim()).filter(Boolean);
}

function fillIds(containerId, selected=[]) {
  const box=$(containerId);
  const selectedSet=new Set((selected||[]).map(Number));
  box.innerHTML=drugs().filter(d=>Number(d.id)!==Number(editingId)).map(d=>`
    <label class="id-item">
      <input type="checkbox" value="${d.id}" ${selectedSet.has(Number(d.id))?"checked":""}>
      <span>#${esc(String(d.id))} — ${esc(d.name)}</span>
    </label>`).join("");
}

function selectedIds(id) {
  return [...$(id).querySelectorAll("input:checked")].map(x=>Number(x.value));
}

function openEditor(id=null) {
  editingId=id;
  $("editor").classList.remove("hidden");
  $("modeLabel").textContent=id?"MODIFICATION":"NOUVELLE ENTRÉE";
  $("editorTitle").textContent=id?"Modifier l'entrée":"Ajouter une entrée";
  $("deleteBtn").classList.toggle("hidden", !id);
  fillFamilies(id ? drugs().find(d=>Number(d.id)===id)?.famille : null);

  const n=id?drugs().find(d=>Number(d.id)===id):null;
  const e=id?sourceById("effet.json",id):null;
  const i=id?sourceById("indesirable.json",id):null;
  const d=id?sourceById("dos.json",id):null;
  const b=id?sourceById("badmelange.json",id):null;
  const g=id?sourceById("goodmelange.json",id):null;
  const p=id?sourceById("prix.json",id):null;
  const a=id?sourceById("addiction.json",id):null;
  const t=id?sourceById("tolerance.json",id):null;

  $("id").value=id||"";
  $("id").disabled=!!id;
  $("name").value=n?.name||"";
  $("description").value=n?.description||"";
  $("price").value=p?.prix||"";
  $("addiction").value=Number.isFinite(Number(a?.addiction))
    ? Math.max(0, Math.min(10, Number(a.addiction)))
    : 0;
  $("tolerance").value=t?.tolerance ?? "";
  updateAddictionValue();
  $("duration").value=e?.duree||"";
  textLines("effects",e?.effets||[]);
  textLines("undesirables",i?.indesirables||[]);
  textLines("doses",d?.doses||[]);
  fillIds("badIds",b?.melanges_ids||[]);
  fillIds("goodIds",g?.melanges_ids||[]);
  window.scrollTo({top:$("editor").offsetTop-20,behavior:"smooth"});
}

function closeEditor() {
  $("editor").classList.add("hidden");
  editingId=null;
}

async function save(e) {
  e.preventDefault();
  const payload={
    id:$("id").value?Number($("id").value):undefined,
    name:$("name").value,
    famille:Number($("family").value),
    description:$("description").value,
    prix:$("price").value,
    addiction:Number($("addiction").value),
    tolerance:$("tolerance").value,
    effets:getLines("effects"),
    indesirables:getLines("undesirables"),
    duree:$("duration").value,
    doses:getLines("doses"),
    badIds:selectedIds("badIds"),
    goodIds:selectedIds("goodIds")
  };

  try {
    const result=editingId
      ? await api(`/api/drugs/${editingId}`,{method:"PUT",body:JSON.stringify(payload)})
      : await api("/api/drugs",{method:"POST",body:JSON.stringify(payload)});
    state=result.data;
    show("Données enregistrées dans tous les JSON.","ok");
    renderList();
    if(!editingId) openEditor(result.id); else openEditor(editingId);
  } catch(err) { show(err.message,"err"); }
}

async function remove() {
  if(!editingId || !confirm("Supprimer cette entrée de tous les JSON ?")) return;
  try {
    const result=await api(`/api/drugs/${editingId}`,{method:"DELETE"});
    state=result.data;
    closeEditor(); renderList(); show("Entrée supprimée.","ok");
  } catch(err){show(err.message,"err");}
}

function show(msg,type){$("message").innerHTML=`<div class="msg ${type}">${esc(msg)}</div>`;setTimeout(()=>{$("message").innerHTML=""},5000)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function updateAddictionValue(){
  $("addictionValue").value=`${$("addiction").value}/10`;
  $("addictionValue").textContent=`${$("addiction").value}/10`;
}

$("newBtn").onclick=()=>openEditor();
$("newFamilyBtn").onclick=async ()=>{
  const name = prompt("Nom de la nouvelle famille :");
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed) {
    show("Le nom de la famille est obligatoire.","err");
    return;
  }

  try {
    const result = await api("/api/families", {
      method: "POST",
      body: JSON.stringify({name: trimmed})
    });
    state = result.data;
    fillFamilies(result.id);
    show(`Famille « ${trimmed} » créée.`, "ok");
  } catch(err) {
    show(err.message, "err");
  }
};
$("closeBtn").onclick=closeEditor;
$("refreshBtn").onclick=()=>load().catch(e=>show(e.message,"err"));
$("searchAdmin").oninput=renderList;
$("drugForm").onsubmit=save;
$("deleteBtn").onclick=remove;
$("addiction").oninput=updateAddictionValue;
$("themeToggle").onclick=()=>setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addLine(b.dataset.add));
load().catch(e=>show(e.message,"err"));
