/* ===================================================================
   MACEIÓ DETOX — new-flow.js
   Fluxo de 4 steps:
   1. Escolher tipo de plano (marmita/suco/combo)
   2. Selecionar pratos (se marmita/suco)
   3. Adicionar extras (opcional)
   4. Revisar e enviar no WhatsApp
=================================================================== */

(function () {
  const money = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
  const API = "/api";

  let state = {
    planoType: null, // "marmitas", "sucos" ou "combos"
    plano: null,     // objeto do plano escolhido
    selectedDishes: [], // [{ dish, quantidade (1 neste caso) }]
    selectedExtras: [], // [{ extra, quantidade }]
    data: null // dados carregados da API
  };

  // -------------------------------------------------------------------
  // carregar dados da API e renderizar step 1
  // -------------------------------------------------------------------
  async function init() {
    try {
      const res = await fetch(API + "/menu");
      state.data = await res.json();
      renderStep1();
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  }

  // -------------------------------------------------------------------
  // STEP 1: escolher tipo de plano
  // -------------------------------------------------------------------
  function renderStep1() {
    const { planos } = state.data;

    // marmitas
    const marmitasHtml = planos.marmitas.map(p => `
      <div class="plano-card" data-plano-type="marmitas" data-plano-id="${p.id}">
        <h3>${p.nome}</h3>
        <p>${p.quantidade} marmitas</p>
        <div class="plano-price">${money(p.preco)}</div>
      </div>
    `).join("");
    document.getElementById("planosPlanesMarmitas").innerHTML = marmitasHtml;

    // sucos
    const sucosHtml = planos.sucos.map(p => `
      <div class="plano-card" data-plano-type="sucos" data-plano-id="${p.id}">
        <h3>${p.nome}</h3>
        <p>${p.quantidade} sucos</p>
        <div class="plano-price">${money(p.preco)}</div>
      </div>
    `).join("");
    document.getElementById("planosPlanossucos").innerHTML = sucosHtml;

    // combos
    const combosHtml = planos.combos.map(p => `
      <div class="plano-card" data-plano-type="combos" data-plano-id="${p.id}">
        <h3>${p.nome}</h3>
        <p>${p.descricao}</p>
        <div class="plano-price">${money(p.preco)}</div>
      </div>
    `).join("");
    document.getElementById("planosPlanoscomobos").innerHTML = combosHtml;

    // event listeners
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

  // -------------------------------------------------------------------
  // STEP 2: selecionar marmitas (só aparece se plano de marmita)
  // -------------------------------------------------------------------
  async function renderStep2() {
    if (state.planoType === "combos") {
      // combos não precisa de step 2, pula pra step 3 (extras)
      goToStep(3);
      return;
    }

    if (state.planoType === "marmitas") {
      // buscar lista de marmitas
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

    // salvar seleção
    state.selectedDishes = Array.from(checkboxes).map(cb => ({
      id: cb.dataset.dishId,
      preco: parseFloat(cb.dataset.dishPreco)
    }));
  }

  // -------------------------------------------------------------------
  // STEP 3: extras opcionais
  // -------------------------------------------------------------------
  async function renderStep3() {
    let extras = [];

    // buscar todos os extras (sucos + sobremesas)
    try {
      const sucosRes = await fetch(API + "/extras/sucos").catch(() => null);
      const sobremesasRes = await fetch(API + "/extras/sobremesas").catch(() => null);
      
      if (sucosRes?.ok) extras = extras.concat(await sucosRes.json());
      if (sobremesasRes?.ok) extras = extras.concat(await sobremesasRes.json());
    } catch (err) {
      console.error("Erro ao buscar extras:", err);
    }

    if (extras.length === 0) {
      document.getElementById("extrasContainer").innerHTML = "<p style='color:var(--ink-soft); font-size:0.9rem;'>Nenhum extra disponível.</p>";
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

  // -------------------------------------------------------------------
  // STEP 4: revisar e checkout
  // -------------------------------------------------------------------
  function renderStep4() {
    const summary = [];
    let total = state.plano.preco;

    summary.push(`
      <div class="order-line">
        <span>${state.plano.nome}</span>
        <span>${money(state.plano.preco)}</span>
      </div>
    `);

    if (state.selectedDishes.length > 0) {
      summary.push(`<div style="margin: 8px 0; font-size: 0.78rem; color: var(--ink-soft);">Pratos selecionados (${state.selectedDishes.length}):</div>`);
      state.selectedDishes.forEach(dish => {
        if (dish.preco > 0) {
          summary.push(`
            <div class="order-line">
              <span style="padding-left: 12px;">  ${dish.id} (gourmet)</span>
              <span>+${money(dish.preco)}</span>
            </div>
          `);
          total += dish.preco;
        }
      });
    }

    if (state.selectedExtras.length > 0) {
      summary.push(`<div style="margin: 8px 0; font-size: 0.78rem; color: var(--ink-soft);">Extras:</div>`);
      state.selectedExtras.forEach(extra => {
        summary.push(`
          <div class="order-line">
            <span style="padding-left: 12px;">  ${extra.id}</span>
            <span>+${money(extra.preco)}</span>
          </div>
        `);
        total += extra.preco;
      });
    }

    summary.push(`
      <div class="order-line">
        <span>TOTAL</span>
        <span>${money(total)}</span>
      </div>
    `);

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
    lines.push(`Olá, *${state.data.loja.nome}*! Gostaria de fazer o seguinte pedido:`);
    lines.push("");
    lines.push(`*Plano:* ${state.plano.nome}`);
    lines.push(`*Valor do plano:* ${money(state.plano.preco)}`);

    if (state.selectedDishes.length > 0) {
      lines.push("");
      lines.push("*Pratos selecionados:*");
      state.selectedDishes.forEach(d => {
        const addon = d.preco > 0 ? ` (+${money(d.preco)})` : "";
        lines.push(`• ${d.id}${addon}`);
      });
    }

    if (state.selectedExtras.length > 0) {
      lines.push("");
      lines.push("*Extras:*");
      state.selectedExtras.forEach(e => {
        lines.push(`• ${e.id} - ${money(e.preco)}`);
      });
    }

    let total = state.plano.preco;
    state.selectedDishes.forEach(d => total += d.preco);
    state.selectedExtras.forEach(e => total += e.preco);

    lines.push("");
    lines.push(`*Total: ${money(total)}*`);
    lines.push("");
    lines.push(`*Nome:* ${name}`);
    lines.push(`*Endereço:* ${address}`);
    lines.push(`*Forma de pagamento:* ${payment}`);

    const message = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${state.data.loja.whatsapp}?text=${message}`;
    window.open(url, "_blank");
  }

  // -------------------------------------------------------------------
  // navegação global
  // -------------------------------------------------------------------
  window.startPlanos = function() {
    document.getElementById("hero-section").classList.remove("active");
    renderStep1();
  };

  window.goToHero = function() {
    document.querySelectorAll(".step-view").forEach(s => s.classList.remove("active"));
    document.getElementById("hero-section").classList.add("active");
    window.scrollTo(0, 0);
  };

  function nextStep() {
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step3 = document.getElementById("step3");

    if (step1.classList.contains("active")) {
      renderStep2();
    } else if (step2.classList.contains("active")) {
      renderStep3();
    } else if (step3.classList.contains("active")) {
      renderStep4();
    }
  }

  function goToStep(n) {
    document.querySelectorAll(".step-view").forEach(s => s.classList.remove("active"));
    document.getElementById("step" + n).classList.add("active");
    window.scrollTo(0, 0);
  }

  // inicializar
  init();
})();
