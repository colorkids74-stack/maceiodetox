/* ===================================================================
   admin-new.js — Painel administrativo funcional
=================================================================== */

const API = "/api";
let token = null;
let currentData = null;

// ============================================================
// LOGIN
// ============================================================
async function checkPassword() {
  const pwd = document.getElementById("gatePassword").value;
  const error = document.getElementById("gateError");
  error.textContent = "";

  if (!pwd) {
    error.textContent = "Digite a senha.";
    return;
  }

  try {
    const res = await fetch(API + "/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    });

    if (!res.ok) {
      error.textContent = "Senha incorreta.";
      return;
    }

    const data = await res.json();
    token = data.token;
    document.getElementById("gate").style.display = "none";
    document.getElementById("app").style.display = "block";
    loadAll();
  } catch (err) {
    error.textContent = "Erro ao conectar.";
    console.error(err);
  }
}

// ============================================================
// TABS
// ============================================================
function switchTab(name) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.querySelector(`[onclick="switchTab('${name}')"]`).classList.add("active");
}

// ============================================================
// CARREGAR TUDO
// ============================================================
async function loadAll() {
  try {
    const res = await fetch(API + "/menu");
    currentData = await res.json();
    loadStore();
    loadPlanos();
    loadMarmitas();
    loadExtras();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

// ============================================================
// LOJA
// ============================================================
function loadStore() {
  const loja = currentData.loja;
  document.getElementById("storeName").value = loja.nome || "";
  document.getElementById("storeSlogan").value = loja.slogan || "";
  document.getElementById("storeWhatsapp").value = loja.whatsapp || "";
  document.getElementById("storeAddress").value = loja["endereçoResumo"] || "";
  document.getElementById("storeHours").value = loja.horario || "";
}

async function saveStore() {
  const nome = document.getElementById("storeName").value;
  const slogan = document.getElementById("storeSlogan").value;
  const whatsapp = document.getElementById("storeWhatsapp").value;
  const endereçoResumo = document.getElementById("storeAddress").value;
  const horario = document.getElementById("storeHours").value;

  try {
    const res = await fetch(API + "/admin/store", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ nome, slogan, whatsapp, endereçoResumo, horario })
    });

    if (res.ok) {
      alert("Dados da loja salvos!");
      loadAll();
    } else {
      alert("Erro ao salvar.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao conectar.");
  }
}

// ============================================================
// PLANOS
// ============================================================
function loadPlanos() {
  const { marmitas, sucos, combos } = currentData.planos;
  let html = "<h3 style='color: var(--primary); margin: 20px 0 10px;'>Marmitas</h3>";

  marmitas.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${p.nome}</h4>
          <p>${p.quantidade} unidades — R$ ${p.preco.toFixed(2)}</p>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="editPlano('marmitas', '${p.id}')">Editar</button>
        </div>
      </div>
    `;
  });

  html += "<h3 style='color: var(--primary); margin: 20px 0 10px;'>Sucos</h3>";
  sucos.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${p.nome}</h4>
          <p>${p.quantidade} unidades — R$ ${p.preco.toFixed(2)}</p>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="editPlano('sucos', '${p.id}')">Editar</button>
        </div>
      </div>
    `;
  });

  html += "<h3 style='color: var(--primary); margin: 20px 0 10px;'>Combos</h3>";
  combos.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${p.nome}</h4>
          <p>${p.descricao} — R$ ${p.preco.toFixed(2)}</p>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="editPlano('combos', '${p.id}')">Editar</button>
        </div>
      </div>
    `;
  });

  document.getElementById("planosList").innerHTML = html;
}

async function editPlano(tipo, id) {
  const preco = prompt("Novo preço (R$):");
  if (preco === null) return;

  try {
    const res = await fetch(API + "/admin/planos/" + tipo + "/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ preco: parseFloat(preco) })
    });

    if (res.ok) {
      alert("Plano atualizado!");
      loadAll();
    } else {
      alert("Erro ao atualizar.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}

// ============================================================
// MARMITAS
// ============================================================
let editingMarmitaId = null;

function loadMarmitas() {
  const marmitas = currentData.marmitas.normal || [];
  let html = "";

  marmitas.forEach(m => {
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${m.nome}</h4>
          <p>${m.descricao}</p>
          ${m.isGourmet ? `<p style="color:var(--accent);font-size:0.75rem;margin-top:4px;">+R$ ${m.preco.toFixed(2)} (Gourmet)</p>` : ""}
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="openMarmitaForm('${m.id}')">Editar</button>
          <button class="btn-delete" onclick="deleteMarmita('${m.id}')">Remover</button>
        </div>
      </div>
    `;
  });

  document.getElementById("marmiitasList").innerHTML = html;
}

function openMarmitaForm(id = null) {
  editingMarmitaId = id;
  const form = document.getElementById("marmiitaForm");

  if (id) {
    const m = currentData.marmitas.normal.find(x => x.id === id);
    document.getElementById("m-nome").value = m.nome;
    document.getElementById("m-desc").value = m.descricao;
    document.getElementById("m-gourmet").checked = m.isGourmet;
    document.getElementById("m-preco").value = m.preco;
    document.getElementById("m-tags").value = (m.tags || []).join(", ");
    form.querySelector("h3").textContent = "Editar marmita";
  } else {
    document.getElementById("m-nome").value = "";
    document.getElementById("m-desc").value = "";
    document.getElementById("m-gourmet").checked = false;
    document.getElementById("m-preco").value = "";
    document.getElementById("m-tags").value = "";
    form.querySelector("h3").textContent = "Nova marmita";
  }

  document.getElementById("m-gourmet").addEventListener("change", togglePrecoBudget);
  togglePrecoBudget();
  form.classList.add("open");
}

function closeMarmitaForm() {
  document.getElementById("marmiitaForm").classList.remove("open");
  editingMarmitaId = null;
}

function togglePrecoBudget() {
  const isGourmet = document.getElementById("m-gourmet").checked;
  document.getElementById("m-preco-group").style.display = isGourmet ? "block" : "none";
}

async function saveMarmita() {
  const nome = document.getElementById("m-nome").value;
  const desc = document.getElementById("m-desc").value;
  const isGourmet = document.getElementById("m-gourmet").checked;
  const preco = isGourmet ? parseFloat(document.getElementById("m-preco").value || 0) : 0;
  const tags = document.getElementById("m-tags").value;
  const foto = document.getElementById("m-foto");

  const formData = new FormData();
  formData.append("nome", nome);
  formData.append("descricao", desc);
  formData.append("isGourmet", isGourmet ? "true" : "false");
  formData.append("preco", preco);
  formData.append("tags", tags);
  if (foto.files.length > 0) formData.append("foto", foto.files[0]);

  const url = editingMarmitaId
    ? API + "/admin/marmitas/" + editingMarmitaId
    : API + "/admin/marmitas";
  const method = editingMarmitaId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });

    if (res.ok) {
      alert("Marmita salva!");
      closeMarmitaForm();
      loadAll();
    } else {
      alert("Erro ao salvar.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}

async function deleteMarmita(id) {
  if (!confirm("Remover esta marmita?")) return;

  try {
    const res = await fetch(API + "/admin/marmitas/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      alert("Marmita removida!");
      loadAll();
    } else {
      alert("Erro ao remover.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}

// ============================================================
// EXTRAS
// ============================================================
let editingExtraId = null;
let currentExtraType = "sucos";

function loadExtras() {
  currentExtraType = document.getElementById("extrasType").value;
  const extras = currentData.extras[currentExtraType] || [];
  let html = "";

  extras.forEach(e => {
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${e.nome}</h4>
          <p>${e.descricao || ""}</p>
          <p style="color:var(--primary);font-weight:600;margin-top:4px;">R$ ${e.preco.toFixed(2)}</p>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="openExtraForm('${e.id}')">Editar</button>
          <button class="btn-delete" onclick="deleteExtra('${e.id}')">Remover</button>
        </div>
      </div>
    `;
  });

  document.getElementById("extrasList").innerHTML = html;
}

function openExtraForm(id = null) {
  editingExtraId = id;
  const form = document.getElementById("extraForm");

  if (id) {
    const extras = currentData.extras[currentExtraType] || [];
    const e = extras.find(x => x.id === id);
    document.getElementById("ex-nome").value = e.nome;
    document.getElementById("ex-desc").value = e.descricao;
    document.getElementById("ex-preco").value = e.preco;
    document.getElementById("ex-tags").value = (e.tags || []).join(", ");
    form.querySelector("h3").textContent = "Editar extra";
  } else {
    document.getElementById("ex-nome").value = "";
    document.getElementById("ex-desc").value = "";
    document.getElementById("ex-preco").value = "";
    document.getElementById("ex-tags").value = "";
    form.querySelector("h3").textContent = "Novo extra";
  }

  form.classList.add("open");
}

function closeExtraForm() {
  document.getElementById("extraForm").classList.remove("open");
  editingExtraId = null;
}

async function saveExtra() {
  const nome = document.getElementById("ex-nome").value;
  const desc = document.getElementById("ex-desc").value;
  const preco = parseFloat(document.getElementById("ex-preco").value || 0);
  const tags = document.getElementById("ex-tags").value;
  const foto = document.getElementById("ex-foto");

  const formData = new FormData();
  formData.append("nome", nome);
  formData.append("descricao", desc);
  formData.append("preco", preco);
  formData.append("tags", tags);
  if (foto.files.length > 0) formData.append("foto", foto.files[0]);

  const url = editingExtraId
    ? API + "/admin/extras/" + currentExtraType + "/" + editingExtraId
    : API + "/admin/extras/" + currentExtraType;
  const method = editingExtraId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });

    if (res.ok) {
      alert("Extra salvo!");
      closeExtraForm();
      loadAll();
    } else {
      alert("Erro ao salvar.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}

async function deleteExtra(id) {
  if (!confirm("Remover este extra?")) return;

  try {
    const res = await fetch(API + "/admin/extras/" + currentExtraType + "/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      alert("Extra removido!");
      loadAll();
    } else {
      alert("Erro ao remover.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}
