// ===== index.js — My Café (Firebase Edition) =====
import { db, ref, push, set, get, onValue }
  from './firebase.js';

// ===== DATA =====
const defaultMenuData = {
    food: [
        { emoji: '🍜', name: 'ข้าวผัด',       desc: 'ข้าวผัดกระเพราไก่ไข่ดาว', price: 120 },
        { emoji: '🍛', name: 'แกงเขียวหวาน',  desc: 'แกงเขียวหวานไก่ใส่มะเขือ', price: 150 },
        { emoji: '🍲', name: 'ต้มยำกุ้ง',      desc: 'ต้มยำกุ้งน้ำข้น', price: 200 },
        { emoji: '🍱', name: 'ผัดไทย',         desc: 'ผัดไทยกุ้งสด', price: 180 },
        { emoji: '🥘', name: 'ข้าวมันไก่',     desc: 'ข้าวมันไก่ต้มซีอิ๊ว', price: 130 },
        { emoji: '🫕', name: 'ลาบหมู',         desc: 'ลาบหมูสไตล์อีสาน', price: 110 },
    ],
    snack: [
        { emoji: '🥟', name: 'ปอเปี๊ยะทอด', desc: 'ปอเปี๊ยะทอดกรอบไส้ผัก', price: 60 },
        { emoji: '🍤', name: 'กุ้งทอด',      desc: 'กุ้งทอดเกล็ดขนมปัง', price: 80 },
        { emoji: '🌭', name: 'ไส้กรอกทอด',   desc: 'ไส้กรอกอีสานทอดกรอบ', price: 50 },
        { emoji: '🍗', name: 'ไก่ทอด',       desc: 'ไก่ทอดน้ำปลาหอม', price: 90 },
        { emoji: '🧆', name: 'ทอดมัน',       desc: 'ทอดมันปลากรายซอสพริก', price: 70 },
        { emoji: '🥚', name: 'ไข่พะโล้',     desc: 'ไข่พะโล้หมูสามชั้น', price: 55 },
    ],
    dessert: [
        { emoji: '🍮', name: 'บัวลอย',           desc: 'บัวลอยน้ำขิงร้อนๆ', price: 45 },
        { emoji: '🍧', name: 'ข้าวเหนียวมะม่วง', desc: 'ข้าวเหนียวมะม่วงสุก', price: 80 },
        { emoji: '🍰', name: 'เค้กเผือก',         desc: 'เค้กเผือกครีมสด', price: 95 },
        { emoji: '🍡', name: 'วุ้นมะพร้าว',       desc: 'วุ้นมะพร้าวอ่อนน้ำตาลทราย', price: 40 },
        { emoji: '🧁', name: 'คัพเค้ก',           desc: 'คัพเค้กหน้าครีมสีสัน', price: 65 },
        { emoji: '🍬', name: 'ขนมต้ม',            desc: 'ขนมต้มมะพร้าวโหนกงา', price: 35 },
    ],
    drink: [
        { emoji: '🧋', name: 'ชาไทย',         desc: 'ชาไทยนมสดใส่น้ำแข็ง', price: 65 },
        { emoji: '🥤', name: 'น้ำมะพร้าว',    desc: 'น้ำมะพร้าวสดธรรมชาติ', price: 55 },
        { emoji: '☕', name: 'กาแฟสด',        desc: 'กาแฟสดโรบัสต้าใต้', price: 70 },
        { emoji: '🍵', name: 'ชาเขียว',       desc: 'ชาเขียวมัทฉะเย็น', price: 75 },
        { emoji: '🧃', name: 'น้ำผลไม้ปั่น', desc: 'น้ำผลไม้ปั่นสดใหม่', price: 80 },
        { emoji: '🥛', name: 'นมสด',          desc: 'นมสดโฮโมจีไนซ์เย็น', price: 45 },
    ],
};

// ===== โหลดเมนูจาก Firebase หรือ fallback default =====
async function loadMenuData() {
    try {
        const snap = await get(ref(db, 'cafe_menu'));
        if (snap.exists()) {
            const items = Object.values(snap.val());
            if (items.length) {
                const grouped = { food: [], snack: [], dessert: [], drink: [] };
                items.forEach(item => {
                    const cat = item.category || 'food';
                    if (grouped[cat]) {
                        grouped[cat].push({
                            emoji: item.emoji || '🍽️',
                            name: item.name,
                            desc: item.desc || '',
                            price: item.price,
                        });
                    }
                });
                return grouped;
            }
        }
    } catch (e) { console.warn('Firebase menu load failed, using default', e); }
    return defaultMenuData;
}

let menuData = defaultMenuData;

// ===== TABLE SYSTEM =====
const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table');
if (tableNumber) {
    document.getElementById('tableBadge').classList.add('show');
    document.getElementById('tableNum').textContent = tableNumber;
}

// ===== CURRENT CATEGORY TRACKING =====
let currentCategory = 'food';

// ===== RENDER CATEGORY GRID =====
const catGrid = document.getElementById('catGrid');

function renderCards(category, filterText = '') {
    currentCategory = category;
    catGrid.classList.add('fade-out');
    setTimeout(() => {
        let items = menuData[category] || [];
        if (filterText) {
            const query = filterText.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.desc.toLowerCase().includes(query)
            );
        }
        const noResults = document.getElementById('noResults');
        if (items.length === 0) {
            catGrid.innerHTML = '';
            noResults.style.display = 'flex';
        } else {
            noResults.style.display = 'none';
            catGrid.innerHTML = items.map(item => `
                <div class="product">
                    <div class="product-img">${item.emoji}</div>
                    <h3>${item.name}</h3>
                    <p>${item.desc}</p>
                    <span class="price">฿${item.price}</span>
                    <button class="add-to-cart" onclick="openModal('${escStr(item.emoji)}','${escStr(item.name)}','${escStr(item.desc)}',${item.price})">🛒 เพิ่มลงตะกร้า</button>
                </div>
            `).join('');
        }
        catGrid.classList.remove('fade-out');
        catGrid.classList.add('fade-in');
        setTimeout(() => catGrid.classList.remove('fade-in'), 300);
    }, 200);
}

function escStr(s) { return String(s).replace(/'/g, "\\'"); }

function switchCategory(category, el) {
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    renderCards(category);
}

// ===== SEARCH =====
function searchMenu() {
    const query = document.getElementById('searchInput').value.trim();
    const clearBtn = document.getElementById('searchClear');
    clearBtn.style.display = query ? 'flex' : 'none';

    if (query) {
        const allItems = [];
        Object.values(menuData).forEach(items => {
            items.forEach(item => {
                if (item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.desc.toLowerCase().includes(query.toLowerCase())) {
                    allItems.push(item);
                }
            });
        });

        document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
        catGrid.classList.add('fade-out');
        setTimeout(() => {
            const noResults = document.getElementById('noResults');
            if (allItems.length === 0) {
                catGrid.innerHTML = '';
                noResults.style.display = 'flex';
            } else {
                noResults.style.display = 'none';
                catGrid.innerHTML = allItems.map(item => `
                    <div class="product">
                        <div class="product-img">${item.emoji}</div>
                        <h3>${item.name}</h3>
                        <p>${item.desc}</p>
                        <span class="price">฿${item.price}</span>
                        <button class="add-to-cart" onclick="openModal('${escStr(item.emoji)}','${escStr(item.name)}','${escStr(item.desc)}',${item.price})">🛒 เพิ่มลงตะกร้า</button>
                    </div>
                `).join('');
            }
            catGrid.classList.remove('fade-out');
            catGrid.classList.add('fade-in');
            setTimeout(() => catGrid.classList.remove('fade-in'), 300);
        }, 150);
    } else {
        const tabs = document.querySelectorAll('.menu-tab');
        const categories = ['food', 'snack', 'dessert', 'drink'];
        const idx = categories.indexOf(currentCategory);
        if (idx >= 0) tabs[idx].classList.add('active');
        renderCards(currentCategory);
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    const tabs = document.querySelectorAll('.menu-tab');
    const categories = ['food', 'snack', 'dessert', 'drink'];
    const idx = categories.indexOf(currentCategory);
    if (idx >= 0) tabs[idx].classList.add('active');
    renderCards(currentCategory);
}

// ===== TOP SLIDER =====
const topTrack = document.getElementById('topTrack');
function slideTop(dir) { topTrack.scrollLeft += dir * 250; }

let topDown = false, topStartX, topScrollStart;
topTrack.addEventListener('mousedown', (e) => { topDown = true; topStartX = e.pageX - topTrack.offsetLeft; topScrollStart = topTrack.scrollLeft; topTrack.style.cursor = 'grabbing'; });
topTrack.addEventListener('mouseleave', () => { topDown = false; topTrack.style.cursor = 'default'; });
topTrack.addEventListener('mouseup', () => { topDown = false; topTrack.style.cursor = 'default'; });
topTrack.addEventListener('mousemove', (e) => { if (!topDown) return; e.preventDefault(); topTrack.scrollLeft = topScrollStart - (e.pageX - topTrack.offsetLeft - topStartX); });

// ===== MODAL =====
let currentItem = {};

function openModal(emoji, name, desc, price) {
    currentItem = { emoji, name, desc, price };
    document.getElementById('modalEmoji').textContent = emoji;
    document.getElementById('modalName').textContent = name;
    document.getElementById('modalDesc').textContent = desc;
    document.getElementById('modalPrice').textContent = `฿${price}`;
    document.getElementById('modalNote').value = '';
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
function closeModalOutside(e) { if (e.target === e.currentTarget) closeModal(); }

function confirmAdd() {
    const note = document.getElementById('modalNote').value.trim();
    const cartItem = {
        id: Date.now(),
        emoji: currentItem.emoji,
        name: currentItem.name,
        price: currentItem.price,
        note: note,
        total: currentItem.price,
        qty: 1,
    };
    cart.push(cartItem);
    closeModal();
    updateCart();
    showToast(`✅ เพิ่ม "${cartItem.name}" ลงตะกร้าแล้ว`);
}

// ===== CART =====
let cart = [];

function toggleCart() {
    document.getElementById('cartOverlay').classList.toggle('show');
    document.getElementById('cartPanel').classList.toggle('open');
}

function updateCart() {
    const badge = document.getElementById('cartBadge');
    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = totalItems;
    badge.classList.toggle('show', totalItems > 0);

    const body = document.getElementById('cartBody');
    const btnOrder = document.getElementById('btnOrder');

    if (cart.length === 0) {
        body.innerHTML = `<div class="cart-empty"><div class="empty-icon">🧺</div><p>ตะกร้ายังว่าง</p></div>`;
        document.getElementById('cartTotalPrice').textContent = '฿0';
        btnOrder.disabled = true;
        return;
    }

    btnOrder.disabled = false;
    body.innerHTML = cart.map((item, idx) => {
        const details = [];
        if (item.note) details.push(`"${item.note}"`);
        return `
            <div class="cart-item">
                <div class="cart-item-emoji">${item.emoji}</div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    ${details.length ? `<div class="cart-item-details">${details.join(' · ')}</div>` : ''}
                    <div class="cart-item-bottom">
                        <span class="cart-item-price">฿${item.total * item.qty}</span>
                        <div class="qty-controls">
                            <button class="qty-btn ${item.qty <= 1 ? 'delete' : ''}" onclick="changeQty(${idx}, -1)">${item.qty <= 1 ? '🗑️' : '−'}</button>
                            <span class="qty-num">${item.qty}</span>
                            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');

    const grandTotal = cart.reduce((s, i) => s + i.total * i.qty, 0);
    document.getElementById('cartTotalPrice').textContent = `฿${grandTotal}`;
}

function changeQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) {
        const removed = cart.splice(idx, 1)[0];
        showToast(`🗑️ ลบ "${removed.name}" แล้ว`);
    }
    updateCart();
}

// ===== ORDER SYSTEM =====
let selectedTable = tableNumber || null;
let selectedPayment = null;
let qrTimerInterval = null;
let selectedOrderType = 'dinein';
const DELIVERY_FEE = 30;

function selectOrderType(type) {
    selectedOrderType = type;
    document.querySelectorAll('.order-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(type === 'delivery' ? 'typeDelivery' : 'typeDineIn').classList.add('selected');
    document.getElementById('dineInSection').style.display = type === 'dinein' ? 'block' : 'none';
    document.getElementById('deliverySection').style.display = type === 'delivery' ? 'block' : 'none';
}

function openCheckout() {
    if (cart.length === 0) return;
    document.getElementById('cartOverlay').classList.remove('show');
    document.getElementById('cartPanel').classList.remove('open');
    selectedPayment = null;
    selectedOrderType = 'dinein';
    selectOrderType('dinein');
    document.getElementById('checkoutStep1').style.display = 'block';
    document.getElementById('checkoutStep2').style.display = 'none';
    document.getElementById('btnConfirmOrder').disabled = true;
    const tableInput = document.getElementById('checkoutTableNum');
    if (selectedTable) {
        tableInput.value = selectedTable;
        highlightTableBtn(selectedTable);
    } else {
        tableInput.value = '';
        clearTableBtnHighlight();
    }
    document.getElementById('deliveryName').value = '';
    document.getElementById('deliveryPhone').value = '';
    document.getElementById('deliveryAddress').value = '';
    document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('checkoutOverlay').classList.add('show');
}

function closeCheckout() { document.getElementById('checkoutOverlay').classList.remove('show'); }
function closeCheckoutOutside(e) { if (e.target === e.currentTarget) closeCheckout(); }

function selectTable(num) {
    document.getElementById('checkoutTableNum').value = num;
    highlightTableBtn(num);
}
function highlightTableBtn(num) {
    document.querySelectorAll('.table-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.textContent) === parseInt(num));
    });
}
function clearTableBtnHighlight() {
    document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
}

document.getElementById('checkoutTableNum').addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val) highlightTableBtn(val);
    else clearTableBtnHighlight();
});

function goToPaymentStep() {
    if (selectedOrderType === 'dinein') {
        const tableVal = document.getElementById('checkoutTableNum').value.trim();
        if (!tableVal) {
            showToast('⚠️ กรุณาระบุหมายเลขโต๊ะ');
            document.getElementById('checkoutTableNum').focus();
            return;
        }
        selectedTable = tableVal;
        document.getElementById('tableBadge').classList.add('show');
        document.getElementById('tableNum').textContent = selectedTable;
    } else {
        const name = document.getElementById('deliveryName').value.trim();
        const phone = document.getElementById('deliveryPhone').value.trim();
        const addr = document.getElementById('deliveryAddress').value.trim();
        if (!name) { showToast('⚠️ กรุณาใส่ชื่อผู้รับ'); document.getElementById('deliveryName').focus(); return; }
        if (!phone) { showToast('⚠️ กรุณาใส่เบอร์โทร'); document.getElementById('deliveryPhone').focus(); return; }
        if (!addr) { showToast('⚠️ กรุณาใส่ที่อยู่'); document.getElementById('deliveryAddress').focus(); return; }
    }
    const itemsTotal = cart.reduce((s, i) => s + i.total * i.qty, 0);
    const deliveryFee = selectedOrderType === 'delivery' ? DELIVERY_FEE : 0;
    const grandTotal = itemsTotal + deliveryFee;
    document.getElementById('checkoutTotal').textContent = `฿${grandTotal}`;
    document.getElementById('checkoutSummaryTotal').textContent = `฿${grandTotal}`;
    const feeEl = document.getElementById('deliveryFeeLine');
    if (feeEl) feeEl.style.display = deliveryFee > 0 ? 'flex' : 'none';
    const itemsList = document.getElementById('checkoutItemsList');
    itemsList.innerHTML = cart.map(item => `
        <div class="summary-item">
            <span class="summary-item-name">
                ${item.emoji} ${item.name}
                <span class="summary-item-qty">x${item.qty}</span>
            </span>
            <span>฿${item.total * item.qty}</span>
        </div>
    `).join('');
    document.getElementById('checkoutStep1').style.display = 'none';
    document.getElementById('checkoutStep2').style.display = 'block';
}

function goBackToTable() {
    document.getElementById('checkoutStep2').style.display = 'none';
    document.getElementById('checkoutStep1').style.display = 'block';
}

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(method === 'qr' ? 'payQR' : 'payCash').classList.add('selected');
    document.getElementById('btnConfirmOrder').disabled = false;
}

function confirmCheckout() {
    if (!selectedPayment) {
        showToast('⚠️ กรุณาเลือกวิธีชำระเงิน');
        return;
    }
    closeCheckout();
    if (selectedPayment === 'qr') openQRPayment();
    else placeOrder('cash');
}

// ===== QR PAYMENT =====
function openQRPayment() {
    const itemsTotal = cart.reduce((s, i) => s + i.total * i.qty, 0);
    const grandTotal = itemsTotal + (selectedOrderType === 'delivery' ? DELIVERY_FEE : 0);
    document.getElementById('qrTotal').textContent = `฿${grandTotal}`;
    generateQRCode(grandTotal);
    startQRTimer();
    document.getElementById('qrOverlay').classList.add('show');
}
function closeQRPayment() {
    document.getElementById('qrOverlay').classList.remove('show');
    if (qrTimerInterval) { clearInterval(qrTimerInterval); qrTimerInterval = null; }
}
function qrPaymentDone() { closeQRPayment(); placeOrder('qr'); }

function generateQRCode(amount) {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size; canvas.height = size;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    function drawFinderPattern(x, y) {
        ctx.fillStyle = '#3d2c2c'; ctx.fillRect(x, y, 35, 35);
        ctx.fillStyle = '#fff'; ctx.fillRect(x+5, y+5, 25, 25);
        ctx.fillStyle = '#3d2c2c'; ctx.fillRect(x+10, y+10, 15, 15);
    }
    drawFinderPattern(0, 0); drawFinderPattern(size-35, 0); drawFinderPattern(0, size-35);
    ctx.fillStyle = '#3d2c2c';
    for (let i=40; i<size-40; i+=10) {
        if ((i/10)%2===0) { ctx.fillRect(i,30,5,5); ctx.fillRect(30,i,5,5); }
    }
    let seed = amount*7+42;
    function seededRandom() { seed=(seed*9301+49297)%233280; return seed/233280; }
    const moduleSize = 5, modules = size/moduleSize;
    for (let row=0; row<modules; row++) {
        for (let col=0; col<modules; col++) {
            const x=col*moduleSize, y=row*moduleSize;
            if ((x<40&&y<40)||(x>size-40&&y<40)||(x<40&&y>size-40)) continue;
            if ((y>=28&&y<=37&&x>=38&&x<=size-40)||(x>=28&&x<=37&&y>=38&&y<=size-40)) continue;
            if (seededRandom()>0.55) { ctx.fillStyle='#3d2c2c'; ctx.fillRect(x,y,moduleSize,moduleSize); }
        }
    }
    const ax=size-50, ay=size-50;
    ctx.fillStyle='#3d2c2c'; ctx.fillRect(ax,ay,25,25);
    ctx.fillStyle='#fff'; ctx.fillRect(ax+5,ay+5,15,15);
    ctx.fillStyle='#3d2c2c'; ctx.fillRect(ax+10,ay+10,5,5);
    ctx.fillStyle='#6b4c3b'; ctx.font='bold 10px "Noto Sans Thai",sans-serif';
    ctx.textAlign='center'; ctx.fillText('PromptPay · ฿'+amount, size/2, size-5);
}

function startQRTimer() {
    let timeLeft = 300;
    const timerEl = document.getElementById('qrTimer');
    function updateTimer() {
        const min = Math.floor(timeLeft/60), sec = timeLeft%60;
        timerEl.textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        if (timeLeft<=60) timerEl.classList.add('warning');
        if (timeLeft<=0) { clearInterval(qrTimerInterval); qrTimerInterval=null; closeQRPayment(); showToast('⏰ หมดเวลาชำระเงิน'); }
        timeLeft--;
    }
    updateTimer();
    qrTimerInterval = setInterval(updateTimer, 1000);
    timerEl.classList.remove('warning');
}

// ===== PLACE ORDER — บันทึกขึ้น Firebase =====
async function placeOrder(paymentMethod) {
    if (cart.length === 0) return;

    const itemsTotal = cart.reduce((s, i) => s + i.total * i.qty, 0);
    const deliveryFee = selectedOrderType === 'delivery' ? DELIVERY_FEE : 0;
    const grandTotal = itemsTotal + deliveryFee;
    const orderData = {
        table: selectedOrderType === 'dinein' ? (selectedTable || null) : null,
        orderType: selectedOrderType,
        customerName: selectedOrderType === 'delivery' ? document.getElementById('deliveryName').value.trim() : null,
        paymentMethod: paymentMethod || 'cash',
        items: cart.map(item => ({
            emoji: item.emoji,
            name: item.name,
            note: item.note || '',
            price: item.total,
            qty: item.qty,
        })),
        deliveryFee: deliveryFee,
        total: grandTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    if (selectedOrderType === 'delivery') {
        orderData.deliveryInfo = {
            name: document.getElementById('deliveryName').value.trim(),
            phone: document.getElementById('deliveryPhone').value.trim(),
            address: document.getElementById('deliveryAddress').value.trim(),
        };
    }

    try {
        const newRef = push(ref(db, 'orders'));
        orderData.id = newRef.key;
        await set(newRef, orderData);
        const myOrders = JSON.parse(sessionStorage.getItem('myOrderKeys') || '[]');
        myOrders.push(newRef.key);
        sessionStorage.setItem('myOrderKeys', JSON.stringify(myOrders));
    } catch (e) {
        showToast('⚠️ เชื่อมต่อ Firebase ไม่ได้ กรุณาลองใหม่');
        console.error(e);
        return;
    }

    cart = [];
    updateCart();
    document.getElementById('navOrderLink').style.display = 'inline-flex';
    const payLabel = paymentMethod === 'qr' ? '(สแกนจ่าย)' : '(เงินสด)';
    showToast(`✅ สั่งออเดอร์สำเร็จ! ${payLabel} กำลังไปหน้าติดตามสถานะ...`);
    setTimeout(() => {
        const params = selectedOrderType === 'dinein' && selectedTable ? `?table=${selectedTable}` : '';
        window.location.href = `order.html${params}`;
    }, 1200);
}

function closeOrderStatus() { document.getElementById('orderOverlay').classList.remove('show'); }

// ===== TOAST =====
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== CHECK EXISTING ORDERS (sessionStorage) =====
function checkExistingOrders() {
    const myOrders = JSON.parse(sessionStorage.getItem('myOrderKeys') || '[]');
    if (myOrders.length > 0) {
        document.getElementById('navOrderLink').style.display = 'inline-flex';
    }
}

// ===== EXPOSE GLOBALS (ใช้ใน onclick= ของ HTML) =====
Object.assign(window, {
    switchCategory, searchMenu, clearSearch, slideTop,
    openModal, closeModal, closeModalOutside, confirmAdd,
    toggleCart, changeQty, openCheckout, closeCheckout,
    closeCheckoutOutside, selectTable, goToPaymentStep, goBackToTable,
    selectPayment, confirmCheckout, openQRPayment, closeQRPayment, qrPaymentDone,
    placeOrder, closeOrderStatus, showToast, selectOrderType,
});

// ===== INIT =====
(async () => {
    menuData = await loadMenuData();
    renderCards('food');
    updateCart();
    checkExistingOrders();
})();