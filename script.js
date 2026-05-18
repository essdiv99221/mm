const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const animatedCards = document.querySelectorAll('.animate-card');
const animatedSections = document.querySelectorAll('.animate-section');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.2 }
);

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('nav-open');
    menuToggle.textContent = navLinks.classList.contains('nav-open') ? '✕' : '☰';
  });
}

animatedCards.forEach((card) => observer.observe(card));
animatedSections.forEach((section) => observer.observe(section));

// --- Storage helpers ---
function getStorage(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}
function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Ensure an initial admin exists for first use
function ensureDefaultAdmin() {
  const users = getStorage('mahdypaperusUsers', []);
  if (!users.length) {
    users.push({ name: 'Admin', email: 'admin@mahdypaperus.com', password: 'admin12', isAdmin: true });
    setStorage('mahdypaperusUsers', users);
  }
}
ensureDefaultAdmin();

// Secret admin credentials are verified on the server using Railway environment variables.

// --- Users, session, products, orders ---
function getUsers() { return getStorage('mahdypaperusUsers', []); }
function saveUsers(u) { setStorage('mahdypaperusUsers', u); }
function getSession() { return getStorage('mahdypaperusSession', null); }
function setSession(s) { setStorage('mahdypaperusSession', s); }
function clearSession() { localStorage.removeItem('mahdypaperusSession'); }
function currentUser() { const s = getSession(); if (!s) return null; return getUsers().find(u => u.email === s.email) || null; }

function getProducts() { return getStorage('mahdypaperusProducts', []); }
function saveProducts(p) { setStorage('mahdypaperusProducts', p); }

function getOrders() { return getStorage('mahdypaperusOrders', []); }
function saveOrders(o) { setStorage('mahdypaperusOrders', o); }

// --- Cart ---
function getCart() { return getStorage('mahdypaperusCart', []); }
function saveCart(c) { setStorage('mahdypaperusCart', c); }

function formatPrice(v) { return Number(v).toFixed(2) + ' ج.م'; }

// Sync initial static DOM products into storage if missing
function syncProductsFromDOM() {
  const existing = getProducts();
  if (existing && existing.length) return;
  const cards = document.querySelectorAll('.product-grid .product-card');
  const list = [];
  cards.forEach(card => {
    const id = card.dataset.id || (`p${Math.random().toString(36).slice(2,8)}`);
    const price = parseFloat(card.dataset.price || '0');
    const name = card.querySelector('span')?.textContent || card.querySelector('h3')?.textContent || 'منتج';
    const desc = card.querySelector('p')?.textContent || '';
    list.push({ id, name, desc, price });
  });
  if (list.length) saveProducts(list);
}

function renderProductsGrid() {
  const container = document.querySelector('.product-grid');
  if (!container) return;
  const products = getProducts();
  container.innerHTML = products.map(p => `
    <article class="product-card" data-id="${p.id}" data-price="${p.price}">
      <span>${p.name}</span>
      <p>${p.desc || ''}</p>
      <div class="product-meta">
        <strong>${p.price.toFixed(2)} ج.م</strong>
        <button class="btn btn-cart">أضف للسلة</button>
      </div>
    </article>
  `).join('');
  setupProductButtons();
}

function setupProductButtons() {
  document.querySelectorAll('.btn-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.product-card');
      if (!card) return;
      const product = { id: card.dataset.id, name: card.querySelector('span')?.textContent || 'منتج', price: parseFloat(card.dataset.price||0) };
      const cart = getCart();
      const ex = cart.find(i => i.id === product.id);
      if (ex) ex.quantity += 1; else cart.push({ ...product, quantity: 1 });
      saveCart(cart);
      // open drawer if exists
      const drawer = document.getElementById('cart-drawer');
      if (drawer) { drawer.classList.add('open'); document.body.classList.add('cart-open'); renderCart(); }
    });
  });
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;
  const cart = getCart();
  if (!cart.length) { container.innerHTML = '<p class="empty-cart">لم تضف أي منتج بعد.</p>'; if (totalEl) totalEl.textContent = formatPrice(0); return; }
  let total = 0;
  container.innerHTML = cart.map(it=>{ total += it.price*it.quantity; return `
    <div class="cart-item">
      <div class="cart-item-meta"><strong>${it.name}</strong><span>${formatPrice(it.price)} × ${it.quantity}</span></div>
      <strong>${formatPrice(it.price*it.quantity)}</strong>
    </div>
  `}).join('');
  if (totalEl) totalEl.textContent = formatPrice(total);
}

// --- Auth handlers ---
function showAuthMessage(msg, type='info') { const el = document.getElementById('auth-message'); if (!el) return; el.textContent = msg; el.className = `auth-message ${type}`; }

function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value.trim();
  const users = getUsers();
  const user = users.find(u => u.email===email && u.password===password);
  if (!user) return showAuthMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'error');
  setSession({ email: user.email });
  if (user.isAdmin) window.location.href = 'admin.html'; else window.location.href = 'account.html';
}

function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value.trim();
  const users = getUsers();
  if (users.some(u => u.email===email)) return showAuthMessage('هذا البريد مسجّل بالفعل.', 'error');
  users.push({ name, email, password, isAdmin: false });
  saveUsers(users); setSession({ email }); showAuthMessage('تم إنشاء الحساب. يتم تحويلك...', 'success');
  setTimeout(()=> window.location.href='account.html',700);
}

function handleLogout() { clearSession(); window.location.href = 'login.html'; }

// --- Checkout & Orders ---
function handleCheckoutSubmit(e) {
  e.preventDefault();
  const user = currentUser();
  if (!user) return showAuthMessage('يجب تسجيل الدخول أولًا قبل إتمام الدفع.', 'error');
  const form = e.target;
  const cart = getCart();
  if (!cart.length) return showAuthMessage('السلة فارغة.', 'error');
  const address = form.address.value.trim();
  const phone = form.phone.value.trim();
  // الدفع عند الاستلام فقط (COD)
  const paymentMethod = 'cod';
  const installmentCount = 1;
  const total = cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const orders = getOrders();
  const id = orders.length ? orders[orders.length-1].id+1 : 1001;
  const newOrder = { id, userEmail: user.email, items: cart, total, paymentMethod, installmentCount, address, phone, status: 'pending', payments: [], createdAt: new Date().toISOString() };
  orders.push(newOrder); saveOrders(orders); localStorage.removeItem('mahdypaperusCart'); showAuthMessage('تم إنشاء الطلب. توجه إلى حسابك.', 'success');
  setTimeout(()=> window.location.href='account.html',900);
}

function renderAccountPage() {
  const user = currentUser(); if (!user) { window.location.href='login.html'; return; }
  const nameEl = document.getElementById('account-name'); const emailEl = document.getElementById('account-email');
  if (nameEl) nameEl.textContent = user.name; if (emailEl) emailEl.textContent = user.email;
  const ordersEl = document.getElementById('orders-list'); if (!ordersEl) return;
  const orders = getOrders().filter(o=>o.userEmail===user.email);
  if (!orders.length) { ordersEl.innerHTML = '<p class="empty-cart">لا يوجد طلبات حتى الآن.</p>'; return; }
  ordersEl.innerHTML = orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o=>{
    const paid = (o.payments||[]).reduce((s,p)=>s+p.amount,0);
    const remaining = Math.max(0,o.total-paid);
    const statusMap = { pending:'قيد التجهيز', partial:'مدفوع جزئياً', paid:'مدفوع', shipped:'جاري التوصيل', delivered:'تم التوصيل' };
    return `
      <div class="order-card">
        <div class="order-card-head"><span>الطلب #${o.id}</span><span class="status-badge">${statusMap[o.status]||o.status}</span></div>
        <p>المجموع: <strong>${formatPrice(o.total)}</strong></p>
        <p>مدفوع: <strong>${formatPrice(paid)}</strong> — المتبقي: <strong>${formatPrice(remaining)}</strong></p>
        <p>طريقة الدفع: ${o.paymentMethod==='cod'?'الدفع عند الاستلام':(o.paymentMethod==='installment'?'تقسيط':'دفع كامل')}</p>
        <p>تاريخ: ${new Date(o.createdAt).toLocaleDateString('ar-EG')}</p>
        <div style="margin-top:0.6rem; display:flex; gap:0.6rem;">
          ${ (o.paymentMethod==='cod' && remaining>0) ? `<button class="btn btn-primary confirm-cod" data-id="${o.id}">تأكيد الدفع عند الاستلام</button>` : '' }
          <a class="btn btn-secondary" href="invoice.html?order=${o.id}">عرض الفاتورة</a>
        </div>
      </div>
    `;
  }).join('');
  // attach pay handlers
  document.querySelectorAll('.pay-now').forEach(btn=>btn.addEventListener('click',()=>{
    const orderId = parseInt(btn.dataset.order,10); window.location.href = `checkout.html?pay=${orderId}`;
  }));

  // attach confirm COD handlers for customers
  document.querySelectorAll('.confirm-cod').forEach(btn=>btn.addEventListener('click', (e)=>{
    const id = parseInt(e.target.dataset.id,10);
    if (!confirm('هل أنت متأكد أنك استلمت هذا الطلب؟ سيتم تسجيل الدفع نقداً.')) return;
    confirmCodPayment(id);
  }));
}

function confirmCodPayment(orderId) {
  const orders = getOrders(); const o = orders.find(x=>x.id===orderId);
  if (!o) return alert('الطلب غير موجود');
  const paid = (o.payments||[]).reduce((s,p)=>s+p.amount,0);
  const remaining = Math.max(0,o.total-paid);
  if (remaining<=0) return alert('لا يوجد مبلغ متبقي لهذا الطلب');
  o.payments = o.payments||[]; o.payments.push({ amount: remaining, date: new Date().toISOString() });
  o.status = 'paid';
  saveOrders(orders);
  renderAccountPage(); renderAdminOrders();
  alert('تم تأكيد الاستلام وتسجيل الدفع نقداً. شكراً!');
}

// --- Admin functions ---
function initAdminPage() {
  const user = currentUser(); if (!user || !user.isAdmin) { window.location.href='login.html'; return; }
  renderAdminProducts(); renderAdminOrders(); renderAdminUsers();
  const addForm = document.getElementById('admin-add-product');
  if (addForm) addForm.addEventListener('submit', handleAdminAddProduct);
}

function renderAdminProducts() {
  const list = document.getElementById('admin-products'); if (!list) return;
  const products = getProducts();
  list.innerHTML = products.map(p=>`
    <div class="order-card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
        <div><strong>${p.name}</strong><div style="color:var(--text-soft)">${p.id}</div></div>
        <div style="text-align:right">
          <div>${formatPrice(p.price)}</div>
          <div style="margin-top:0.6rem">
            <button class="btn btn-secondary edit-product" data-id="${p.id}">تعديل</button>
            <button class="btn btn-primary delete-product" data-id="${p.id}">حذف</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.delete-product').forEach(b=>b.addEventListener('click',e=>{ const id=e.target.dataset.id; deleteProduct(id); }));
  document.querySelectorAll('.edit-product').forEach(b=>b.addEventListener('click',e=>{ const id=e.target.dataset.id; fillEditProduct(id); }));
}

function handleAdminAddProduct(e) {
  e.preventDefault(); const f = e.target; const id = f.id.value.trim(); const name = f.name.value.trim(); const price = parseFloat(f.price.value||0); const desc = f.desc.value.trim();
  const products = getProducts(); const idx = products.findIndex(p=>p.id===id);
  if (idx>=0) { products[idx] = { id, name, desc, price }; showAdminNotice('تم تحديث المنتج'); }
  else { products.push({ id, name, desc, price }); showAdminNotice('تم إضافة المنتج'); }
  saveProducts(products); renderAdminProducts(); renderProductsGrid(); f.reset();
}

function deleteProduct(id) { const products = getProducts().filter(p=>p.id!==id); saveProducts(products); renderAdminProducts(); renderProductsGrid(); }

function fillEditProduct(id) { const p = getProducts().find(x=>x.id===id); if(!p) return; const f = document.getElementById('admin-add-product'); f.id.value = p.id; f.name.value = p.name; f.price.value = p.price; f.desc.value = p.desc; }

function showAdminNotice(msg) { const el = document.getElementById('auth-message'); if (el) { el.textContent = msg; el.className='auth-message success'; setTimeout(()=>el.textContent='',2500); } }

function renderAdminOrders() {
  const container = document.getElementById('admin-orders'); if (!container) return; const orders = getOrders(); if(!orders.length) { container.innerHTML='<p class="empty-cart">لا يوجد طلبات</p>'; return; }
  container.innerHTML = orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o=>{
    const paid = (o.payments||[]).reduce((s,p)=>s+p.amount,0); const remaining = Math.max(0,o.total-paid);
    return `
      <div class="order-card">
        <div class="order-card-head"><span>الطلب #${o.id}</span><span>${o.userEmail}</span></div>
        <p>المجموع: <strong>${formatPrice(o.total)}</strong> — مدفوع: <strong>${formatPrice(paid)}</strong> — المتبقي: <strong>${formatPrice(remaining)}</strong></p>
        <div style="display:flex; gap:0.6rem; margin-top:0.6rem">
          <button class="btn btn-primary mark-paid" data-id="${o.id}">تسجيل دفعة</button>
          <button class="btn btn-secondary change-status" data-id="${o.id}">تغيير الحالة</button>
          <a class="btn btn-secondary" href="invoice.html?order=${o.id}">فاتورة</a>
        </div>
      </div>
    `;
  }).join('');
  // hooks
  document.querySelectorAll('.mark-paid').forEach(b=>b.addEventListener('click', e=>{ const id=parseInt(e.target.dataset.id,10); promptRegisterPayment(id); }));
  document.querySelectorAll('.change-status').forEach(b=>b.addEventListener('click', e=>{ const id=parseInt(e.target.dataset.id,10); changeOrderStatusPrompt(id); }));
}

function promptRegisterPayment(orderId) {
  const amount = parseFloat(prompt('ادخل مبلغ الدفع (ج.م)')||'0'); if (!amount || amount<=0) return; const orders = getOrders(); const o = orders.find(x=>x.id===orderId); if(!o) return alert('طلب غير موجود'); o.payments = o.payments||[]; o.payments.push({ amount, date: new Date().toISOString() }); const paid = o.payments.reduce((s,p)=>s+p.amount,0); if (paid>=o.total) o.status='paid'; else o.status='partial'; saveOrders(orders); renderAdminOrders(); renderAccountPage(); alert('تم تسجيل الدفع'); }

function changeOrderStatusPrompt(orderId) {
  const status = prompt('أدخل الحالة الجديدة (pending, paid, shipped, delivered)'); if (!status) return; const orders = getOrders(); const o = orders.find(x=>x.id===orderId); if(!o) return; o.status = status; saveOrders(orders); renderAdminOrders(); }

function renderAdminUsers() {
  const container = document.getElementById('admin-users'); if (!container) return; const users = getUsers(); container.innerHTML = users.map(u=>`
    <div class="order-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><strong>${u.name}</strong><div style="color:var(--text-soft)">${u.email}</div></div>
        <div style="text-align:right">
          <div>${u.isAdmin?'<strong>مدير</strong>':'عميل'}</div>
          <div style="margin-top:0.6rem">
            <button class="btn btn-primary toggle-admin" data-email="${u.email}">${u.isAdmin?'سحب صلاحيات':'منح صلاحيات'}</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.toggle-admin').forEach(b=>b.addEventListener('click', e=>{ const email=e.target.dataset.email; toggleAdminRights(email); }));
}

function toggleAdminRights(email) { const users = getUsers(); const u = users.find(x=>x.email===email); if(!u) return; u.isAdmin = !u.isAdmin; saveUsers(users); renderAdminUsers(); }

// --- Reset password simulation ---
function requestReset(email) {
  const users = getUsers(); const u = users.find(x=>x.email===email); if(!u) return null; const token = Math.random().toString(36).slice(2,8).toUpperCase(); const tokens = getStorage('mahdypaperusResetTokens', {}); tokens[email]=token; setStorage('mahdypaperusResetTokens', tokens); return token; }

function performReset(email, token, newPassword) {
  const tokens = getStorage('mahdypaperusResetTokens', {}); if (tokens[email] !== token) return false; const users = getUsers(); const u = users.find(x=>x.email===email); if(!u) return false; u.password = newPassword; saveUsers(users); delete tokens[email]; setStorage('mahdypaperusResetTokens', tokens); return true; }

// --- Invoice rendering ---
function renderInvoiceFromQuery() {
  const params = new URLSearchParams(location.search); const id = parseInt(params.get('order')||params.get('id')||params.get('o'),10); if (!id) return;
  const orders = getOrders(); const o = orders.find(x=>x.id===id); const el = document.getElementById('invoice-content'); if(!o || !el) return el.innerHTML = '<p>الطلب غير موجود</p>';
  const user = getUsers().find(u=>u.email===o.userEmail) || { name: o.userEmail, email: o.userEmail };
  const paid = (o.payments||[]).reduce((s,p)=>s+p.amount,0); const remaining = Math.max(0,o.total-paid);
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2>فاتورة بيع</h2>
        <div>Mahdypaperus</div>
      </div>
      <div>
        <div>فاتورة رقم: <strong>#${o.id}</strong></div>
        <div>تاريخ: ${new Date(o.createdAt).toLocaleString('ar-EG')}</div>
      </div>
    </div>
    <hr />
    <div style="display:flex; gap:2rem; justify-content:space-between;">
      <div>
        <h4>بيانات العميل</h4>
        <div>الاسم: ${user.name}</div>
        <div>البريد: ${user.email}</div>
        <div>الهاتف: ${o.phone || '-'}</div>
        <div>العنوان: ${o.address || '-'}</div>
      </div>
      <div>
        <h4>تفاصيل الدفع</h4>
        <div>طريقة: ${o.paymentMethod==='cod'?'الدفع عند الاستلام':(o.paymentMethod==='installment'?'تقسيط':'دفع كامل')}</div>
        <div>مجموع: ${formatPrice(o.total)}</div>
        <div>مدفوع: ${formatPrice(paid)}</div>
        <div>المتبقي: ${formatPrice(remaining)}</div>
      </div>
    </div>
    <hr />
    <div>
      <h4>العناصر</h4>
      <div>
        ${o.items.map(it=>`<div style="display:flex; justify-content:space-between;"><div>${it.name} × ${it.quantity}</div><div>${formatPrice(it.price*it.quantity)}</div></div>`).join('')}
      </div>
    </div>
    <hr />
    <div>
      <h4>سجل الدفعات</h4>
      <div>
        ${(o.payments||[]).map(p=>`<div>${new Date(p.date).toLocaleString('ar-EG')} — ${formatPrice(p.amount)}</div>`).join('')}
      </div>
    </div>
  `;
}

// --- Initialization ---
function initPage() {
  // sync DOM products to storage once
  syncProductsFromDOM();
  // render products grid if present
  renderProductsGrid();

  // common elements
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutSummary = document.getElementById('checkout-summary');
  const openCartButton = document.getElementById('open-cart');
  const closeCartButton = document.querySelector('.close-cart');
  const cartDrawer = document.getElementById('cart-drawer');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (checkoutForm) { checkoutForm.addEventListener('submit', handleCheckoutSubmit); renderCheckoutSummary(); }
  if (openCartButton) openCartButton.addEventListener('click', () => { if (!getCart().length) return alert('السلة فارغة'); window.location.href='checkout.html'; });
  if (closeCartButton) closeCartButton.addEventListener('click', ()=>{ if (cartDrawer) { cartDrawer.classList.remove('open'); document.body.classList.remove('cart-open'); } });

  // account page
  if (document.getElementById('orders-list')) renderAccountPage();

  // admin
  if (document.getElementById('admin-products')) initAdminPage();

  // invoice
  if (document.getElementById('invoice-content')) renderInvoiceFromQuery();

  // reset page handlers
  const requestResetForm = document.getElementById('request-reset');
  const performResetForm = document.getElementById('perform-reset');
  if (requestResetForm) requestResetForm.addEventListener('submit', (e)=>{ e.preventDefault(); const email = e.target.email.value.trim().toLowerCase(); const token = requestReset(email); const msg = document.getElementById('reset-message'); if (!token) return msg.textContent='البريد غير موجود'; msg.textContent = `رمز الاسترجاع (محاكاة): ${token}`; });
  if (performResetForm) performResetForm.addEventListener('submit', (e)=>{ e.preventDefault(); const em=e.target.email.value.trim().toLowerCase(); const token=e.target.token.value.trim(); const pw=e.target.password.value.trim(); const ok = performReset(em,token,pw); const msg=document.getElementById('reset-message'); if(ok) { msg.textContent='تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.'; setTimeout(()=>window.location.href='login.html',900); } else msg.textContent='الرمز غير صحيح أو البريد خاطئ.'; });

  // secret admin page handler (hidden page)
  const secretForm = document.getElementById('secret-admin-form');
  if (secretForm) secretForm.addEventListener('submit', handleSecretAdminLogin);

  // admin product add form already handled in initAdminPage

  // cart render
  if (document.getElementById('cart-items')) renderCart();
}

async function handleSecretAdminLogin(e) {
  e.preventDefault(); const f = e.target; const email = f.email.value.trim().toLowerCase(); const pw = f.password.value.trim();
  try {
    const response = await fetch('/api/secret-admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = data.error || 'بيانات الدخول خاطئة';
      return alert(msg);
    }
    const users = getUsers(); let u = users.find(x=>x.email===email);
    if (!u) { u = { name: 'Hidden Admin', email, password: pw, isAdmin: true }; users.push(u); }
    else { u.isAdmin = true; u.password = pw; }
    saveUsers(users);
    setSession({ email });
    alert('تم تسجيل الدخول كمدير مخفي');
    window.location.href = 'admin.html';
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء التحقق من بيانات المدير. حاول مرة أخرى لاحقًا.');
  }
}

function renderCheckoutSummary() {
  const el = document.getElementById('checkout-summary'); if (!el) return; const cart = getCart(); if (!cart.length) { el.innerHTML='<p class="empty-cart">السلة فارغة</p>'; return; } const total = cart.reduce((s,i)=>s+i.price*i.quantity,0); el.innerHTML = ` <div class="checkout-summary-card"><h3>مراجعة</h3>${cart.map(it=>`<div style="display:flex;justify-content:space-between">${it.name} × ${it.quantity} <strong>${formatPrice(it.price*it.quantity)}</strong></div>`).join('')}<div class="checkout-total"><span>المجموع النهائي</span><strong>${formatPrice(total)}</strong></div></div>`; }

window.addEventListener('load', () => {
  document.querySelectorAll('.animate-section').forEach((section, index) => { section.style.animationDelay = `${index * 0.08 + 0.1}s`; });
  initPage();
});

