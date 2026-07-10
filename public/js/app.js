const money = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
const API = "/api";

let state = {
  planoType: null,
  plano: null,
  selectedDishes: [],
  selectedExtras: [],
  data: null
};

async function init() {
  try {
    console.log("🚀 init() rodando");
    const res = await fetch(API + "/menu");
    state.data = await res.json();
    console.log("✅ Dados OK:", state.data);
    renderStep1();
  } catch (err) {
    console.error("❌ Erro:", err);
  }
}

function renderStep1() {
  console.log("Step1");
  const { planos } = state.data;

  const marmitasHtml = planos.marmitas.map(p => `
    <div class="plano-card" data-plano-type="marmitas" data-plano-id="${p.id}">
      <h3>${p.nome}</h3>
      <p>${p.quantidade} marmitas</p>
      <div class="plano-price">${money(p.preco)}</div>
    </div>
  `).join("");
  document.getElementById("planosPlanesMarmitas").innerHTML = marmitasHtml;

  const sucosHtml = planos.sucos.map(p => `
    <div class="plano-card" data-plano-type="sucos" data-plano-id="${p.id}">
      <h3>${p.nome}</h3>
      <p>${p.quantidade} sucos</p>
      <div class="plano-price">${money(p.preco)}</div>
    </div>
  `).join("");
  document.getElementById("planosPlanossucos").innerHTML = sucosHtml;

  const combosHtml = planos.combos.map(p => `
    <div class="plano-card" data-plano-type="combos" data-plano-id="${p.id}">
      <h3>${p.nome}</h3>
      <p>${p.descricao}</p>
      <div class="plano-price">${money(p.preco)}</div>
    </div>
  `).join("");
  document.getElementById("planosPlanoscomobos").innerHTML = combosHtml;

  document.querySelectorAll(".plano-card").forEach(card => {
    card.addEventListener("click", () => selectPlano(card));
  });

  document.getElementById("btn-step1-next").addEventListener("click", nextStep);
}

function selectPlano(card) {
  document.querySelectorAll(".plano-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");

  const tipo = card.dataset.planoType;
  const id = card.dataset.planoId;
  const planos = state.data.planos[tipo];
  const plano = planos.find(p => p.id === id);

  state.planoType = tipo;
  state.plano = plano;
  state.selectedDishes = [];
  state.selectedExtras = [];

  document.getElementById("btn-step1-next").disabled = false;
}

async function renderStep2() {
  if (state.planoType === "combos") {
    goToStep(3);
    return;
  }

  if (state.planoType === "marmitas") {
    const res = await fetch(API + "/marmitas");
    const marmitas = await res.json();

    const html = marmitas.map(m => `
      <div class="marmita-item">
        <input type="checkbox" data-dish-id="${m.id}" data-dish-preco="${m.preco || 0}">
        <div class="marmita-info">
          <h4>${m.nome}</h4>
          <p>${m.descricao}</p>
        </div>
        ${m.isGourmet && m.preco > 0 ? `<div class="marmita-addon">+${money(m.preco)}</div>` : ""}
      </div>
    `).join("");

    document.getElementById("marminitasList").innerHTML = html;
    document.getElementById("qty-needed").textContent = state.plano.quantidade;

    document.querySelectorAll(".marmita-item input").forEach(checkbox => {
      checkbox.addEventListener("change", () => updateStep2());
    });

    document.getElementById("btn-step2-back").addEventListener("click", () => goToStep(1));
    document.getElementById("btn-step2-next").addEventListener("click", nextStep);
  }

  goToStep(2);
}

function updateStep2() {
  const checkboxes = document.querySelectorAll(".marmita-item input:checked");
  const qty = checkboxes.length;
  document.getElementById("qty-selected").textContent = qty;

  if (qty === state.plano.quantidade) {
    document.getElementById("btn-step2-next").disabled = false;
  } else {
    document.getElementById("btn-step2-next").disabled = true;
  }

  state.selectedDishes = Array.from(checkboxes).map(cb => ({
    id: cb.dataset.dishId,
    preco: parseFloat(cb.dataset.dishPreco)
  }));
}

async function renderStep3() {
  let extras = [];

  try {
    const sucosRes = await fetch(API + "/extras/sucos").catch(() => null);
    const sobremesasRes = await fetch(API + "/extras/sobremesas").catch(() => null);
    
    if (sucosRes?.ok) extras = extras.concat(await sucosRes.json());
    if (sobremesasRes?.ok) extras = extras.concat(await sobremesasRes.json());
  } catch (err) {
    console.error("Erro extras:", err);
  }

  if (extras.length === 0) {
    document.getElementById("extrasContainer").innerHTML = "<p>Nenhum extra.</p>";
  } else {
    const html = extras.map(e => `
      <div class="extra-item" data-extra-id="${e.id}" data-extra-preco="${e.preco}">
        <input type="checkbox">
        <h4>${e.nome}</h4>
        <p>${e.descricao || ""}</p>
        <div class="extra-price">${money(e.preco)}</div>
      </div>
    `).join("");

    document.getElementById("extrasContainer").innerHTML = html;

    document.querySelectorAll(".extra-item").forEach(item => {
      item.addEventListener("click", () => {
        const checkbox = item.querySelector("input");
        checkbox.checked = !checkbox.checked;
        item.classList.toggle("selected", checkbox.checked);
        updateStep3();
      });
    });
  }

  document.getElementById("btn-step3-back").addEventListener("click", () => goToStep(2));
  document.getElementById("btn-step3-next").addEventListener("click", nextStep);

  goToStep(3);
}

function updateStep3() {
  const checkedExtras = document.querySelectorAll(".extra-item input:checked");
  state.selectedExtras = Array.from(checkedExtras).map(cb => ({
    id: cb.closest(".extra-item").dataset.extraId,
    preco: parseFloat(cb.closest(".extra-item").dataset.extraPreco)
  }));
}

function renderStep4() {
  const summary = [];
  let total = state.plano.preco;

  summary.push(`<div class="order-line"><span>${state.plano.nome}</span><span>${money(state.plano.preco)}</span></div>`);

  if (state.selectedDishes.length > 0) {
    summary.push(`<div style="margin: 8px 0; font-size: 0.78rem;">Pratos (${state.selectedDishes.length}):</div>`);
    state.selectedDishes.forEach(dish => {
      if (dish.preco > 0) {
        summary.push(`<div class="order-line"><span style="padding-left: 12px;">${dish.id}</span><span>+${money(dish.preco)}</span></div>`);
        total += dish.preco;
      }
    });
  }

  if (state.selectedExtras.length > 0) {
    summary.push(`<div style="margin: 8px 0; font-size: 0.78rem;">Extras:</div>`);
    state.selectedExtras.forEach(extra => {
      summary.push(`<div class="order-line"><span style="padding-left: 12px;">${extra.id}</span><span>+${money(extra.preco)}</span></div>`);
      total += extra.preco;
    });
  }

  summary.push(`<div class="order-line"><span><b>TOTAL</b></span><span><b>${money(total)}</b></span></div>`);

  document.getElementById("orderSummary").innerHTML = summary.join("");

  document.getElementById("btn-step4-back").addEventListener("click", () => goToStep(3));
  document.getElementById("btn-submit-whatsapp").addEventListener("click", submitOrder);

  goToStep(4);
}

function submitOrder() {
  const name = document.getElementById("custName").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const payment = document.getElementById("custPayment").value;
  const error = document.getElementById("formError");

  error.textContent = "";

  if (!name || !address || !payment) {
    error.textContent = "Preencha todos os campos.";
    return;
  }

  const lines = [];
  lines.push(`Olá, *${state.data.loja.nome}*! Pedido:`);
  lines.push(`*Plano:* ${state.plano.nome} - ${money(state.plano.preco)}`);

  if (state.selectedDishes.length > 0) {
    lines.push("*Pratos:*");
    state.selectedDishes.forEach(d => {
      const addon = d.preco > 0 ? ` +${money(d.preco)}` : "";
      lines.push(`• ${d.id}${addon}`);
    });
  }

  if (state.selectedExtras.length > 0) {
    lines.push("*Extras:*");
    state.selectedExtras.forEach(e => {
      lines.push(`• ${e.id} ${money(e.preco)}`);
    });
  }

  let total = state.plano.preco;
  state.selectedDishes.forEach(d => total += d.preco);
  state.selectedExtras.forEach(e => total += e.preco);

  lines.push(`*Total: ${money(total)}*`);
  lines.push(`*Nome:* ${name}`);
  lines.push(`*Endereço:* ${address}`);
  lines.push(`*Pagamento:* ${payment}`);

  const message = encodeURIComponent(lines.join("\n"));
  const url = `https://wa.me/${state.data.loja.whatsapp}?text=${message}`;
  window.open(url, "_blank");
}

function nextStep() {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  if (step1.classList.contains("active")) renderStep2();
  else if (step2.classList.contains("active")) renderStep3();
  else if (step3.classList.contains("active")) renderStep4();
}

function goToStep(n) {
  document.querySelectorAll(".step-view").forEach(s => s.classList.remove("active"));
  document.getElementById("step" + n).classList.add("active");
  window.scrollTo(0, 0);
}

function startPlanos() {
  document.getElementById("hero-section").classList.remove("active");
  renderStep1();
}

function goToHero() {
  document.querySelectorAll(".step-view").forEach(s => s.classList.remove("active"));
  document.getElementById("hero-section").classList.add("active");
  window.scrollTo(0, 0);
}

// Rodar quando página carrega
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
