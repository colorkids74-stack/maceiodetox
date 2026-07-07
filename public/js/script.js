/* ===================================================================
   MACEIÓ DETOX — script.js
   Lê os dados de window.MENU_DATA (data/menu.js), monta o cardápio,
   controla o carrinho e monta a mensagem de pedido para o WhatsApp.
=================================================================== */

(function () {
  const money = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
  const MIN_ORDER_QTY = 5; // pedido mínimo total (em unidades) para liberar o envio no WhatsApp

  let DATA = null;
  let cart = {}; // { dishId: quantidade }
  let activeCategory = "all";

  // -------- referências ao DOM --------
  const categoryPillsEl = document.getElementById("categoryPills");
  const menuContentEl = document.getElementById("menuContent");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCountEl = document.getElementById("cartCount");
  const floatingCountEl = document.getElementById("floatingCartCount");
  const cartDrawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("overlay");
  const formError = document.getElementById("formError");

  function fillStoreInfo() {
    document.getElementById("footerWhatsapp").textContent = "WhatsApp: " + formatPhoneDisplay(DATA.loja.whatsapp);
    document.getElementById("footerHorario").textContent = DATA.loja.horario;
    document.getElementById("footerEndereco").textContent = DATA.loja["endereçoResumo"];
  }

  function formatPhoneDisplay(phone) {
    // 5582900000000 -> (82) 90000-0000
    const digits = phone.replace(/\D/g, "");
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0,5)}-${rest.slice(5)}`;
    return `(${ddd}) ${rest}`;
  }

  // -------- montar pílulas de categoria --------
  function renderCategoryPills() {
    let html = `<button class="pill active" data-cat="all">Todos</button>`;
    DATA.categorias.forEach(cat => {
      html += `<button class="pill" data-cat="${cat.id}">${cat.nome}</button>`;
    });
    categoryPillsEl.innerHTML = html;
    categoryPillsEl.querySelectorAll(".pill").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        categoryPillsEl.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderMenu();
      });
    });
  }

  // -------- montar cardápio (agrupado por categoria) --------
  function renderMenu() {
    const categories = activeCategory === "all"
      ? DATA.categorias
      : DATA.categorias.filter(c => c.id === activeCategory);

    let html = "";
    categories.forEach(cat => {
      const dishes = DATA.pratos.filter(p => p.categoria === cat.id);
      if (dishes.length === 0) return;
      html += `
        <div class="section-head">
          <div>
            <span class="eyebrow">Cardápio</span>
            <h2>${cat.nome}</h2>
          </div>
        </div>
        <div class="dish-grid">
          ${dishes.map(dishCardHTML).join("")}
        </div>`;
    });

    menuContentEl.innerHTML = html || `<p style="color:var(--ink-soft);">Nenhum prato disponível nessa categoria no momento.</p>`;

    menuContentEl.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.id));
    });
  }

  function dishCardHTML(dish) {
    const photoHTML = dish.foto
      ? `<img src="${dish.foto}" alt="${dish.nome}">`
      : `<span class="placeholder-initial">${dish.nome.charAt(0)}</span>`;
    const tagsHTML = (dish.tags || []).map(t => `<span class="dish-tag">${t}</span>`).join("");
    return `
      <article class="dish-card">
        <div class="dish-photo">
          ${photoHTML}
          <div class="dish-tags">${tagsHTML}</div>
        </div>
        <div class="dish-body">
          <h3>${dish.nome}</h3>
          <p>${dish.descricao}</p>
          <div class="dish-footer">
            <span class="dish-price">${money(dish.preco)}</span>
            <button class="add-btn" data-id="${dish.id}" aria-label="Adicionar ${dish.nome}">+</button>
          </div>
        </div>
      </article>`;
  }

  // -------- carrinho --------
  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    openCart();
  }
  function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    renderCart();
  }
  function removeItem(id) {
    delete cart[id];
    renderCart();
  }
  function cartEntries() {
    return Object.keys(cart).map(id => {
      const dish = DATA.pratos.find(p => p.id === id);
      return { dish, qty: cart[id] };
    }).filter(e => e.dish);
  }
  function cartTotal() {
    return cartEntries().reduce((sum, e) => sum + e.dish.preco * e.qty, 0);
  }
  function renderCart() {
    const entries = cartEntries();
    const totalItems = entries.reduce((s, e) => s + e.qty, 0);
    cartCountEl.textContent = totalItems;
    floatingCountEl.textContent = `${totalItems} · ${money(cartTotal())}`;
    cartTotalEl.textContent = money(cartTotal());

    const sendBtn = document.getElementById("sendOrderBtn");
    const noteEl = document.getElementById("minOrderNote");
    if (totalItems === 0) {
      noteEl.className = "min-order-note";
      noteEl.textContent = "";
      sendBtn.disabled = true;
    } else if (totalItems < MIN_ORDER_QTY) {
      const faltam = MIN_ORDER_QTY - totalItems;
      noteEl.className = "min-order-note warning";
      noteEl.textContent = `Pedido mínimo de ${MIN_ORDER_QTY} unidades. Falta${faltam > 1 ? "m" : ""} ${faltam} unidade${faltam > 1 ? "s" : ""} para liberar o envio.`;
      sendBtn.disabled = true;
    } else {
      noteEl.className = "min-order-note ok";
      noteEl.textContent = "Pedido mínimo atingido — pode enviar!";
      sendBtn.disabled = false;
    }

    if (entries.length === 0) {
      cartItemsEl.innerHTML = `<div class="cart-empty">Seu carrinho está vazio.<br>Adicione pratos do cardápio para começar.</div>`;
      return;
    }

    cartItemsEl.innerHTML = entries.map(({ dish, qty }) => `
      <div class="cart-item">
        <div class="thumb">${dish.foto ? `<img src="${dish.foto}" alt="${dish.nome}">` : dish.nome.charAt(0)}</div>
        <div class="cart-item-info">
          <h4>${dish.nome}</h4>
          <span class="price">${money(dish.preco)}</span>
          <div class="qty-control">
            <button data-action="dec" data-id="${dish.id}">−</button>
            <span>${qty}</span>
            <button data-action="inc" data-id="${dish.id}">+</button>
          </div>
          <button class="remove-item" data-action="remove" data-id="${dish.id}">Remover</button>
        </div>
      </div>`).join("");

    cartItemsEl.querySelectorAll("[data-action]").forEach(btn => {
      const id = btn.dataset.id;
      btn.addEventListener("click", () => {
        if (btn.dataset.action === "inc") changeQty(id, 1);
        if (btn.dataset.action === "dec") changeQty(id, -1);
        if (btn.dataset.action === "remove") removeItem(id);
      });
    });
  }

  // -------- abrir/fechar carrinho --------
  function openCart() {
    cartDrawer.classList.add("open");
    overlay.classList.add("open");
  }
  function closeCart() {
    cartDrawer.classList.remove("open");
    overlay.classList.remove("open");
  }
  document.getElementById("openCartBtn").addEventListener("click", openCart);
  document.getElementById("floatingCartBtn").addEventListener("click", openCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);

  // -------- enviar pedido pelo WhatsApp --------
  document.getElementById("sendOrderBtn").addEventListener("click", () => {
    const entries = cartEntries();
    formError.textContent = "";

    if (entries.length === 0) {
      formError.textContent = "Adicione ao menos um prato ao pedido.";
      return;
    }
    const totalItems = entries.reduce((s, e) => s + e.qty, 0);
    if (totalItems < MIN_ORDER_QTY) {
      formError.textContent = `Pedido mínimo de ${MIN_ORDER_QTY} unidades. Adicione mais itens para continuar.`;
      return;
    }
    const name = document.getElementById("custName").value.trim();
    const address = document.getElementById("custAddress").value.trim();
    const payment = document.getElementById("custPayment").value;

    if (!name || !address || !payment) {
      formError.textContent = "Preencha nome, endereço e forma de pagamento.";
      return;
    }

    const lines = [];
    lines.push(`Olá, *${DATA.loja.nome}*! Gostaria de fazer o seguinte pedido:`);
    lines.push("");
    entries.forEach(({ dish, qty }) => {
      lines.push(`• ${qty}x ${dish.nome} — ${money(dish.preco * qty)}`);
    });
    lines.push("");
    lines.push(`*Total: ${money(cartTotal())}*`);
    lines.push("");
    lines.push(`*Nome:* ${name}`);
    lines.push(`*Endereço:* ${address}`);
    lines.push(`*Forma de pagamento:* ${payment}`);

    const message = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${DATA.loja.whatsapp}?text=${message}`;
    window.open(url, "_blank");
  });

  // -------- menu mobile (rolagem até cardápio) --------
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("cardapio").scrollIntoView({ behavior: "smooth" });
  });

  // -------- exibir botão flutuante só depois de rolar um pouco --------
  const floatingBtn = document.getElementById("floatingCartBtn");
  function toggleFloatingCart() {
    if (window.scrollY > 260) {
      floatingBtn.classList.add("visible");
    } else {
      floatingBtn.classList.remove("visible");
    }
  }
  window.addEventListener("scroll", toggleFloatingCart, { passive: true });
  toggleFloatingCart();

  // -------- inicialização --------
  renderCategoryPills();
  renderMenu();
  renderCart();
})();
