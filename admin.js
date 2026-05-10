// ===== ADMIN.JS — My Café Admin Panel (Firebase Edition) =====
import { db, ref, set, get, onValue, update, remove, push }
  from './firebase.js';

// ===== DATA STORE =====
let store = {
  settings: { shopName: 'My Café', shopDesc: 'สั่งอาหารและเครื่องดื่มออนไลน์ ง่าย สะดวก ผ่าน QR Code' },
  notifications: [],
  tables: 10,
};

// ===== FIREBASE HELPERS (แทน localStorage) =====
async function getOrders() {
  try {
    const snap = await get(ref(db, 'orders'));
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch(e) { console.error(e); return []; }
}

async function saveOrderStatus(id, status) {
  try { await update(ref(db, `orders/${id}`), { status }); } catch(e) { console.error(e); }
}

async function deleteOrderFb(id) {
  try { await remove(ref(db, `orders/${id}`)); } catch(e) { console.error(e); }
}

function getMenu() {
  try { return JSON.parse(localStorage.getItem('cafe_menu') || 'null'); } catch(e) { return null; }
}
async function saveMenuFb(menu) {
  try {
    const obj = {};
    menu.forEach(item => { obj[item.id] = item; });
    await set(ref(db, 'cafe_menu'), obj);
    localStorage.setItem('cafe_menu', JSON.stringify(menu));
  } catch(e) { console.error(e); }
}

// ===== REAL-TIME LISTENER — หัวใจหลัก =====
let _lastOrderKeys = new Set();
let _isFirstLoad = true;

function startRealtimeOrders() {
  onValue(ref(db, 'orders'), (snap) => {
    let orders = [];
    if (snap.exists()) {
      const ordersObj = snap.val();
      orders = Object.values(ordersObj).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

      if (_isFirstLoad) {
        Object.keys(ordersObj).forEach(k => _lastOrderKeys.add(k));
        _isFirstLoad = false;
      } else {
        const newKeys = Object.keys(ordersObj).filter(k => !_lastOrderKeys.has(k));
        newKeys.forEach(k => {
          const o = ordersObj[k];
          addNotification('📦', `ออเดอร์ใหม่! โต๊ะ ${o.table||'?'} — ฿${o.total||0}`);
          showToast(`🔔 ออเดอร์ใหม่! โต๊ะ ${o.table||'?'} — ฿${o.total||0}`);
          playNotificationSound();
          _lastOrderKeys.add(k);
        });
      }
    } else {
      _isFirstLoad = false;
    }

    updatePendingBadge(orders);
    // Persistent alert for pending orders
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    if (pendingCount > 0) startPendingAlert(); else stopPendingAlert();
    const active = document.querySelector('.page-content.active')?.id?.replace('page-','');
    if (active === 'dashboard') renderDashboard(orders);
    if (active === 'orders') renderOrders(orders);
  });
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

// ===== PERSISTENT ALERT FOR PENDING ORDERS =====
let _pendingAlertInterval = null;
function startPendingAlert() {
  if (_pendingAlertInterval) return;
  playNotificationSound();
  _pendingAlertInterval = setInterval(() => {
    playNotificationSound();
  }, 5000);
  const banner = document.getElementById('pendingAlertBanner');
  if (banner) banner.classList.add('show');
}
function stopPendingAlert() {
  if (_pendingAlertInterval) { clearInterval(_pendingAlertInterval); _pendingAlertInterval = null; }
  const banner = document.getElementById('pendingAlertBanner');
  if (banner) banner.classList.remove('show');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadAdminStore();
  updateTopbarDate();
  setInterval(updateTopbarDate, 60000);
  applyTheme(localStorage.getItem('cafe_theme') || 'dark');
  startRealtimeOrders();
  renderDashboard();
});

// ===== ADMIN STORE (settings, notifications, tables) =====
function saveAdminStore() {
  try { localStorage.setItem('cafe_store', JSON.stringify(store)); } catch(e) {}
}
function loadAdminStore() {
  try {
    const saved = localStorage.getItem('cafe_store');
    if (saved) store = { ...store, ...JSON.parse(saved) };
    const nameEl = document.getElementById('shopName');
    const descEl = document.getElementById('shopDesc');
    if (nameEl) nameEl.value = store.settings?.shopName || 'My Café';
    if (descEl) descEl.value = store.settings?.shopDesc || '';
    const tcEl = document.getElementById('tableCount');
    if (tcEl) tcEl.value = store.tables || 10;
  } catch(e) {}
}

// ===== NAVIGATION =====
function navigateTo(page, el) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard:  ['แดชบอร์ด', 'ภาพรวมร้านวันนี้'],
    orders:     ['จัดการออเดอร์', 'รายการออเดอร์ทั้งหมด'],
    menu:       ['จัดการเมนู', 'เพิ่ม แก้ไข หรือลบเมนู'],
    categories: ['จัดการหมวดหมู่', 'เพิ่ม แก้ไข หรือลบหมวดหมู่เมนู'],
    customers:  ['ลูกค้า', 'ข้อมูลลูกค้าและประวัติการสั่ง'],
    stats:      ['สถิติการขาย', 'วิเคราะห์ยอดขายและแนวโน้ม'],
    tables:     ['จัดการโต๊ะ / QR', 'สร้าง QR Code สำหรับแต่ละโต๊ะ'],
    settings:   ['ตั้งค่าระบบ', 'ปรับแต่งการทำงานของร้าน'],
  };
  const t = titles[page] || [page, ''];
  setText('pageTitle', t[0]);
  setText('pageSubtitle', t[1]);

  if (page === 'dashboard')  renderDashboard();
  if (page === 'orders')     renderOrders();
  if (page === 'menu')       renderMenuPage();
  if (page === 'categories') renderCategories();
  if (page === 'customers')  renderCustomers();
  if (page === 'stats')      renderStats();
  if (page === 'tables')     generateTables();

  closeSidebar();
}

// ===== MOBILE SIDEBAR =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ===== DATE =====
function updateTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ===== FORMAT HELPERS =====
function fmtPrice(n) { return '฿' + Number(n).toLocaleString('th-TH'); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' }); }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }); }
function timeDiff(ts) {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return 'เมื่อกี้';
  if (diff < 60) return diff + ' นาทีที่แล้ว';
  if (diff < 1440) return Math.floor(diff/60) + ' ชม.ที่แล้ว';
  return Math.floor(diff/1440) + ' วันที่แล้ว';
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function statusBadge(status) {
  if (status === 'done') return '<span class="badge badge-done">✅ เสร็จแล้ว</span>';
  if (status === 'pending') return '<span class="badge badge-pending">🔔 รอรับออเดอร์</span>';
  return '<span class="badge badge-preparing">⏳ กำลังเตรียม</span>';
}

// ===== ORDER TIMESTAMP HELPER =====
function orderTs(o) {
  if (o.createdAt) return new Date(o.createdAt).getTime();
  if (typeof o.id === 'number') return o.id;
  return 0;
}

// ===== DASHBOARD =====
async function renderDashboard(orders) {
  if (!orders) orders = await getOrders();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => orderTs(o) >= today.getTime());
  const revenue = todayOrders.reduce((s,o) => s + (o.total||0), 0);
  const uniqueCustomers = [...new Set(todayOrders.map(o => o.customerName || ('table-'+o.table)))].length;
  const avg = todayOrders.length ? revenue / todayOrders.length : 0;

  setText('todayRevenue', fmtPrice(revenue));
  setText('todayOrders', todayOrders.length);
  setText('todayCustomers', uniqueCustomers);
  setText('avgOrder', fmtPrice(Math.round(avg)));

  renderRecentOrders(orders);
  renderTopSellers(orders);
  renderRevenueChart(orders);
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  if (!tbody) return;
  const recent = [...orders].reverse().slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:30px">ยังไม่มีออเดอร์</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr onclick="openOrderDetail('${o.id}')" style="cursor:pointer">
      <td><strong>#${String(o.id).slice(-4)}</strong></td>
      <td><span class="badge badge-table">โต๊ะ ${o.table||'-'}</span></td>
      <td style="color:var(--text2);font-size:.82rem">${(o.items||[]).map(i=>i.name).join(', ')}</td>
      <td><strong style="color:var(--accent)">${fmtPrice(o.total||0)}</strong></td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--text3);font-size:.8rem">${fmtTime(orderTs(o))}</td>
      <td><button class="btn-sm blue" onclick="event.stopPropagation();openOrderDetail('${o.id}')">ดู</button></td>
    </tr>
  `).join('');
}

function renderTopSellers(orders) {
  const el = document.getElementById('topSellers');
  if (!el) return;
  const counts = {};
  orders.forEach(o => (o.items||[]).forEach(i => {
    if (!counts[i.name]) counts[i.name] = { name:i.name, emoji:i.emoji||'🍽️', count:0, revenue:0 };
    counts[i.name].count += i.qty||1;
    counts[i.name].revenue += (i.price||0)*(i.qty||1);
  }));
  const top = Object.values(counts).sort((a,b)=>b.count-a.count).slice(0,5);
  if (!top.length) { el.innerHTML = '<p style="text-align:center;color:var(--text3);padding:20px">ยังไม่มีข้อมูล</p>'; return; }
  const ranks = ['gold','silver','bronze','',''];
  el.innerHTML = top.map((item,i) => `
    <div class="top-seller-item">
      <div class="top-seller-rank ${ranks[i]}">${i+1}</div>
      <div class="top-seller-emoji">${item.emoji}</div>
      <div class="top-seller-info">
        <div class="top-seller-name">${item.name}</div>
        <div class="top-seller-count">ขายแล้ว ${item.count} รายการ</div>
      </div>
      <div class="top-seller-revenue">${fmtPrice(item.revenue)}</div>
    </div>
  `).join('');
}

function renderRevenueChart(orders) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const hours = Array.from({length:12},(_,i)=>8+i);
  const labels = hours.map(h=>h+':00');
  const data = hours.map(h => orders.filter(o=>{
    const d=new Date(orderTs(o)); return d>=today && d.getHours()===h;
  }).reduce((s,o)=>s+(o.total||0),0));
  drawBarChart(canvas, labels, data, '฿');
}

function updateRevenueChart() { renderDashboard(); }

// ===== CHART HELPER (CSS fallback ถ้าไม่มี Chart.js) =====
function drawBarChart(canvas, labels, data, prefix) {
  if (window.Chart) {
    if (canvas._ci) canvas._ci.destroy();
    canvas._ci = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor:'rgba(245,158,11,.5)', borderColor:'#f59e0b', borderWidth:2, borderRadius:8 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales: { x:{ticks:{color:'#94a3b8',font:{size:11}},grid:{color:'rgba(255,255,255,.05)'}},
                  y:{ticks:{color:'#94a3b8',font:{size:11},callback:v=>(prefix||'')+v},grid:{color:'rgba(255,255,255,.05)'}} } }
    });
  } else {
    const max = Math.max(...data,1);
    canvas.parentElement.innerHTML = `
      <div class="css-chart">
        ${data.map((v,i)=>`
          <div class="css-bar-wrap">
            <div class="css-bar-val">${v?(prefix)+Math.round(v):''}</div>
            <div class="css-bar" style="height:${Math.round(v/max*160)}px;background:linear-gradient(var(--accent),var(--accent2))"></div>
            <div class="css-bar-label">${labels[i]}</div>
          </div>`).join('')}
      </div>`;
  }
}

function drawLineChart(canvas, labels, data, prefix) {
  if (window.Chart) {
    if (canvas._ci) canvas._ci.destroy();
    canvas._ci = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.1)', fill:true, tension:.4, pointBackgroundColor:'#f59e0b', pointRadius:5 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales: { x:{ticks:{color:'#94a3b8'},grid:{color:'rgba(255,255,255,.05)'}},
                  y:{ticks:{color:'#94a3b8',callback:v=>(prefix||'')+v},grid:{color:'rgba(255,255,255,.05)'}} } }
    });
  } else {
    drawBarChart(canvas, labels, data, prefix);
  }
}

// ===== ORDERS PAGE =====
let currentOrderFilter = 'all';

async function renderOrders(inOrders) {
  const grid = document.getElementById('ordersGrid');
  if (!grid) return;
  let orders = [...(inOrders || await getOrders())].reverse();
  if (currentOrderFilter === 'preparing') orders = orders.filter(o=>o.status==='preparing');
  if (currentOrderFilter === 'done') orders = orders.filter(o=>o.status==='done');

  const searchVal = (document.getElementById('orderSearch')?.value||'').toLowerCase();
  if (searchVal) orders = orders.filter(o =>
    String(o.id).includes(searchVal) ||
    String(o.table||'').includes(searchVal) ||
    (o.customerName||'').toLowerCase().includes(searchVal) ||
    (o.items||[]).some(i=>i.name.toLowerCase().includes(searchVal))
  );

  if (!orders.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:60px 0;font-size:1.1rem">ไม่พบออเดอร์</div>';
    return;
  }
  grid.innerHTML = orders.map(o => {
    const isDelivery = o.orderType === 'delivery';
    const deliveryBadge = isDelivery ? '<span class="badge badge-delivery">🛵 Delivery</span>' : '';
    return `
    <div class="order-card-admin" onclick="openOrderDetail('${o.id}')">
      <div class="order-card-top">
        <span class="order-card-id">#${String(o.id).slice(-4)} — ${isDelivery ? '🛵 Delivery' : 'โต๊ะ '+(o.table||'-')}</span>
        <span class="order-card-time">${timeDiff(orderTs(o))}</span>
      </div>
      ${statusBadge(o.status)} ${deliveryBadge}
      <div class="order-card-items">${(o.items||[]).map(i=>`${i.emoji||'🍽️'} ${i.name} x${i.qty||1}`).join(' · ')}</div>
      ${isDelivery && o.deliveryInfo ? `<div class="order-card-delivery">📍 ${o.deliveryInfo.name} — ${o.deliveryInfo.phone}</div>` : ''}
      <div class="order-card-bottom">
        <span class="order-card-total">${fmtPrice(o.total||0)}${o.deliveryFee ? ' <small>(รวมค่าส่ง ฿'+o.deliveryFee+')</small>' : ''}</span>
        <div class="order-card-actions">
          ${o.status==='pending'?`<button class="btn-sm orange" onclick="event.stopPropagation();acceptOrder('${o.id}')">👍 รับออเดอร์</button>`:''}
          ${o.status==='preparing'?`<button class="btn-sm green" onclick="event.stopPropagation();markDone('${o.id}')">✅ เสร็จ</button>`:''}
          <button class="btn-sm red" onclick="event.stopPropagation();deleteOrder('${o.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterOrders(f, el) {
  currentOrderFilter = f;
  document.querySelectorAll('#page-orders .filter-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderOrders();
}

function searchOrders() { renderOrders(); }

async function markDone(id) {
  await saveOrderStatus(id, 'done');
  showToast('✅ ออเดอร์ #' + String(id).slice(-4) + ' เสร็จแล้ว');
}

async function acceptOrder(id) {
  await saveOrderStatus(id, 'preparing');
  showToast('👍 รับออเดอร์ #' + String(id).slice(-4) + ' แล้ว กำลังเตรียม...');
}

async function deleteOrder(id) {
  if (!confirm('ลบออเดอร์นี้?')) return;
  await deleteOrderFb(id);
  showToast('🗑️ ลบออเดอร์แล้ว');
}

async function updatePendingBadge(orders) {
  if (!orders) orders = await getOrders();
  const pending = orders.filter(o=>o.status==='preparing'||o.status==='pending').length;
  const badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = pending; badge.classList.toggle('show', pending>0); }
}

// ===== ORDER DETAIL MODAL =====
async function openOrderDetail(id) {
  const orders = await getOrders();
  const o = orders.find(x=>String(x.id)===String(id));
  if (!o) return;
  document.getElementById('orderDetailTitle').textContent = 'ออเดอร์ #' + String(o.id).slice(-4) + ' — โต๊ะ ' + (o.table||'-');
  document.getElementById('orderDetailBody').innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      ${statusBadge(o.status)}
      ${o.orderType==='delivery'?'<span class="badge badge-delivery">🛵 Delivery</span>':''}
      <span style="color:var(--text3);font-size:.85rem">📅 ${fmtDate(orderTs(o))} เวลา ${fmtTime(orderTs(o))}</span>
      ${o.customerName?`<span style="color:var(--text2);font-size:.85rem">👤 ${o.customerName}</span>`:''}
    </div>
    ${o.deliveryInfo?`
    <div style="background:var(--bg);padding:14px 18px;border-radius:12px;margin-bottom:16px;border:1px solid var(--border)">
      <div style="font-weight:700;margin-bottom:8px;font-size:.9rem">📍 ข้อมูลจัดส่ง</div>
      <div style="font-size:.85rem;color:var(--text2);line-height:1.8">
        👤 ${o.deliveryInfo.name}<br>
        📞 ${o.deliveryInfo.phone}<br>
        🏠 ${o.deliveryInfo.address}
      </div>
    </div>`:''}
    <table class="data-table">
      <thead><tr><th>รายการ</th><th>ราคา/ชิ้น</th><th>จำนวน</th><th>รวม</th></tr></thead>
      <tbody>
        ${(o.items||[]).map(i=>`
          <tr>
            <td>${i.emoji||'🍽️'} ${i.name}${i.note?`<div style="font-size:.75rem;color:var(--text3)">📝 ${i.note}</div>`:''}</td>
            <td>${fmtPrice(i.price||0)}</td>
            <td>${i.qty||1}</td>
            <td><strong>${fmtPrice((i.price||0)*(i.qty||1))}</strong></td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        ${o.deliveryFee?`<tr><td colspan="3" style="text-align:right;padding:8px 16px;color:var(--text3)">🛵 ค่าจัดส่ง</td><td>${fmtPrice(o.deliveryFee)}</td></tr>`:''}
        <tr><td colspan="3" style="text-align:right;font-weight:700;padding:14px 16px">รวมทั้งหมด</td>
        <td style="font-size:1.2rem;font-weight:800;color:var(--accent)">${fmtPrice(o.total||0)}</td></tr>
      </tfoot>
    </table>`;
  document.getElementById('orderDetailFooter').innerHTML = `
    <button class="btn-secondary" onclick="closeOrderDetail()" style="width:auto;margin:0">ปิด</button>
    ${o.status==='pending'?`<button class="btn-primary" onclick="acceptOrder('${o.id}');closeOrderDetail()">👍 รับออเดอร์</button>`:''}
    ${o.status==='preparing'?`<button class="btn-primary" onclick="markDone('${o.id}');closeOrderDetail()">✅ เสร็จแล้ว</button>`:''}
    <button class="btn-danger" style="width:auto" onclick="deleteOrder('${o.id}');closeOrderDetail()">🗑️ ลบ</button>`;
  document.getElementById('orderDetailModal').classList.add('show');
}
function closeOrderDetail() { document.getElementById('orderDetailModal').classList.remove('show'); }

// ===== MENU PAGE =====
const defaultMenu = [
  { id:'d1',  category:'food',    emoji:'🍜', name:'ข้าวผัด',          desc:'ข้าวผัดกระเพราไก่ไข่ดาว', price:120 },
  { id:'d2',  category:'food',    emoji:'🍛', name:'แกงเขียวหวาน',     desc:'แกงเขียวหวานไก่ใส่มะเขือ', price:150 },
  { id:'d3',  category:'food',    emoji:'🍲', name:'ต้มยำกุ้ง',         desc:'ต้มยำกุ้งน้ำข้น', price:200 },
  { id:'d4',  category:'food',    emoji:'🍱', name:'ผัดไทย',            desc:'ผัดไทยกุ้งสด', price:180 },
  { id:'d5',  category:'food',    emoji:'🥘', name:'ข้าวมันไก่',        desc:'ข้าวมันไก่ต้มซีอิ๊ว', price:130 },
  { id:'d6',  category:'food',    emoji:'🫕', name:'ลาบหมู',            desc:'ลาบหมูสไตล์อีสาน', price:110 },
  { id:'d7',  category:'snack',   emoji:'🥟', name:'ปอเปี๊ยะทอด',      desc:'ปอเปี๊ยะทอดกรอบไส้ผัก', price:60 },
  { id:'d8',  category:'snack',   emoji:'🍤', name:'กุ้งทอด',           desc:'กุ้งทอดเกล็ดขนมปัง', price:80 },
  { id:'d9',  category:'snack',   emoji:'🍗', name:'ไก่ทอด',            desc:'ไก่ทอดน้ำปลาหอม', price:90 },
  { id:'d10', category:'dessert', emoji:'🍮', name:'บัวลอย',            desc:'บัวลอยน้ำขิงร้อนๆ', price:45 },
  { id:'d11', category:'dessert', emoji:'🍧', name:'ข้าวเหนียวมะม่วง',  desc:'ข้าวเหนียวมะม่วงสุก', price:80 },
  { id:'d12', category:'dessert', emoji:'🍰', name:'เค้กเผือก',         desc:'เค้กเผือกครีมสด', price:95 },
  { id:'d13', category:'drink',   emoji:'🧋', name:'ชาไทย',             desc:'ชาไทยนมสดใส่น้ำแข็ง', price:65 },
  { id:'d14', category:'drink',   emoji:'☕', name:'กาแฟสด',            desc:'กาแฟสดโรบัสต้าใต้', price:70 },
  { id:'d15', category:'drink',   emoji:'🍵', name:'ชาเขียว',           desc:'ชาเขียวมัทฉะเย็น', price:75 },
  { id:'d16', category:'drink',   emoji:'🥤', name:'น้ำมะพร้าว',        desc:'น้ำมะพร้าวสดธรรมชาติ', price:55 },
];

function getMenuItems() {
  const saved = getMenu();
  if (saved && saved.length) return saved;
  return defaultMenu;
}

let currentMenuFilter = 'all';
let editingMenuId = null;

function renderMenuPage(filter) {
  if (filter !== undefined) currentMenuFilter = filter;
  const grid = document.getElementById('adminMenuGrid');
  if (!grid) return;
  let items = getMenuItems();
  if (currentMenuFilter !== 'all') items = items.filter(m=>m.category===currentMenuFilter);
  if (!items.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:60px 0">ไม่มีเมนูในหมวดนี้<br><br><button class="btn-primary" onclick="openMenuModal()">➕ เพิ่มเมนู</button></div>';
    return;
  }
  grid.innerHTML = items.map(m => `
    <div class="menu-card">
      <div class="menu-card-emoji">${m.emoji||'🍽️'}</div>
      <div class="menu-card-cat">${catLabel(m.category)}</div>
      <h4>${m.name}</h4>
      <p>${m.desc||''}</p>
      <span class="menu-card-price">${fmtPrice(m.price)}</span>
      <div class="menu-card-actions">
        <button class="btn-sm blue" onclick="openMenuModal('${m.id}')">✏️ แก้ไข</button>
        <button class="btn-sm red" onclick="deleteMenuItem('${m.id}')">🗑️ ลบ</button>
      </div>
    </div>`).join('');
}

function filterMenu(f, el) {
  currentMenuFilter = f;
  document.querySelectorAll('#page-menu .filter-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMenuPage();
}

function catLabel(cat) {
  const cats = getCategories();
  const found = cats.find(c => c.key === cat);
  if (found) return found.emoji + ' ' + found.name;
  return { food:'🍜 อาหาร', snack:'🍤 ขนม', dessert:'🍰 ของหวาน', drink:'🧋 เครื่องดื่ม' }[cat] || cat;
}

function openMenuModal(id) {
  editingMenuId = id || null;
  document.getElementById('menuModalTitle').textContent = id ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่';
  if (id) {
    const item = getMenuItems().find(m=>m.id===id);
    if (item) {
      document.getElementById('menuCategory').value = item.category||'food';
      document.getElementById('menuEmoji').value = item.emoji||'';
      document.getElementById('menuName').value = item.name;
      document.getElementById('menuDesc').value = item.desc||'';
      document.getElementById('menuPrice').value = item.price;
    }
  } else {
    document.getElementById('menuCategory').value = 'food';
    document.getElementById('menuEmoji').value = '';
    document.getElementById('menuName').value = '';
    document.getElementById('menuDesc').value = '';
    document.getElementById('menuPrice').value = '';
  }
  document.getElementById('menuModal').classList.add('show');
}

function closeMenuModal() {
  document.getElementById('menuModal').classList.remove('show');
  editingMenuId = null;
}

async function saveMenuItem() {
  const name = document.getElementById('menuName').value.trim();
  const price = parseFloat(document.getElementById('menuPrice').value);
  if (!name) { showToast('⚠️ กรุณาใส่ชื่อเมนู'); return; }
  if (isNaN(price)||price<0) { showToast('⚠️ กรุณาใส่ราคา'); return; }

  const item = {
    id: editingMenuId || ('m'+Date.now()),
    category: document.getElementById('menuCategory').value,
    emoji: document.getElementById('menuEmoji').value.trim()||'🍽️',
    name,
    desc: document.getElementById('menuDesc').value.trim(),
    price,
  };

  let menu = getMenuItems();
  if (editingMenuId) {
    const idx = menu.findIndex(m=>m.id===editingMenuId);
    if (idx>=0) menu[idx]=item; else menu.push(item);
    showToast('✅ แก้ไขเมนูแล้ว');
  } else {
    menu.push(item);
    showToast('✅ เพิ่มเมนูแล้ว');
  }
  await saveMenuFb(menu);
  closeMenuModal();
  renderMenuPage();
}

async function deleteMenuItem(id) {
  if (!confirm('ลบเมนูนี้?')) return;
  const menu = getMenuItems().filter(m=>m.id!==id);
  await saveMenuFb(menu);
  renderMenuPage();
  showToast('🗑️ ลบเมนูแล้ว');
}

// ===== CUSTOMERS =====
async function renderCustomers() {
  const orders = await getOrders();
  const custMap = {};
  orders.forEach(o => {
    const key = o.customerName || ('โต๊ะ '+(o.table||'?'));
    if (!custMap[key]) custMap[key]={ name:key, table:o.table||'-', orders:0, total:0, lastTs:0 };
    custMap[key].orders++;
    custMap[key].total += o.total||0;
    const ts = orderTs(o);
    if (ts > custMap[key].lastTs) custMap[key].lastTs = ts;
  });
  const customers = Object.values(custMap).sort((a,b)=>b.total-a.total);

  setText('totalCustomers', customers.length);
  setText('returningCustomers', customers.filter(c=>c.orders>=2).length);
  setText('vipCustomers', customers.filter(c=>c.total>=500).length);
  const avgPerCust = customers.length ? customers.reduce((s,c)=>s+c.total,0)/customers.length : 0;
  setText('avgPerCustomer', fmtPrice(Math.round(avgPerCust)));

  const tbody = document.getElementById('customersBody');
  if (!tbody) return;
  if (!customers.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:30px">ยังไม่มีข้อมูลลูกค้า</td></tr>';
    return;
  }
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="badge badge-table">โต๊ะ ${c.table}</span></td>
      <td>${c.orders} ครั้ง</td>
      <td><strong style="color:var(--accent)">${fmtPrice(c.total)}</strong></td>
      <td style="color:var(--text3);font-size:.82rem">${c.lastTs?fmtDate(c.lastTs):'-'}</td>
      <td>${c.total>=500?'<span class="badge badge-vip">⭐ VIP</span>':'<span class="badge badge-regular">ปกติ</span>'}</td>
    </tr>`).join('');
}

function searchCustomers() {
  const val = (document.getElementById('customerSearch')?.value||'').toLowerCase();
  document.querySelectorAll('#customersBody tr').forEach(tr=>{
    tr.style.display = tr.textContent.toLowerCase().includes(val)?'':'none';
  });
}

// ===== STATS =====
async function renderStats() {
  const orders = await getOrders();
  const menu = getMenuItems();
  const total = orders.reduce((s,o)=>s+(o.total||0),0);
  setText('allTimeRevenue', fmtPrice(total));
  setText('allTimeOrders', orders.length);
  setText('totalMenuItems', menu.length);

  const tableCounts = {};
  orders.forEach(o=>{ if(o.table) tableCounts[o.table]=(tableCounts[o.table]||0)+1; });
  const topTable = Object.entries(tableCounts).sort((a,b)=>b[1]-a[1])[0];
  setText('topTable', topTable?'โต๊ะ '+topTable[0]:'-');

  renderDailyChart(orders);
  renderCategoryChart(orders, menu);
  renderTopItemsGrid(orders);
}

function renderDailyChart(orders) {
  const canvas = document.getElementById('dailyChart');
  if (!canvas) return;
  const labels = [], data = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate()+1);
    labels.push(d.toLocaleDateString('th-TH',{day:'numeric',month:'short'}));
    data.push(orders.filter(o=>{const ts=orderTs(o);return ts>=d.getTime()&&ts<next.getTime();}).reduce((s,o)=>s+(o.total||0),0));
  }
  drawLineChart(canvas, labels, data, '฿');
}

function renderCategoryChart(orders, menu) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const catSales = {};
  orders.forEach(o=>(o.items||[]).forEach(i=>{
    const m = menu.find(x=>x.name===i.name);
    const cat = m?.category||'other';
    catSales[cat] = (catSales[cat]||0) + (i.price||0)*(i.qty||1);
  }));
  const catColors = { food:'#f59e0b', drink:'#3b82f6', snack:'#22c55e', dessert:'#a855f7', other:'#64748b' };
  const catNames  = { food:'อาหาร', drink:'เครื่องดื่ม', snack:'ขนม', dessert:'ของหวาน', other:'อื่นๆ' };
  const labels = Object.keys(catSales);
  const data   = labels.map(k=>catSales[k]);
  const colors = labels.map(k=>catColors[k]||'#94a3b8');

  if (!labels.length) { canvas.parentElement.innerHTML='<p style="text-align:center;color:var(--text3);padding:30px">ยังไม่มีข้อมูลการขาย</p>'; return; }

  if (window.Chart) {
    if (canvas._ci) canvas._ci.destroy();
    canvas._ci = new Chart(canvas, {
      type:'doughnut',
      data:{ labels:labels.map(k=>catNames[k]||k), datasets:[{data,backgroundColor:colors,borderWidth:0}] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right',labels:{color:'#94a3b8',font:{size:12}}}} }
    });
  } else {
    const total = data.reduce((s,v)=>s+v,0)||1;
    let angle = 0;
    const segments = data.map((v,i)=>{ const pct=v/total; const start=angle; angle+=pct*360; return{pct,start,color:colors[i],label:catNames[labels[i]]||labels[i]}; });
    canvas.parentElement.innerHTML = `
      <div class="css-pie-wrap">
        <div class="css-pie" style="background:conic-gradient(${segments.map(s=>`${s.color} ${s.start}deg ${s.start+s.pct*360}deg`).join(',')})"></div>
        <div class="css-legend">
          ${segments.map(s=>`<div class="css-legend-item"><div class="css-legend-dot" style="background:${s.color}"></div>${s.label} ${Math.round(s.pct*100)}%</div>`).join('')}
        </div>
      </div>`;
  }
}

function renderTopItemsGrid(orders) {
  const el = document.getElementById('topItemsGrid');
  if (!el) return;
  const counts = {};
  orders.forEach(o=>(o.items||[]).forEach(i=>{
    if(!counts[i.name]) counts[i.name]={name:i.name,emoji:i.emoji||'🍽️',count:0,revenue:0};
    counts[i.name].count+=i.qty||1;
    counts[i.name].revenue+=(i.price||0)*(i.qty||1);
  }));
  const top = Object.values(counts).sort((a,b)=>b.count-a.count).slice(0,10);
  if (!top.length) { el.innerHTML='<p style="text-align:center;color:var(--text3);padding:30px">ยังไม่มีข้อมูล</p>'; return; }
  el.innerHTML = top.map((item,i)=>`
    <div class="top-item">
      <div class="top-item-rank">${i+1}</div>
      <div class="top-item-emoji">${item.emoji}</div>
      <div class="top-item-info"><h5>${item.name}</h5><span>${item.count} รายการ · ${fmtPrice(item.revenue)}</span></div>
    </div>`).join('');
}

// ===== TABLES / QR =====
function generateTables() {
  const count = parseInt(document.getElementById('tableCount')?.value)||10;
  store.tables = count;
  saveAdminStore();
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html','') + 'index.html';
  grid.innerHTML = Array.from({length:count},(_,i)=>{
    const num = i+1;
    const url = `${baseUrl}?table=${num}`;
    return `
      <div class="table-card">
        <div class="table-card-num">${num}</div>
        <div class="table-card-label">โต๊ะที่ ${num}</div>
        <div class="table-card-qr">📱</div>
        <div class="table-card-link">${url}</div>
        <button class="btn-sm blue" onclick="copyUrl('${url}')">📋 คัดลอกลิงก์</button>
      </div>`;
  }).join('');
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(()=>showToast('📋 คัดลอกลิงก์แล้ว'));
}

// ===== SETTINGS =====
function saveSettings() {
  store.settings = store.settings || {};
  store.settings.shopName = document.getElementById('shopName')?.value||'My Café';
  store.settings.shopDesc = document.getElementById('shopDesc')?.value||'';
  saveAdminStore();
  showToast('💾 บันทึกการตั้งค่าแล้ว');
}

function setTheme(theme, el) {
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
  if (el) el.classList.add('active');
  applyTheme(theme);
  localStorage.setItem('cafe_theme', theme);
}
function applyTheme(theme) {
  document.body.classList.toggle('light', theme==='light');
  document.querySelectorAll('.theme-btn').forEach(b=>{
    b.classList.toggle('active', b.textContent.includes(theme==='light'?'☀️':'🌙'));
  });
}

async function exportData() {
  const orders = await getOrders();
  const blob = new Blob([JSON.stringify({ orders, menu:getMenuItems(), settings:store.settings }, null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cafe_data_'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  showToast('📥 ส่งออกข้อมูลแล้ว');
}

function importData(event) {
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.menu) await saveMenuFb(data.menu);
      if (data.settings) { store.settings=data.settings; saveAdminStore(); }
      showToast('📤 นำเข้าข้อมูลแล้ว');
      renderDashboard();
    } catch { showToast('⚠️ ไฟล์ไม่ถูกต้อง'); }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  if (!confirm('⚠️ ลบข้อมูลทั้งหมดจริงหรือ?')) return;
  await set(ref(db, 'orders'), null);
  store.notifications = [];
  saveAdminStore();
  renderDashboard([]);
  showToast('🗑️ ล้างข้อมูลแล้ว');
}

// ===== NOTIFICATIONS =====
function toggleNotifications() {
  const panel = document.getElementById('notifPanel');
  const overlay = document.getElementById('notifOverlay');
  panel.classList.toggle('show');
  overlay.classList.toggle('show');
  if (panel.classList.contains('show')) renderNotifications();
}
function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!store.notifications?.length) {
    list.innerHTML = '<div class="notif-empty">🔔 ไม่มีการแจ้งเตือน</div>';
    return;
  }
  list.innerHTML = [...store.notifications].reverse().slice(0,20).map(n=>`
    <div class="notif-item">
      <div class="notif-item-icon">${n.icon||'📦'}</div>
      <div><div class="notif-item-text">${n.text}</div><div class="notif-item-time">${timeDiff(n.ts)}</div></div>
    </div>`).join('');
}
function clearNotifications() {
  store.notifications = [];
  saveAdminStore();
  renderNotifications();
  ['notifDot','notifDotDesktop'].forEach(id=>document.getElementById(id)?.classList.remove('show'));
}
function addNotification(icon, text) {
  if (!store.notifications) store.notifications=[];
  store.notifications.push({ icon, text, ts:Date.now() });
  ['notifDot','notifDotDesktop'].forEach(id=>document.getElementById(id)?.classList.add('show'));
  saveAdminStore();
}

// ===== TOAST =====
function showToast(msg) {
  const el = document.getElementById('adminToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 2800);
}

// ===== DEMO DATA =====
async function addDemoOrders() {
  const menu = getMenuItems();
  const names = ['สมชาย','สมหญิง','กิตติ','อรนุช','พิมพ์ใจ','วรรณา'];
  const addresses = [
    '123/4 ซ.สุขุมวิท 33 กรุงเทพฯ',
    '56 หมู่ 3 ต.ในเมือง อ.เมือง',
    '789 ถ.พหลโยธิน แขวงจตุจักร',
  ];
  const phones = ['081-234-5678','092-345-6789','063-456-7890'];
  const now = Date.now();
  const promises = [];
  const statuses = ['pending','pending','pending','preparing','preparing','done','done','done','done','done','done','done'];

  for (let i=0; i<12; i++) {
    const itemCount = Math.ceil(Math.random()*3);
    const items = Array.from({length:itemCount},()=>{
      const m = menu[Math.floor(Math.random()*menu.length)];
      const qty = Math.ceil(Math.random()*2);
      return { emoji:m.emoji, name:m.name, price:m.price, qty, note:'' };
    });
    const isDelivery = Math.random() > 0.7;
    const deliveryFee = isDelivery ? 30 : 0;
    const total = items.reduce((s,i)=>s+i.price*i.qty,0) + deliveryFee;
    const newRef = push(ref(db, 'orders'));
    const orderData = {
      id: newRef.key,
      table: isDelivery ? null : Math.ceil(Math.random()*10),
      orderType: isDelivery ? 'delivery' : 'dinein',
      customerName: names[Math.floor(Math.random()*names.length)],
      items, total, deliveryFee,
      status: statuses[i],
      createdAt: new Date(now - Math.floor(Math.random()*7*24*60*60*1000)).toISOString(),
    };
    if (isDelivery) {
      orderData.deliveryInfo = {
        name: names[Math.floor(Math.random()*names.length)],
        phone: phones[Math.floor(Math.random()*phones.length)],
        address: addresses[Math.floor(Math.random()*addresses.length)],
      };
    }
    promises.push(set(newRef, orderData));
  }
  await Promise.all(promises);
  showToast('🧪 เพิ่มข้อมูลตัวอย่างแล้ว (มี pending ด้วย)');
}

// ===== CATEGORIES MANAGEMENT =====
const defaultCategories = [
  { key:'food',    emoji:'🍜', name:'อาหาร' },
  { key:'snack',   emoji:'🍤', name:'ขนม' },
  { key:'dessert', emoji:'🍰', name:'ของหวาน' },
  { key:'drink',   emoji:'🧋', name:'เครื่องดื่ม' },
];

function getCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem('cafe_categories') || 'null');
    if (saved && saved.length) return saved;
  } catch(e) {}
  return defaultCategories;
}
function saveCategories(cats) {
  localStorage.setItem('cafe_categories', JSON.stringify(cats));
}

let editingCatKey = null;

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  const cats = getCategories();
  const menu = getMenuItems();
  if (!cats.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:60px 0">ยังไม่มีหมวดหมู่<br><br><button class="btn-primary" onclick="openCategoryModal()">➕ เพิ่มหมวดหมู่</button></div>';
    return;
  }
  grid.innerHTML = cats.map(c => {
    const count = menu.filter(m => m.category === c.key).length;
    return `
    <div class="category-card-admin">
      <div class="category-card-emoji">${c.emoji}</div>
      <div class="category-card-info">
        <h4>${c.emoji} ${c.name}</h4>
        <p>รหัส: <strong>${c.key}</strong></p>
        <p>${count} เมนู</p>
      </div>
      <div class="category-card-actions">
        <button class="btn-sm blue" onclick="openCategoryModal('${c.key}')">✏️ แก้ไข</button>
        <button class="btn-sm red" onclick="deleteCategory('${c.key}')">🗑️ ลบ</button>
      </div>
    </div>`;
  }).join('');
  updateMenuCategoryDropdown();
}

function openCategoryModal(key) {
  editingCatKey = key || null;
  document.getElementById('categoryModalTitle').textContent = key ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่';
  if (key) {
    const cat = getCategories().find(c => c.key === key);
    if (cat) {
      document.getElementById('catEmoji').value = cat.emoji;
      document.getElementById('catKey').value = cat.key;
      document.getElementById('catName').value = cat.name;
    }
  } else {
    document.getElementById('catEmoji').value = '';
    document.getElementById('catKey').value = '';
    document.getElementById('catName').value = '';
  }
  document.getElementById('categoryModal').classList.add('show');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('show');
  editingCatKey = null;
}

function saveCategory() {
  const emoji = document.getElementById('catEmoji').value.trim() || '📁';
  const key = document.getElementById('catKey').value.trim().toLowerCase();
  const name = document.getElementById('catName').value.trim();
  if (!key) { showToast('⚠️ กรุณาใส่รหัสหมวดหมู่'); return; }
  if (!name) { showToast('⚠️ กรุณาใส่ชื่อหมวดหมู่'); return; }
  if (!/^[a-z0-9_]+$/.test(key)) { showToast('⚠️ รหัสต้องเป็นภาษาอังกฤษพิมพ์เล็ก'); return; }

  let cats = getCategories();
  if (editingCatKey) {
    const idx = cats.findIndex(c => c.key === editingCatKey);
    if (idx >= 0) cats[idx] = { key, emoji, name };
    showToast('✅ แก้ไขหมวดหมู่แล้ว');
  } else {
    if (cats.find(c => c.key === key)) { showToast('⚠️ รหัสนี้มีอยู่แล้ว'); return; }
    cats.push({ key, emoji, name });
    showToast('✅ เพิ่มหมวดหมู่แล้ว');
  }
  saveCategories(cats);
  closeCategoryModal();
  renderCategories();
}

function deleteCategory(key) {
  const menu = getMenuItems();
  const count = menu.filter(m => m.category === key).length;
  if (count > 0) { showToast(`⚠️ ไม่สามารถลบได้ มี ${count} เมนูในหมวดนี้`); return; }
  if (!confirm('ลบหมวดหมู่นี้?')) return;
  const cats = getCategories().filter(c => c.key !== key);
  saveCategories(cats);
  renderCategories();
  showToast('🗑️ ลบหมวดหมู่แล้ว');
}

function updateMenuCategoryDropdown() {
  const sel = document.getElementById('menuCategory');
  if (!sel) return;
  const cats = getCategories();
  sel.innerHTML = cats.map(c => `<option value="${c.key}">${c.emoji} ${c.name}</option>`).join('');
}

// ===== EXPOSE GLOBALS =====
Object.assign(window, {
  navigateTo, toggleSidebar, closeSidebar,
  toggleNotifications, clearNotifications,
  filterOrders, searchOrders, markDone, deleteOrder, acceptOrder,
  openOrderDetail, closeOrderDetail,
  filterMenu, openMenuModal, closeMenuModal, saveMenuItem, deleteMenuItem,
  searchCustomers, generateTables, copyUrl,
  saveSettings, setTheme, exportData, importData, clearAllData,
  addDemoOrders, updateRevenueChart, renderOrders, renderMenuPage,
  renderCustomers, renderStats,
  openCategoryModal, closeCategoryModal, saveCategory, deleteCategory, renderCategories,
});