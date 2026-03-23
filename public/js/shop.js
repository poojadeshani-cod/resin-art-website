(function () {

const productListEl = document.getElementById('product-list');
const productCountLabelEl = document.getElementById('product-count-label');

const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartCountBadgeEl = document.getElementById('cart-count-badge');
const clearCartBtnEl = document.getElementById('clear-cart-btn');
const whatsappCheckoutBtnEl = document.getElementById('whatsapp-checkout-btn');
const orderNoteEl = document.getElementById('order-note');
const customerNameEl = document.getElementById('customer-name');
const customerPhoneEl = document.getElementById('customer-phone');
const customerAddressEl = document.getElementById('customer-address');

const CART_KEY = "resin_cart_v1";

let CURRENT_PRODUCTS = [];

function escapeHtml(unsafe) {
  return String(unsafe).replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#039;';
      default:
        return m;
    }
  });
}

function normalizeWhatsAppDigits(number) {
  return (number || '').replace(/\D/g, '');
}

function buildWhatsAppCheckoutMessage({ cart, note, customerName, customerPhone, customerAddress, total }) {
  const itemsLines = cart
    .map((item) => `- ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  const noteLine = note ? `\nCustomization note: ${note}` : '';
  const nameLine = customerName ? `Name: ${customerName}` : 'Name: -';
  const phoneLine = customerPhone ? `Phone: ${customerPhone}` : 'Phone: -';
  const addressLine = customerAddress ? `Address: ${customerAddress}` : 'Address: -';

  return `Hi! I'd like to place an order from shreyadeshani.art.\n\nItems:\n${itemsLines}\n\nTotal: ₹${total.toFixed(
    2
  )}\n\n${nameLine}\n${phoneLine}\n${addressLine}${noteLine}\n\nThank you!`;
}

function loadCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch{
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function renderInlineAddToCartControls() {
  // Used on server-rendered EJS product cards (e.g., category/product pages).
  // We convert "Add to Cart" buttons into "- qty +" controls using localStorage state.
  const cart = loadCart();
  const controlsEls = document.querySelectorAll("[data-product]");

  controlsEls.forEach((el) => {
    const raw = el.dataset.product;
    if (!raw) return;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const id = parsed._id;
    if (!id) return;

    const cartItem = cart.find((c) => c._id === id);
    const qty = cartItem ? Number(cartItem.quantity || 0) : 0;

    if (qty <= 0) {
      el.className = "btn btn-sm btn-add-to-cart";
      el.textContent = "Add to Cart";
      el.dataset.id = id;
      return;
    }

    // Turn the element into a "- qty +" control container.
    el.className = "qty-box";
    el.dataset.id = id;
    el.innerHTML = `
      <span class="qty-btn minus" role="button" tabindex="0" aria-label="Decrease quantity">−</span>
      <span class="qty-count">${qty}</span>
      <span class="qty-btn plus" role="button" tabindex="0" aria-label="Increase quantity">+</span>
    `;
  });
}

function renderCart(){

  const cart = loadCart();

  const totalQty = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (cartCountBadgeEl) {
    cartCountBadgeEl.textContent = totalQty;
  }

  if (!cartItemsEl || !cartTotalEl) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalEl.textContent = total.toFixed(2);

  if (whatsappCheckoutBtnEl) {
    const disabled = cart.length === 0;
    whatsappCheckoutBtnEl.disabled = disabled;
    whatsappCheckoutBtnEl.style.opacity = disabled ? '0.6' : '1';
  }

  cartItemsEl.innerHTML = "";

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty-state">
        <h3 class="cart-empty-title">Your cart is empty</h3>
        <p class="cart-empty-sub">Add a resin piece to start your custom order.</p>
        <a href="/" class="btn btn-outline-dark rounded-pill px-4 mt-3">Browse products</a>
      </div>
    `;
    return;
  }

  cart.forEach((item) => {
    const subtotal = item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-item-card";

    row.innerHTML = `
      <img
        src="${item.imageUrl || ''}"
        alt="${escapeHtml(item.name)}"
        class="cart-item-thumb"
        onerror="this.style.display='none'"
      />

      <div class="cart-item-meta">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="min-width-0">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-unit">₹${item.price.toFixed(2)} each</div>
          </div>

          <button
            type="button"
            class="cart-item-remove"
            data-action="remove"
            data-id="${item._id}"
          >
            Remove
          </button>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap">
          <div class="cart-qty-box" role="group" aria-label="Quantity controls">
            <button
              type="button"
              class="cart-qty-btn cart-qty-minus"
              data-action="decrease"
              data-id="${item._id}"
              aria-label="Decrease quantity"
            >−</button>
            <span class="cart-qty-count">${item.quantity}</span>
            <button
              type="button"
              class="cart-qty-btn cart-qty-plus"
              data-action="increase"
              data-id="${item._id}"
              aria-label="Increase quantity"
            >+</button>
          </div>

          <div class="cart-item-subtotal text-end">
            <span class="cart-item-subtotal-label text-muted small d-block">Subtotal</span>
            <strong>₹${subtotal.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    `;

    cartItemsEl.appendChild(row);
  });

}

function attachCartEvents() {
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      let cart = loadCart();
      const item = cart.find((c) => c._id === id);

      if (action === "remove") {
        cart = cart.filter((c) => c._id !== id);
      } else if (item) {
        if (action === "increase") item.quantity++;
        if (action === "decrease") item.quantity--;

        if (item.quantity <= 0) {
          cart = cart.filter((c) => c._id !== id);
        }
      } else {
        return;
      }

      saveCart(cart);
      renderCart();

      // Keep the index/cart preview in sync with quantities.
      if (productListEl) renderProducts(CURRENT_PRODUCTS);
      renderInlineAddToCartControls();
    });
  }

  if (clearCartBtnEl) {
    clearCartBtnEl.addEventListener("click", () => {
      localStorage.removeItem(CART_KEY);
      renderCart();
      if (productListEl) renderProducts(CURRENT_PRODUCTS);
      renderInlineAddToCartControls();
    });
  }

  if (whatsappCheckoutBtnEl) {
    whatsappCheckoutBtnEl.addEventListener("click", () => {
      const cart = loadCart();
      if (cart.length === 0) return;

      const whatsappNumber = window.WHATSAPP_NUMBER || "";
      const digits = normalizeWhatsAppDigits(whatsappNumber);
      if (!digits) {
        alert("WhatsApp number is not configured.");
        return;
      }

      const note = orderNoteEl ? orderNoteEl.value.trim() : "";
      const customerName = customerNameEl ? customerNameEl.value.trim() : "";
      const customerPhone = customerPhoneEl ? customerPhoneEl.value.trim() : "";
      const customerAddress = customerAddressEl ? customerAddressEl.value.trim() : "";

      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const message = buildWhatsAppCheckoutMessage({
        cart,
        note,
        customerName,
        customerPhone,
        customerAddress,
        total
      });

      const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
}

function attachAddToCartFromDataButtons() {
  // Handles `product.ejs` + `category.ejs` "Add to Cart" buttons.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add-to-cart[data-product]");
    if (!btn) return;

    const raw = btn.dataset.product;
    if (!raw) return;

    let product = null;
    try {
      product = JSON.parse(raw);
    } catch {
      return;
    }

    addToCart(product);
    renderCart();
    renderInlineAddToCartControls();

    if (productListEl) renderProducts(CURRENT_PRODUCTS);
  });
}

function attachInlineQtyButtonsEvents() {
  // Delegated click handler for "- qty +" controls rendered inside `.qty-box`.
  // Works for both home page and category/product pages (where we mutate EJS buttons).
  document.addEventListener("click", (e) => {
    const plusBtn = e.target.closest(".qty-btn.plus");
    const minusBtn = e.target.closest(".qty-btn.minus");
    if (!plusBtn && !minusBtn) return;

    const box = (plusBtn || minusBtn).closest(".qty-box");
    const id = box?.dataset?.id;
    // On the home page we render qty controls without a `data-product` payload;
    // this handler is only for server-rendered EJS cards (`category.ejs` / `product.ejs`).
    if (!box?.dataset?.product) return;
    if (!id) return;

    let cart = loadCart();
    const item = cart.find((c) => c._id === id);
    if (!item) return;

    if (plusBtn) item.quantity++;
    if (minusBtn) item.quantity--;

    if (item.quantity <= 0) {
      cart = cart.filter((c) => c._id !== id);
    }

    saveCart(cart);
    renderCart();
    renderInlineAddToCartControls();

    // Home page uses a dynamic product grid (renderProducts).
    if (productListEl) renderProducts(CURRENT_PRODUCTS);
  });
}

function addToCart(product){

  const cart = loadCart();

  const existing = cart.find(p=>p._id === product._id);

  if(existing){
    existing.quantity++;
  }else{
    cart.push({
      _id:product._id,
      name:product.name,
      price:product.price,
      imageUrl:product.imageUrl || "",
      quantity:1
    });
  }

  saveCart(cart);
  renderCart();
}

async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("request failed");
  return res.json();
}

async function loadProducts(){

  productListEl.innerHTML = "Loading...";

  try{

    const products = await fetchJSON("/api/products");

    CURRENT_PRODUCTS = products;

    renderProducts(products);

  }catch(e){

    productListEl.innerHTML="Failed loading products";

  }

}

function renderProducts(products){

  productListEl.innerHTML="";

  productCountLabelEl.textContent = `${products.length} items`;

  const cart = loadCart();

  products.forEach(p=>{

    const cartItem = cart.find(c=>c._id === p._id);
    const qty = cartItem ? cartItem.quantity : 0;

    const col = document.createElement("div");
    col.className="col-md-4 col-6";

    col.innerHTML=`

    <div class="card h-100">

      ${
        p.imageUrl
        ? `<img src="${p.imageUrl}" class="card-img-top" style="height:250px;object-fit:cover">`
        : ""
      }

      <div class="card-body d-flex flex-column">

        <h6>${p.name}</h6>

        <p class="text-muted small">${p.description || ""}</p>

        <div class="d-flex justify-content-between align-items-center mt-auto">

          <span>₹${p.price.toFixed(2)}</span>

          ${
            qty === 0
            ?
            `<button class="btn btn-sm btn-add" data-id="${p._id}">Add</button>`
            :
            `
            <div class="qty-box" data-id="${p._id}">
              <button type="button" class="qty-btn minus" aria-label="Decrease quantity">−</button>
              <span class="qty-count">${qty}</span>
              <button type="button" class="qty-btn plus" aria-label="Increase quantity">+</button>
            </div>
            `
          }

        </div>

      </div>

    </div>
    `;

    productListEl.appendChild(col);

  });

  attachProductEvents();

}

function attachProductEvents(){

  /* ADD */

  document.querySelectorAll(".btn-add").forEach(btn=>{

    btn.onclick = ()=>{

      const id = btn.dataset.id;

      const product = CURRENT_PRODUCTS.find(p=>p._id === id);

      addToCart(product);

      renderProducts(CURRENT_PRODUCTS);

    };

  });

  /* PLUS */

  document.querySelectorAll(".plus").forEach(btn=>{

    btn.onclick = ()=>{

      const id = btn.parentElement.dataset.id;

      const cart = loadCart();

      const item = cart.find(c=>c._id === id);

      if(item) item.quantity++;

      saveCart(cart);

      renderCart();

      renderProducts(CURRENT_PRODUCTS);

    };

  });

  /* MINUS */

  document.querySelectorAll(".minus").forEach(btn=>{

    btn.onclick = ()=>{

      const id = btn.parentElement.dataset.id;

      let cart = loadCart();

      const item = cart.find(c=>c._id === id);

      if(!item) return;

      item.quantity--;

      if(item.quantity <= 0){
        cart = cart.filter(c=>c._id !== id);
      }

      saveCart(cart);

      renderCart();

      renderProducts(CURRENT_PRODUCTS);

    };

  });

}

function init(){

  renderCart();
  renderInlineAddToCartControls();

  attachCartEvents();
  attachAddToCartFromDataButtons();
  attachInlineQtyButtonsEvents();

  if(productListEl){
    loadProducts();
  }

}

document.addEventListener("DOMContentLoaded", init);

})();