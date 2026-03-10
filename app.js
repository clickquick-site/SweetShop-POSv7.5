// ============================================================
//  POS DZ — app.js  v6.0.0  |  الجزء 1 من 2
// ============================================================

const APP_VERSION = { number:'6.0.0', date:'2026-03-02', name:'POS DZ' };

// ══════════════════════════════════════════════════════════════
//  IndexedDB
// ══════════════════════════════════════════════════════════════
const DB_NAME = 'POSDZ_DB', DB_VERSION = 4;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('users'))    { const s=d.createObjectStore('users',{keyPath:'id',autoIncrement:true}); s.createIndex('username','username',{unique:true}); }
      if (!d.objectStoreNames.contains('products')) { const s=d.createObjectStore('products',{keyPath:'id',autoIncrement:true}); s.createIndex('name','name',{unique:true}); s.createIndex('barcode','barcode',{unique:false}); }
      if (!d.objectStoreNames.contains('families')) { const s=d.createObjectStore('families',{keyPath:'id',autoIncrement:true}); s.createIndex('name','name',{unique:true}); }
      if (!d.objectStoreNames.contains('customers'))  d.createObjectStore('customers',{keyPath:'id',autoIncrement:true});
      if (!d.objectStoreNames.contains('suppliers'))  d.createObjectStore('suppliers',{keyPath:'id',autoIncrement:true});
      if (!d.objectStoreNames.contains('sales'))    { const s=d.createObjectStore('sales',{keyPath:'id',autoIncrement:true}); s.createIndex('date','date',{unique:false}); s.createIndex('customerId','customerId',{unique:false}); }
      if (!d.objectStoreNames.contains('saleItems')){ const s=d.createObjectStore('saleItems',{keyPath:'id',autoIncrement:true}); s.createIndex('saleId','saleId',{unique:false}); }
      if (!d.objectStoreNames.contains('debts'))    { const s=d.createObjectStore('debts',{keyPath:'id',autoIncrement:true}); s.createIndex('customerId','customerId',{unique:false}); s.createIndex('date','date',{unique:false}); }
      if (!d.objectStoreNames.contains('settings'))   d.createObjectStore('settings',{keyPath:'key'});
      if (!d.objectStoreNames.contains('logs'))       d.createObjectStore('logs',{keyPath:'id',autoIncrement:true});
      if (!d.objectStoreNames.contains('counter'))    d.createObjectStore('counter',{keyPath:'id'});
      if (!d.objectStoreNames.contains('expenses'))   { const s=d.createObjectStore('expenses',{keyPath:'id',autoIncrement:true}); s.createIndex('date','date',{unique:false}); s.createIndex('category','category',{unique:false}); }
      if (!d.objectStoreNames.contains('purchases'))  { const s=d.createObjectStore('purchases',{keyPath:'id',autoIncrement:true}); s.createIndex('date','date',{unique:false}); s.createIndex('supplierId','supplierId',{unique:false}); }
      if (!d.objectStoreNames.contains('debtPayments')){ const s=d.createObjectStore('debtPayments',{keyPath:'id',autoIncrement:true}); s.createIndex('debtId','debtId',{unique:false}); s.createIndex('customerId','customerId',{unique:false}); s.createIndex('date','date',{unique:false}); }
      if (!d.objectStoreNames.contains('syncQueue'))  { const s=d.createObjectStore('syncQueue',{keyPath:'id',autoIncrement:true}); s.createIndex('createdAt','createdAt',{unique:false}); }
      if (!d.objectStoreNames.contains('workers'))    { d.createObjectStore('workers',{keyPath:'id',autoIncrement:true}); }
      if (!d.objectStoreNames.contains('workerPayments')) { const s=d.createObjectStore('workerPayments',{keyPath:'id',autoIncrement:true}); s.createIndex('workerId','workerId',{unique:false}); s.createIndex('date','date',{unique:false}); }
    };
    req.onsuccess = async (e) => { db=e.target.result; await seedDefaults(); resolve(db); };
    req.onerror   = () => reject(req.error);
  });
}

// DB Helpers
function dbGet(store,key)          { return new Promise((r,j)=>{ const q=db.transaction(store,'readonly').objectStore(store).get(key); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }
function dbGetAll(store)            { return new Promise((r,j)=>{ const q=db.transaction(store,'readonly').objectStore(store).getAll(); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }
function dbPut(store,data)          { return new Promise((r,j)=>{ const q=db.transaction(store,'readwrite').objectStore(store).put(data); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }
function dbAdd(store,data)          { return new Promise((r,j)=>{ const q=db.transaction(store,'readwrite').objectStore(store).add(data); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }
function dbDelete(store,key)        { return new Promise((r,j)=>{ const q=db.transaction(store,'readwrite').objectStore(store).delete(key); q.onsuccess=()=>r(); q.onerror=()=>j(q.error); }); }
function dbGetByIndex(store,idx,val){ return new Promise((r,j)=>{ const q=db.transaction(store,'readonly').objectStore(store).index(idx).getAll(val); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }
function dbGetByRange(store,idx,lo,hi){ return new Promise((r,j)=>{ const q=db.transaction(store,'readonly').objectStore(store).index(idx).getAll(IDBKeyRange.bound(lo,hi)); q.onsuccess=()=>r(q.result); q.onerror=()=>j(q.error); }); }

// Settings
async function getSetting(key)        { const r=await dbGet('settings',key); return r?r.value:null; }
async function setSetting(key,value)  { await dbPut('settings',{key,value}); }

// ══════════════════════════════════════════════════════════════
//  Seed Defaults
// ══════════════════════════════════════════════════════════════
async function seedDefaults() {
  try { await dbAdd('users',{username:'ADMIN',password:await hashPasswordSHA('1234'),role:'admin',createdAt:new Date().toISOString()}); } catch(e) {}
  const D = {
    storeName:'اسم المتجر',storePhone:'',storeAddress:'',storeWelcome:'شكراً لزيارتكم',storeLogo:'',
    currency:'DA',language:'ar',dateFormat:'DD/MM/YYYY',themeColor:'blue_purple',bgMode:'dark',appFont:'cairo',fontSize:'15',
    soundAdd:'1',soundSell:'1',soundButtons:'1',barcodeReader:'1',barcodeAuto:'1',touchKeyboard:'0',
    paperSize:'80mm',printLogo:'1',printName:'1',printPhone:'1',printWelcome:'1',printAddress:'1',printBarcode:'1',
    barcodeFont:'Cairo',barcodeType:'CODE128',barcodeShowStore:'1',barcodeShowName:'1',barcodeShowPrice:'1',
    barcodeFontSize:'12',barcodeLabelSize:'58x38',
    autoBackup:'1',invoiceNumber:'1',lowStockAlert:'5',expiryAlertDays:'30',lastResetDate:'',dailyCounter:'1',
    notifEnabled:'1',notifInApp:'1',notifLowStock:'1',notifOutStock:'1',notifDebt30:'1',notifExpiry:'1',notifLogin:'1',notifPwdChange:'1',
    emailEnabled:'0',emailSender:'',emailAppPassword:'',emailRecipient:'',emailOnSale:'1',emailOnLowStock:'1',emailOnDebt:'1',emailOnExpiry:'1',emailDailyReport:'1',
    smsEnabled:'0',smsSid:'',smsToken:'',smsFrom:'',
    syncEnabled:'0',syncRole:'client',syncServerIP:'192.168.1.1',syncServerPort:'3000',
    cardPaymentEnabled:'0',scaleEnabled:'0',scaleBaudRate:'9600',scaleAutoRead:'1',
  };
  for (const [k,v] of Object.entries(D)) { if (!await dbGet('settings',k)) await dbPut('settings',{key:k,value:v}); }
  if (!await dbGet('counter',1)) await dbPut('counter',{id:1,number:1,lastReset:todayStr()});
}

// ══════════════════════════════════════════════════════════════
//  Password
// ══════════════════════════════════════════════════════════════
async function hashPasswordSHA(str) {
  try { const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)); return 'sha_'+Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
  catch(e) { return hashPasswordLegacy(str); }
}
function hashPasswordLegacy(str) { let h=0; for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;} return 'h_'+Math.abs(h).toString(36)+'_'+str.length; }
function hashPassword(str) { return hashPasswordLegacy(str); }
async function verifyPassword(input,stored) { return stored.startsWith('sha_') ? (await hashPasswordSHA(input))===stored : hashPasswordLegacy(input)===stored; }

// ══════════════════════════════════════════════════════════════
//  Session
// ══════════════════════════════════════════════════════════════
function saveSession(u)  { sessionStorage.setItem('posdz_user',JSON.stringify(u)); }
function getSession()    { const u=sessionStorage.getItem('posdz_user'); return u?JSON.parse(u):null; }
function clearSession()  { sessionStorage.removeItem('posdz_user'); }
function requireAuth(r='index.html') { const u=getSession(); if(!u){window.location.href=r;return null;} return u; }

// ══════════════════════════════════════════════
// نظام إشعار انتهاء الجلسة (بدون غلق الصفحة)
// ══════════════════════════════════════════════
let _sessionTimer=null, _sessionWarnTimer=null, _sessionActive=true;
const SESSION_MINUTES = 30; // دقائق الخمول قبل الإشعار
const SESSION_WARN_MINUTES = 25; // تحذير قبل 5 دقائق

function _resetSessionTimer() {
  if(!getSession()) return;
  clearTimeout(_sessionTimer); clearTimeout(_sessionWarnTimer);
  _sessionActive = true;
  // تحذير بعد 25 دقيقة
  _sessionWarnTimer = setTimeout(() => {
    _pushNotif('session_warn','⏰','تنبيه الجلسة',
      `ستنتهي جلستك خلال 5 دقائق بسبب الخمول — انقر في أي مكان للتجديد`,'warning');
  }, SESSION_WARN_MINUTES * 60 * 1000);
  // إشعار انتهاء بعد 30 دقيقة
  _sessionTimer = setTimeout(() => {
    _sessionActive = false;
    _pushNotif('session_expired','🔒','انتهت الجلسة',
      `انتهت جلستك بسبب الخمول — سجّل الدخول مجدداً عند المتابعة`,'danger');
    // تسجيل خروج صامت لكن يبقى المستخدم في نفس الصفحة
    clearSession();
    // عرض شريط تحذير في الصفحة
    _showSessionExpiredBanner();
  }, SESSION_MINUTES * 60 * 1000);
}

function _showSessionExpiredBanner() {
  if(document.getElementById('_sessionBanner')) return;
  const banner = document.createElement('div');
  banner.id = '_sessionBanner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;text-align:center;padding:14px 16px;font-family:Cairo,sans-serif;font-weight:700;font-size:1rem;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
  banner.innerHTML = `🔒 انتهت الجلسة بسبب الخمول &nbsp;|&nbsp; <a href="index.html" style="color:#fff;text-decoration:underline;font-weight:900;">تسجيل الدخول مجدداً</a> &nbsp;<span style="opacity:0.7;font-size:0.85rem;">(بياناتك محفوظة)</span>`;
  document.body.prepend(banner);
}

function _initSessionTimeout() {
  if(!getSession()) return;
  const events = ['click','keydown','mousemove','touchstart','scroll'];
  events.forEach(ev => document.addEventListener(ev, () => {
    if(!_sessionActive && !getSession()) return; // منتهية — لا تجدد
    _resetSessionTimer();
  }, { passive: true }));
  _resetSessionTimer();
}
function requireRole(roles,r='sale.html') { const u=requireAuth(); if(!u)return null; if(!roles.includes(u.role)){window.location.href=r;return null;} return u; }

// ══════════════════════════════════════════════════════════════
//  Invoice Number
// ══════════════════════════════════════════════════════════════
async function getNextInvoiceNumber() {
  const today=todayStr(); let c=await dbGet('counter',1);
  if(!c) c={id:1,number:1,lastReset:today};
  if(c.lastReset!==today){c.number=1;c.lastReset=today;}
  const n=c.number++; await dbPut('counter',c);
  return '#'+String(n).padStart(3,'0');
}
async function resetDailyCounter() { await dbPut('counter',{id:1,number:1,lastReset:todayStr()}); }

// ══════════════════════════════════════════════════════════════
//  Date Helpers
// ══════════════════════════════════════════════════════════════
function todayStr() { return new Date().toISOString().split('T')[0]; }
function _getLocale() { return {ar:'ar-DZ',fr:'fr-FR',en:'en-US'}[localStorage.getItem('posdz_lang')||'ar']||'ar-DZ'; }
function formatDate(iso,fmt) {
  if(!iso)return'';
  // إذا كانت القيمة تاريخاً بدون وقت (YYYY-MM-DD) نضيف T00:00 لتجنب UTC off-by-one في UTC+1/+2
  const dateStr = iso.length===10 ? iso+'T00:00:00' : iso;
  const d=new Date(dateStr);
  const dy=String(d.getDate()).padStart(2,'0'),mo=String(d.getMonth()+1).padStart(2,'0'),yr=d.getFullYear();
  if(!fmt||fmt==='DD/MM/YYYY')return`${dy}/${mo}/${yr}`; if(fmt==='MM/DD/YYYY')return`${mo}/${dy}/${yr}`; if(fmt==='YYYY/MM/DD')return`${yr}/${mo}/${dy}`; return`${dy}/${mo}/${yr}`;
}
function formatDateTime(iso) { if(!iso)return''; const d=new Date(iso),l=_getLocale(); return d.toLocaleDateString(l)+' '+d.toLocaleTimeString(l,{hour:'2-digit',minute:'2-digit'}); }
function daysBetween(ds)   { return Math.floor((Date.now()-new Date(ds))/86400000); }
function startOfWeek()     { const d=new Date();d.setDate(d.getDate()-d.getDay());d.setHours(0,0,0,0);return d.toISOString(); }
function startOfMonth()    { const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return d.toISOString(); }
function startOfYear()     { const d=new Date();d.setMonth(0,1);d.setHours(0,0,0,0);return d.toISOString(); }

// Currency
let _currency='DA';
async function loadCurrency() { _currency=await getSetting('currency')||'DA'; }
function formatMoney(v) { return parseFloat(v||0).toFixed(2)+' '+_currency; }

// ══════════════════════════════════════════════════════════════
//  Toast
// ══════════════════════════════════════════════════════════════
function toast(msg,type='success',dur=2800) {
  let c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';document.body.appendChild(c);}
  const icons={success:'<i class="fa-solid fa-circle-check"></i>',error:'<i class="fa-solid fa-circle-xmark"></i>',warning:'<i class="fa-solid fa-triangle-exclamation"></i>',info:'<i class="fa-solid fa-circle-info"></i>'};
  const t=document.createElement('div');t.className=`toast toast-${type}`;t.innerHTML=`${icons[type]||''}<span>${msg}</span>`;c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),400);},dur);
}

// Modal
function openModal(id)    { document.getElementById(id)?.classList.add('open'); }
function closeModal(id)   { document.getElementById(id)?.classList.remove('open'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); }

// ══════════════════════════════════════════════════════════════
//  Sidebar
// ══════════════════════════════════════════════════════════════
function initSidebar() {
  document.getElementById('menuBtn')?.addEventListener('click',openSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click',closeSidebar);
  document.getElementById('sidebarCloseBtn')?.addEventListener('click',closeSidebar);
  const cur=window.location.pathname.split('/').pop()||'sale.html';
  document.querySelectorAll('.nav-item').forEach(item=>{ if(item.getAttribute('href')===cur)item.classList.add('active'); });
  const user=getSession();
  if(user) {
    const rl={admin:'مدير',manager:'مدير تنفيذي',seller:'بائع'};
    document.getElementById('sidebarUserName')&&(document.getElementById('sidebarUserName').textContent=user.username);
    document.getElementById('sidebarUserRole')&&(document.getElementById('sidebarUserRole').textContent=rl[user.role]||user.role);
    document.getElementById('sidebarUserInitial')&&(document.getElementById('sidebarUserInitial').textContent=user.username.charAt(0).toUpperCase());
    document.querySelectorAll('[data-role]').forEach(el=>{ if(!el.dataset.role.split(',').includes(user.role))el.style.display='none'; });
  }
  document.getElementById('sidebarVersion')&&(document.getElementById('sidebarVersion').textContent=`v${APP_VERSION.number}`);
}
function openSidebar()  { document.getElementById('sidebarOverlay')?.classList.add('open'); document.getElementById('sidebar')?.classList.add('open'); }
// ensure sidebar starts closed on every page load
function _ensureSidebarClosed(){
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
  // clear any inline style that could override CSS
  const sb=document.getElementById('sidebar');
  if(sb){sb.style.right='';sb.style.left='';}
}
function closeSidebar() { document.getElementById('sidebarOverlay')?.classList.remove('open'); document.getElementById('sidebar')?.classList.remove('open'); }

// Clock
function startClock() {
  const el=document.getElementById('clockDisplay'); if(!el)return;
  function tick(){const n=new Date(),l=_getLocale();el.textContent=n.toLocaleDateString(l,{day:'2-digit',month:'2-digit',year:'numeric'})+' '+n.toLocaleTimeString(l,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
  tick(); setInterval(tick,1000);
}
async function loadHeaderStoreName() { const el=document.getElementById('headerStoreName');if(!el)return;const n=await getSetting('storeName');if(n)el.textContent=n; }

// ══════════════════════════════════════════════════════════════
//  Barcode Scanner
// ══════════════════════════════════════════════════════════════
let barcodeBuffer='',barcodeTimer=null;
function initBarcodeScanner(onScan) {
  document.addEventListener('keydown',(e)=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    if(e.key==='Enter'){if(barcodeBuffer.length>2)onScan(barcodeBuffer);barcodeBuffer='';clearTimeout(barcodeTimer);}
    else if(e.key.length===1){barcodeBuffer+=e.key;clearTimeout(barcodeTimer);barcodeTimer=setTimeout(()=>{barcodeBuffer='';},100);}
  });
}

// Virtual Keyboard
let vkbTarget=null;
function initVirtualKeyboard() {
  if(!document.getElementById('vkbOverlay'))return;
  document.addEventListener('focusin',async(e)=>{
    if(await getSetting('touchKeyboard')!=='1')return;
    if((e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')&&e.target.type!=='date'&&e.target.type!=='file')vkbTarget=e.target;
  });
}
function vkbPress(key){if(!vkbTarget)return;vkbTarget.value=key==='⌫'?vkbTarget.value.slice(0,-1):vkbTarget.value+key;vkbTarget.dispatchEvent(new Event('input',{bubbles:true}));}
function vkbClose(){document.getElementById('vkbOverlay')?.classList.remove('open');vkbTarget=null;}

// ══════════════════════════════════════════════════════════════
//  CSV
// ══════════════════════════════════════════════════════════════
function exportCSV(data,filename) {
  if(!data.length)return toast('لا توجد بيانات للتصدير','warning');
  const h=Object.keys(data[0]),rows=data.map(r=>h.map(k=>`"${r[k]??''}"`).join(','));
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','),...rows].join('\n')],{type:'text/csv;charset=utf-8;'})),download:filename});
  a.click();URL.revokeObjectURL(a.href);
}
function importCSV(file,cb) {
  const r=new FileReader();
  r.onload=(e)=>{
    const lines=e.target.result.split('\n').filter(l=>l.trim());if(lines.length<2)return toast('الملف غير صالح','error');
    const h=lines[0].split(',').map(x=>x.replace(/"/g,'').trim());
    cb(lines.slice(1).map(l=>{const v=l.split(',').map(x=>x.replace(/"/g,'').trim());const o={};h.forEach((k,i)=>o[k]=v[i]||'');return o;}));
  };r.readAsText(file,'UTF-8');
}
function downloadCSVTemplate() {
  const tpl='name,barcode,family,size,unit,buy_price,sell_price,quantity,expiry_date\nمثال منتج,1234567890,عائلة,500ml,قطعة,100,150,50,2026-12-31\n';
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob(['\uFEFF'+tpl],{type:'text/csv;charset=utf-8;'})),download:'products_template.csv'});
  a.click();URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════════
//  Backup
// ══════════════════════════════════════════════════════════════
async function createBackup() {
  const stores=['users','products','families','customers','suppliers','sales','saleItems','debts','debtPayments','expenses','purchases','settings'];
  const bk={version:APP_VERSION.number,timestamp:new Date().toISOString()};
  for(const s of stores)bk[s]=await dbGetAll(s);
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(bk,null,2)],{type:'application/json'})),download:`POSDZ_backup_${todayStr()}.json`});
  a.click();URL.revokeObjectURL(a.href);toast('تم إنشاء النسخة الاحتياطية','success');
}

// ══════════════════════════════════════════════════════════════
//  Restore Backup
// ══════════════════════════════════════════════════════════════
async function restoreBackup(input) {
  const file = input?.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('restoreStatus');
  const showStatus = (msg, type='info') => {
    if (!statusEl) return;
    const colors = { info:'var(--bg-dark)', success:'rgba(16,185,129,0.15)', error:'rgba(239,68,68,0.15)', warn:'rgba(245,158,11,0.15)' };
    statusEl.style.display = '';
    statusEl.style.background = colors[type] || colors.info;
    statusEl.style.color = type==='error' ? 'var(--danger)' : type==='success' ? 'var(--success)' : type==='warn' ? 'var(--warning)' : 'var(--text-primary)';
    statusEl.innerHTML = msg;
  };

  showStatus('⏳ جاري قراءة الملف...');

  // قراءة الملف
  let bk;
  try {
    const text = await file.text();
    bk = JSON.parse(text);
  } catch(e) {
    showStatus('❌ الملف تالف أو غير صالح', 'error');
    input.value = '';
    return;
  }

  // التحقق من البنية
  const stores = ['users','products','families','customers','suppliers','sales','saleItems','debts','debtPayments','expenses','purchases','settings'];
  const found  = stores.filter(s => Array.isArray(bk[s]));
  if (!found.length) {
    showStatus('❌ هذا الملف لا يحتوي على بيانات POS DZ صالحة', 'error');
    input.value = '';
    return;
  }

  // تحذير وتأكيد
  const confirmed = await customConfirmAsync(
    `⚠️ تحذير: استعادة النسخة الاحتياطية ستحذف جميع البيانات الحالية وتستبدلها.\n\n` +
    `📅 تاريخ النسخة: ${bk.timestamp ? new Date(bk.timestamp).toLocaleString('ar-DZ') : 'غير معروف'}\n` +
    `الجداول المحتواة: ${found.join(', ')}\n\n` +
    `هل تريد المتابعة؟`
  );
  if (!confirmed) { showStatus('تم الإلغاء', 'warn'); input.value = ''; return; }

  showStatus('⏳ جاري استعادة البيانات...');

  let totalRestored = 0;
  try {
    for (const store of found) {
      const records = bk[store];
      if (!records?.length) continue;
      // مسح الجدول ثم إعادة الإدخال
      const allOld = await dbGetAll(store);
      for (const rec of allOld) await dbDelete(store, rec.id ?? rec.key);
      for (const rec of records) {
        try { await dbPut(store, rec); totalRestored++; } catch(e) { /* تجاهل التعارضات */ }
      }
    }
    showStatus(
      `✅ تمت الاستعادة بنجاح!<br>` +
      `<span style="font-size:0.85rem;">تمّ استعادة ${totalRestored} سجل من ${found.length} جدول</span><br>` +
      `<span style="font-size:0.82rem;color:var(--text-secondary);">أعد تحميل الصفحة لرؤية البيانات المستعادة</span><br>` +
      `<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="location.reload()">🔄 إعادة تحميل الآن</button>`,
      'success'
    );
    toast('✅ تمت استعادة البيانات بنجاح', 'success', 5000);
  } catch(e) {
    showStatus(`❌ خطأ أثناء الاستعادة: ${e.message}`, 'error');
  }
  input.value = '';
}

// ══════════════════════════════════════════════════════════════
//  Print
// ══════════════════════════════════════════════════════════════
async function printInvoice(sale, items) {
  const g = k => getSetting(k);
  const [sName,sPhone,sAddr,sWelcome,cur,sLogo,pSize,
         pLogo,pName,pPhone,pAddr,pWelcome,pBarcode] =
    await Promise.all(['storeName','storePhone','storeAddress','storeWelcome','currency',
      'storeLogo','paperSize','printLogo','printName','printPhone','printAddress',
      'printWelcome','printBarcode'].map(g));

  const sess      = getSession();
  const printedBy = sess ? sess.username : '';
  const is58      = (pSize === '58mm');

  // التاريخ والساعة
  const D       = new Date(sale.date || Date.now());
  const p2      = n => ('0' + n).slice(-2);
  const dateStr = D.getFullYear() + '/' + p2(D.getMonth()+1) + '/' + p2(D.getDate());
  const timeStr = p2(D.getHours()) + ':' + p2(D.getMinutes());

  // رقم الفاتورة — نزيل # إذا كانت مخزنة مسبقاً
  const invNum = String(sale.invoiceNumber || '').replace(/^#+/, '');
  const lbl = sale.debtSettlement && sale.partialSettlement
    ? 'تسديد جزئي #' + invNum
    : sale.debtSettlement ? 'تسديد #' + invNum
    : sale.isDebt         ? 'فاتورة دين #' + invNum
    : 'فاتورة #' + invNum;

  // العملة
  const C = (cur && cur.trim()) ? cur.trim() : 'DA';

  // ═══════════════════════════════════════════════════════
  // أبعاد الورق
  // pageW = حجم @page
  // هامش @page = 5mm كل جانب (لتجنب البتر)
  // bodyW = pageW − (5mm × 2) = منطقة الكتابة الآمنة
  // ═══════════════════════════════════════════════════════
  const pageW = is58 ? '58mm' : '80mm';
  const marg  = is58 ? '2mm'  : '2mm';   // هامش آمن كل جانب
  // أعمدة الجدول بنسب % (لا mm) لتتكيف مع أي عرض
  // مجموعها 100%: cn=34, cq=9, cp=24, ct=33

  const css = `
@page { size:${pageW} auto; margin:${marg}; }
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10.5pt;
  font-weight: 800;
  color: #000;
  background: #fff;
  width: 100%;
  direction: rtl;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
/* صف بعمودين */
.row2 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  margin: 2.5px 0;
  font-size: 10.5pt;
  font-weight: 800;
}
.row2 .r { text-align: right; white-space: nowrap; }
.row2 .l { text-align: left;  direction: ltr; white-space: nowrap; }
/* الرأس */
.hdr { font-size: 10.5pt; font-weight: 900; }
/* الإجمالي */
.total { font-size: 13pt; font-weight: 900; margin: 3px 0; }
/* المدفوع */
.paid  { font-size: 11pt; font-weight: 800; }
/* وسط */
.ctr { text-align: center; display: block; }
/* اسم المتجر */
.store { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0; }
/* رسالة الترحيب */
.welcome { font-size: 11.5pt; font-weight: 900; margin: 5px 0 3px; }
/* باركود */
.barcode { font-size: 9pt; font-weight: 700; letter-spacing: 4px; margin: 3px 0; }
/* فواصل */
.line-d { border-top: 2px solid #000; margin: 4px 0; }
.line-s { border-top: 1px dashed #000; margin: 4px 0; }
/* جدول المنتجات */
table.items {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 10pt;
  font-weight: 800;
  margin: 3px 0;
}
table.items thead tr { border-bottom: 2px solid #000; }
table.items th { font-weight: 900; padding: 3px 1px; text-align: right; font-size: 9.5pt; }
table.items td { padding: 3px 1px; font-weight: 800; vertical-align: middle; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
table.items tbody tr + tr { border-top: 1px dashed #999; }
.cn { width: 34%; text-align: right; }
.cq { width:  9%; text-align: center; }
.cp { width: 24%; text-align: right; }
.ct { width: 33%; text-align: right; font-weight: 900; }
@media print { * { color:#000 !important; background:transparent !important; } }
`;

  let H = '<!DOCTYPE html><html dir="rtl" lang="ar"><head>'
        + '<meta charset="UTF-8">'
        + '<style>' + css + '</style>'
        + '</head><body>';

  // ── الرأس: رقم الفاتورة في سطر — التاريخ + الساعة في سطر منفصل ──
  H += '<div class="hdr" style="text-align:right;font-weight:900;margin:2px 0;">' + lbl + '</div>'
     + '<div class="hdr" style="text-align:left;direction:ltr;font-weight:800;margin:2px 0;">' + dateStr + '  ' + timeStr + '</div>';

  // البائع
  if (printedBy)
    H += '<div class="row2 hdr">'
       + '<span class="r">البائع:</span>'
       + '<span class="l">' + printedBy + '</span>'
       + '</div>';

  H += '<div class="line-d"></div>';

  // ── بيانات المتجر ──
  if (pLogo==='1' && sLogo)
    H += '<div class="ctr"><img src="'+sLogo+'" style="max-width:55px;max-height:55px;margin:3px auto;display:block;"/></div>';
  if (pName==='1' && sName)
    H += '<div class="ctr store">'+sName+'</div>';
  if (pPhone==='1' && sPhone)
    H += '<div class="ctr" style="font-size:9.5pt;font-weight:800;margin:2px 0;">'+sPhone+'</div>';
  if (pAddr==='1' && sAddr)
    H += '<div class="ctr" style="font-size:9pt;font-weight:700;margin:2px 0;">'+sAddr+'</div>';
  if ((pLogo==='1'&&sLogo)||(pName==='1'&&sName)||(pPhone==='1'&&sPhone)||(pAddr==='1'&&sAddr))
    H += '<div class="line-d"></div>';

  // ── بيانات الزبون ──
  if (sale.customerName) {
    H += '<div class="row2 hdr"><span class="r">الزبون:</span><span class="l">'+sale.customerName+'</span></div>';
    if (sale.customerPhone)
      H += '<div class="row2 hdr"><span class="r">الهاتف:</span><span class="l">'+sale.customerPhone+'</span></div>';
    H += '<div class="line-d"></div>';
  }

  // ── جدول المنتجات ──
  // إصلاح 3: إذا كانت فاتورة تسديد وitems فارغة نعرض صف المبلغ المدفوع تلقائياً
  const displayItems = (items && items.length > 0)
    ? items
    : (sale.debtSettlement
        ? [{ productName: sale.partialSettlement ? 'تسديد جزئي' : 'تسديد دين', quantity: 1, unitPrice: parseFloat(sale.paid||sale.total||0), total: parseFloat(sale.paid||sale.total||0) }]
        : []);

  H += '<table class="items"><thead><tr>'
     + '<th class="cn">المنتج</th>'
     + '<th class="cq">ك</th>'
     + '<th class="cp">السعر</th>'
     + '<th class="ct">المجموع</th>'
     + '</tr></thead><tbody>';

  displayItems.forEach(function(item) {
    // إصلاح 2: زيادة maxL لعرض الاسم كاملاً — الاقتطاع فقط عند الضرورة القصوى
    const maxL = is58 ? 12 : 16;
    const nm   = (item.productName||'—').length > maxL
                 ? (item.productName||'—').slice(0, maxL-1) + '\u2026'
                 : (item.productName||'—');
    H += '<tr>'
       + '<td class="cn">'+nm+'</td>'
       + '<td class="cq">'+parseFloat(item.quantity||1)+'</td>'
       + '<td class="cp">'+parseFloat(item.unitPrice||0).toFixed(2)+'</td>'
       + '<td class="ct">'+parseFloat(item.total||0).toFixed(2)+' '+C+'</td>'
       + '</tr>';
  });
  H += '</tbody></table>';
  H += '<div class="line-d"></div>';

  // ── الإجماليات ──
  if (parseFloat(sale.discount||0) > 0)
    H += '<div class="row2 paid">'
       + '<span class="r">الخصم:</span>'
       + '<span class="l">- '+parseFloat(sale.discount).toFixed(2)+' '+C+'</span>'
       + '</div>';

  H += '<div class="row2 total">'
     + '<span class="r"><b>الإجمالي:</b></span>'
     + '<span class="l">'+C+' '+parseFloat(sale.total||0).toFixed(2)+'</span>'
     + '</div>';

  if (parseFloat(sale.paid||0) > 0) {
    H += '<div class="row2 paid">'
       + '<span class="r">المدفوع:</span>'
       + '<span class="l">'+C+' '+parseFloat(sale.paid).toFixed(2)+'</span>'
       + '</div>';
    if (parseFloat(sale.change||0) > 0)
      H += '<div class="row2 paid">'
         + '<span class="r"><b>الباقي:</b></span>'
         + '<span class="l">'+C+' '+parseFloat(sale.change).toFixed(2)+'</span>'
         + '</div>';
    if (sale.isDebt) {
      const rem = parseFloat(sale.total||0) - parseFloat(sale.paid||0);
      if (rem > 0)
        H += '<div class="row2 paid">'
           + '<span class="r"><b>الدين:</b></span>'
           + '<span class="l">'+C+' '+rem.toFixed(2)+'</span>'
           + '</div>';
    }
  }
  if (sale.remainingDebt !== undefined && parseFloat(sale.remainingDebt) > 0)
    H += '<div class="row2 paid">'
       + '<span class="r"><b>المتبقي:</b></span>'
       + '<span class="l">'+C+' '+parseFloat(sale.remainingDebt).toFixed(2)+'</span>'
       + '</div>';

  H += '<div class="line-d"></div>';

  // ── رسالة الترحيب ──
  if (pWelcome==='1' && sWelcome)
    H += '<div class="ctr welcome">'+sWelcome+'</div>';

  // ── باركود نصي ──
  if (pBarcode==='1' && sale.invoiceNumber)
    H += '<div class="ctr barcode">||||| #'+invNum+' |||||</div>';

  H += '<div class="line-s"></div>';

  // هامش سفلي لقطع الورق
  H += '<br/><br/>';
  H += '</body></html>';

  await _smartPrint(H, 'printerInvoice', pSize || '80mm');
}


// ══════════════════════════════════════════════════════════════
// طباعة ذكية — تستخدم السيرفر للطابعة المحددة، أو نافذة المتصفح كـ fallback
// ══════════════════════════════════════════════════════════════
async function _smartPrint(html, printerKey, labelSize, printW, printH) {
  // هل السيرفر متاح؟
  try {
    const syncEnabled = await getSetting('syncEnabled');
    const serverIP    = await getSetting('syncServerIP')   || '192.168.1.1';
    const serverPort  = await getSetting('syncServerPort') || '3000';
    if (syncEnabled === '1') {
      const printerName = await getSetting(printerKey) || '';
      const resp = await fetch(`http://${serverIP}:${serverPort}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, printerName, labelSize }),
        signal: AbortSignal.timeout(8000)
      });
      if (resp.ok) {
        const r = await resp.json();
        if (r.status === 'ok') { toast(`🖨️ جاري الطباعة على: ${r.printer}`, 'success'); return; }
      }
    }
  } catch(e) { /* السيرفر غير متاح — نستخدم المتصفح */ }
  // Fallback: نافذة المتصفح
  _silentPrint(html);
}

function _thermalPrint(html, printW, printH) {
  // 1mm = 3.7795px عند 96dpi — نحسب حجم النافذة بدقة من أبعاد الملصق
  const MM = 3.7795;
  const wPx = printW ? Math.round(printW * MM) + 40 : 420;  // +40 هامش إطار النافذة
  const hPx = printH ? Math.round(printH * MM) + 80 : 600;  // +80 هامش شريط العنوان
  const w = window.open('', '_blank', `width=${wPx},height=${hPx},scrollbars=no,toolbar=no,menubar=no,location=no,status=no`);
  if (!w) { _silentPrint(html); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = function() {
    setTimeout(function() {
      try {
        w.focus();
        w.print();
        w.onafterprint = function() { try { w.close(); } catch(e) {} };
        setTimeout(function() { try { if(!w.closed) w.close(); } catch(e) {} }, 9000);
      } catch(e) { try { w.print(); } catch(e2) {} }
    }, 350);
  };
  setTimeout(function() {
    if (w && !w.closed) { try { w.focus(); w.print(); } catch(e) {} }
  }, 1800);
}

function _silentPrint(html) {
  document.getElementById('_posdzPrintFrame')?.remove();
  const f=document.createElement('iframe');f.id='_posdzPrintFrame';f.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;';document.body.appendChild(f);
  const doc=f.contentWindow.document;doc.open();doc.write(html);doc.close();
  f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch(e){const w=window.open('','_blank','width=1,height=1');if(w){w.document.write(html);w.document.close();w.onload=()=>{w.print();w.onafterprint=()=>w.close();};}}setTimeout(()=>f.parentNode&&f.remove(),3000);};
}

async function printBarcodeLabel(product) {
  const bv=product.barcode||String(product.id);
  const[sName,cur,bcFont,bcType,showStore,showName,showPrice,rawSize,rawFs]=await Promise.all(
    ['storeName','currency','barcodeFont','barcodeType','barcodeShowStore','barcodeShowName','barcodeShowPrice','barcodeLabelSize','barcodeFontSize'].map(k=>getSetting(k))
  );
  // أبعاد الملصق الحقيقية
  const sizeMap={'58x38':'58mm 38mm','58x30':'58mm 30mm','58x20':'58mm 20mm','40x30':'40mm 30mm','40x25':'40mm 25mm','40x20':'40mm 20mm','38x25':'38mm 25mm','30x20':'30mm 20mm'};
  const labelSize=sizeMap[rawSize||'58x38']||'58mm 38mm';
  const [pageW,pageH]=labelSize.split(' ');
  const bodyW=parseInt(pageW)-4;
  const baseFontSize=Math.max(6,Math.min(24,parseInt(rawFs)||12));
  const storeFontSize=Math.max(6,baseFontSize-3);
  const barcodeFontSize=Math.max(5,baseFontSize-4);
  const priceFontSize=Math.max(8,baseFontSize+3);
  const barsH=Math.max(18,parseInt(pageH)-20);
  function buildBars(code){
    const s=String(code),N=2,W=4,H=barsH;
    let b='<div style="width:2px;height:'+H+'px;background:#000"></div><div style="width:2px;height:'+H+'px;background:#fff"></div>';
    for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);for(let j=0;j<5;j++){const bl=j%2===0,bit=(c>>(4-j))&1,w=bit?W:N;b+=`<div style="width:${w}px;height:${H}px;background:${bl?'#000':'#fff'}"></div>`;}b+='<div style="width:2px;height:'+H+'px;background:#fff"></div>';}
    b+='<div style="width:2px;height:'+H+'px;background:#000"></div>';
    return`<div style="display:flex;align-items:flex-end;justify-content:center;overflow:hidden;max-width:${bodyW}mm;">${b}</div>`;
  }
  const bars=bcType==='QR'?`<div style="font-size:${barcodeFontSize}px;font-family:monospace;border:2px solid #000;padding:2px;display:inline-block;">[QR:${bv}]</div>`:buildBars(bv);

  // طابعات الباركود تغذي الورق عمودياً: pageW = الارتفاع الفعلي، pageH = العرض الفعلي
  // لذلك نعكس الأبعاد في @page: size = pageH × pageW (portrait)
  const printW = parseInt(pageH); // عرض الطباعة = الارتفاع المُدخل
  const printH = parseInt(pageW); // ارتفاع الطباعة = العرض المُدخل
  const printBodyW = printW - 4;

  const labelHTML=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{margin:0;size:${printW}mm ${printH}mm;}*{margin:0;padding:0;box-sizing:border-box;}html{width:${printW}mm;height:${printH}mm;overflow:hidden;}body{font-family:'${bcFont||'Cairo'}',Arial,sans-serif;background:#fff;color:#000;width:${printBodyW}mm;height:${printH}mm;overflow:hidden;text-align:center;padding:1mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.sn{font-size:${storeFontSize}px;font-weight:800;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:${printBodyW}mm;}.pn{font-size:${baseFontSize}px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${printBodyW}mm;}.bc{font-family:'Courier New',monospace;font-size:${barcodeFontSize}px;letter-spacing:1px;font-weight:800;}.pr{font-size:${priceFontSize}px;font-weight:900;margin-top:1px;}@media print{*{color:#000!important;}}</style></head><body>${showStore==='1'&&sName?`<div class="sn">${sName}</div>`:''}${showName!=='0'?`<div class="pn">${product.name}${product.size?' — '+product.size:''}</div>`:''}${bars}<div class="bc">${bv}</div>${showPrice!=='0'?`<div class="pr">${parseFloat(product.sellPrice||0).toFixed(2)} ${cur||'DA'}</div>`:''}</body></html>`;
  // طباعة ذكية: عبر السيرفر إذا متاح، وإلا نافذة المتصفح
  await _smartPrint(labelHTML, 'printerBarcode', rawSize || '58x38', printW, printH);
}


// ══════════════════════════════════════════════════════════════
//  Sound
// ══════════════════════════════════════════════════════════════
let _AC=null;
function _getAC(){if(_AC&&_AC.state!=='closed'){if(_AC.state==='suspended')_AC.resume().catch(()=>{});return _AC;}try{_AC=new(window.AudioContext||window.webkitAudioContext)();return _AC;}catch(e){return null;}}
function _beep(f=880,d=0.12,t='sine',v=0.4){const ac=_getAC();if(!ac)return;try{const g=ac.createGain(),o=ac.createOscillator(),n=ac.currentTime;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(0.001,n+d);o.type=t;o.frequency.setValueAtTime(f,n);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+d);}catch(e){}}
['click','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,()=>_getAC(),{passive:true}));
async function playSound(type){const m={add:'soundAdd',sell:'soundSell',btn:'soundButtons'};try{if(await getSetting(m[type]||'soundButtons')!=='1')return;}catch{return;}_getAC();if(type==='add'){_beep(880,0.09,'sine',0.4);}else if(type==='sell'){_beep(660,0.10,'triangle',0.45);setTimeout(()=>_beep(880,0.15,'triangle',0.4),110);setTimeout(()=>_beep(1100,0.22,'triangle',0.38),240);}else{_beep(600,0.06,'square',0.22);}}
function initButtonSounds(){document.addEventListener('click',async(e)=>{const b=e.target.closest('button,.btn,.nav-item,.tab-btn,.disc-pill');if(!b||b.dataset.soundSkip||b.classList.contains('sound-sell')||b.classList.contains('sound-add'))return;playSound('btn');},{passive:true});}

// ══════════════════════════════════════════════════════════════
//  الميزان الإلكتروني — Web Serial API
// ══════════════════════════════════════════════════════════════
const SCALE = {
  port:null, reader:null, active:false, lastWeight:null, buffer:'', callbacks:[],
  async connect() {
    if(!('serial' in navigator)){toast('Web Serial غير مدعوم — استخدم Chrome','error');return false;}
    try {
      const baudRate=parseInt(await getSetting('scaleBaudRate'))||9600;
      this.port=await navigator.serial.requestPort();
      await this.port.open({baudRate,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
      this.active=true;this.buffer='';await setSetting('scaleEnabled','1');
      toast('تم الاتصال بالميزان','success');this._startReading();return true;
    } catch(e){if(e.name!=='NotFoundError')toast('فشل الاتصال: '+e.message,'error');return false;}
  },
  async disconnect() {
    this.active=false;
    try{if(this.reader){await this.reader.cancel();this.reader=null;}}catch(e){}
    try{if(this.port){await this.port.close();this.port=null;}}catch(e){}
    await setSetting('scaleEnabled','0');toast('تم قطع الاتصال','info');
  },
  async _startReading() {
    const dec=new TextDecoder();
    while(this.port&&this.active){
      try{
        this.reader=this.port.readable.getReader();
        while(true){const{value,done}=await this.reader.read();if(done)break;this.buffer+=dec.decode(value);const ls=this.buffer.split(/[\r\n]+/);this.buffer=ls.pop();ls.filter(l=>l.trim()).forEach(l=>this._parseLine(l.trim()));}
      }catch(e){if(this.active){toast('انقطع الاتصال — إعادة المحاولة...','warning');await new Promise(r=>setTimeout(r,3000));}}
      finally{if(this.reader){try{this.reader.releaseLock();}catch(e){}this.reader=null;}}
    }
  },
  _parseLine(line) {
    let w=null,m;
    m=line.match(/[+\-]?\s*(\d+[.,]\d{1,3})\s*(?:kg|KG|g|G)?/);if(m)w=parseFloat(m[1].replace(',','.'));
    if(w===null){m=line.match(/(?:ST|US|OL),\w+,[+\-]?(\d+[.,]\d+)\s*(?:kg|g)?/i);if(m)w=parseFloat(m[1].replace(',','.'));}
    if(w===null){m=line.match(/^[A-Z\s]*(\d+[.,]\d+)\s*(?:kg|g)/i);if(m)w=parseFloat(m[1].replace(',','.'));}
    if(w===null){m=line.match(/^(\d+[.,]\d+)$/);if(m)w=parseFloat(m[1].replace(',','.'));}
    if(w!==null&&w>=0){this.lastWeight=w;this.callbacks.forEach(cb=>{try{cb(w);}catch(e){}});}
  },
  onWeight(cb){this.callbacks.push(cb);},
  offWeight(cb){this.callbacks=this.callbacks.filter(x=>x!==cb);},
  readOnce(){return this.lastWeight;},
  async reconnect(){if(this.active)await this.disconnect();return this.connect();}
};

// ══════════════════════════════════════════════════════════════
//  البريد الإلكتروني
// ══════════════════════════════════════════════════════════════
const EMAIL = {
  async _url(){const ip=await getSetting('syncServerIP')||'localhost',port=await getSetting('syncServerPort')||'3000';return`http://${ip}:${port}`;},
  async send({to,subject,body,html}){
    if(await getSetting('emailEnabled')!=='1')return false;
    try{const r=await fetch(`${await this._url()}/api/email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,subject,body,html}),signal:AbortSignal.timeout(8000)});return r.ok;}catch(e){return false;}
  },
  async sendInvoice(customer,sale,items){
    if(await getSetting('emailOnSale')!=='1'||!customer?.email)return;
    const cur=await getSetting('currency')||'DA',name=await getSetting('storeName')||'POS DZ';
    const rows=items.map(i=>`<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${parseFloat(i.total).toFixed(2)} ${cur}</td></tr>`).join('');
    await this.send({to:customer.email,subject:`فاتورة ${sale.invoiceNumber} — ${name}`,html:`<div dir="rtl" style="font-family:Arial;max-width:600px;margin:auto;"><h2>فاتورة رقم ${sale.invoiceNumber}</h2><table border="1" cellpadding="8" style="width:100%;border-collapse:collapse;"><thead><tr><th>المنتج</th><th>الكمية</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table><p><strong>الإجمالي: ${parseFloat(sale.total).toFixed(2)} ${cur}</strong></p></div>`});
  },
  async sendLowStockAlert(products){
    if(await getSetting('emailOnLowStock')!=='1')return;const to=await getSetting('emailRecipient');if(!to)return;
    await this.send({to,subject:'⚠️ تنبيه نفاذ المخزون — POS DZ',html:`<div dir="rtl"><h3>منتجات منخفضة:</h3><ul>${products.map(p=>`<li>${p.name} — ${p.quantity}</li>`).join('')}</ul></div>`});
  },
  async sendDailyReport(rep){
    if(await getSetting('emailDailyReport')!=='1')return;const to=await getSetting('emailRecipient');if(!to)return;
    const cur=await getSetting('currency')||'DA';
    await this.send({to,subject:`📊 التقرير اليومي ${todayStr()} — POS DZ`,html:`<div dir="rtl" style="font-family:Arial;max-width:600px;margin:auto;"><h2>التقرير اليومي — ${todayStr()}</h2><table border="1" cellpadding="8" style="width:100%;border-collapse:collapse;"><tr><td>مداخيل البيع</td><td><b>${parseFloat(rep.revenue||0).toFixed(2)} ${cur}</b></td></tr><tr><td>تكلفة الشراء</td><td>${parseFloat(rep.cost||0).toFixed(2)} ${cur}</td></tr><tr><td>المصاريف</td><td>${parseFloat(rep.expenses||0).toFixed(2)} ${cur}</td></tr><tr><td>صافي الربح</td><td><b style="color:green">${parseFloat(rep.profit||0).toFixed(2)} ${cur}</b></td></tr><tr><td>الديون</td><td style="color:red">${parseFloat(rep.debts||0).toFixed(2)} ${cur}</td></tr></table></div>`});
  }
};

// SMS (معطّل)
const SMS = {
  async send(to,msg){
    if(await getSetting('smsEnabled')!=='1')return false;
    try{const ip=await getSetting('syncServerIP')||'localhost',port=await getSetting('syncServerPort')||'3000';const r=await fetch(`http://${ip}:${port}/api/sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,message:msg}),signal:AbortSignal.timeout(8000)});return r.ok;}catch(e){return false;}
  },
  async remindDebt(customer,amount){if(!customer?.phone)return;const cur=await getSetting('currency')||'DA',store=await getSetting('storeName')||'';return this.send(customer.phone,`${store?store+' — ':''}تذكير: لديك دين بقيمة ${parseFloat(amount).toFixed(2)} ${cur}. شكراً لثقتك.`);}
};

// الدفع بالبطاقة (معطّل)
const CARD_PAYMENT={async isEnabled(){return await getSetting('cardPaymentEnabled')==='1';},async process(){toast('الدفع بالبطاقة غير مفعّل بعد','info');return false;}};

// ══════════════════════════════════════════════════════════════
//  المزامنة LAN
// ══════════════════════════════════════════════════════════════
const SYNC = {
  connected:false,
  async init(){if(await getSetting('syncEnabled')!=='1')return;await this._processQueue();this._connect();},
  async _url(){return`http://${await getSetting('syncServerIP')||'192.168.1.1'}:${await getSetting('syncServerPort')||'3000'}`;},
  async _connect(){
    try{const r=await fetch(`${await this._url()}/api/ping`,{signal:AbortSignal.timeout(3000)});if(r.ok){this.connected=true;this._ind(true);await this._processQueue();}}
    catch(e){this.connected=false;this._ind(false);setTimeout(()=>this._connect(),30000);}
  },
  _ind(online){
    let el=document.getElementById('syncIndicator');
    if(!el){el=Object.assign(document.createElement('div'),{id:'syncIndicator'});el.style.cssText='display:flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;color:var(--text-secondary);flex-shrink:0;';document.querySelector('.app-header')?.appendChild(el);}
    el.innerHTML=online?'<i class="fa-solid fa-circle" style="color:var(--success);font-size:0.55rem;"></i><span>متزامن</span>':'<i class="fa-solid fa-circle" style="color:var(--danger);font-size:0.55rem;"></i><span>غير متصل</span>';
  },
  async push(action,store,data){
    if(await getSetting('syncEnabled')!=='1')return;
    if(!this.connected){await dbAdd('syncQueue',{action,store,data,createdAt:new Date().toISOString()});return;}
    try{await fetch(`${await this._url()}/api/sync`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,store,data}),signal:AbortSignal.timeout(5000)});}
    catch(e){await dbAdd('syncQueue',{action,store,data,createdAt:new Date().toISOString()});}
  },
  async _processQueue(){
    if(!this.connected)return;const q=await dbGetAll('syncQueue'),url=await this._url();
    for(const i of q){try{const r=await fetch(`${url}/api/sync`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:i.action,store:i.store,data:i.data}),signal:AbortSignal.timeout(5000)});if(r.ok)await dbDelete('syncQueue',i.id);}catch(e){break;}}
  },
  async pull(store){if(!this.connected)return null;try{const r=await fetch(`${await this._url()}/api/data/${store}`,{signal:AbortSignal.timeout(5000)});if(r.ok)return r.json();}catch(e){}return null;}
};

// ══════════════════════════════════════════════════════════════
//  النظام المحاسبي
// ══════════════════════════════════════════════════════════════
const ACCOUNTING = {
  async addExpense({category,amount,description,date}){
    const id=await dbAdd('expenses',{category:category||'عام',amount:parseFloat(amount),description:description||'',date:date||new Date().toISOString(),createdBy:getSession()?.username||''});
    await SYNC.push('add','expenses',{id,category,amount,description,date});return id;
  },
  async getDayReport(dateStr){
    dateStr=dateStr||todayStr();const s=dateStr+'T00:00:00.000Z',e=dateStr+'T23:59:59.999Z';
    const sales=await dbGetByRange('sales','date',s,e),expenses=await dbGetByRange('expenses','date',s,e);
    const revenue=sales.reduce((t,x)=>t+parseFloat(x.total||0),0);
    let cost=0;for(const sale of sales){const items=await dbGetByIndex('saleItems','saleId',sale.id);for(const item of items){const p=await dbGet('products',item.productId);cost+=parseFloat(p?.buyPrice||0)*parseFloat(item.quantity||0);}}
    const totalExp=expenses.reduce((t,x)=>t+parseFloat(x.amount||0),0),gross=revenue-cost,net=gross-totalExp;
    const debts=await dbGetByRange('debts','date',s,e),totalDebts=debts.filter(d=>!d.isPaid).reduce((t,d)=>t+parseFloat(d.amount||0),0);
    return{date:dateStr,revenue:+revenue.toFixed(2),cost:+cost.toFixed(2),expenses:+totalExp.toFixed(2),grossProfit:+gross.toFixed(2),netProfit:+net.toFixed(2),debts:+totalDebts.toFixed(2),salesCount:sales.length,expensesList:expenses};
  },
  async getCustomerDebt(customerId){
    const all=await dbGetByIndex('debts','customerId',customerId),unpaid=all.filter(d=>!d.isPaid);
    return{total:unpaid.reduce((t,d)=>t+parseFloat(d.amount||0),0),count:unpaid.length,oldest:unpaid.reduce((m,d)=>!m||d.date<m?d.date:m,null),debts:unpaid};
  },
  async partialPayment(debtId,amount,note){
    const debt=await dbGet('debts',debtId);if(!debt||debt.isPaid)return null;
    const paid=parseFloat(amount),before=parseFloat(debt.amount),after=Math.max(0,before-paid);
    await dbAdd('debtPayments',{debtId,customerId:debt.customerId,amount:paid,before,after,note:note||'',date:new Date().toISOString()});
    debt.amount=after;debt.isPaid=after<=0;debt.lastPayDate=new Date().toISOString();
    await dbPut('debts',debt);await SYNC.push('update','debts',debt);
    return{before,paid,after,isPaid:debt.isPaid};
  },
  async getPaymentHistory(customerId){return dbGetByIndex('debtPayments','customerId',customerId);},
  async getAllDebtsTotal(){const all=await dbGetAll('debts');return all.filter(d=>!d.isPaid).reduce((t,d)=>t+parseFloat(d.amount||0),0);}
};

// ══════════════════════════════════════════════════════════════
//  نهاية الجزء 1 — يكمل في app_part2.js
// ══════════════════════════════════════════════════════════════
// ============================================================
//  POS DZ — app.js  v6.0.0  |  الجزء 2 من 2
//  الأقلمة + الثيم + الحوارات + الإشعارات + التهيئة
// ============================================================

// ══════════════════════════════════════════════════════════════
//  الأقلمة — i18n ثلاث لغات كاملة
// ══════════════════════════════════════════════════════════════
const APP_I18N = {
  ar: {
    // Sidebar
    navSale:'واجهة البيع', navInventory:'المخزون',
    navCustomers:'الزبائن', navReports:'إدارة الأعمال',
    navUsers:'المستخدمون', navSuppliers:'الموردون',
    navSettings:'الإعدادات', navLogout:'خروج',
    navGroupSale:'المبيعات', navGroupManage:'الإدارة', navGroupSystem:'النظام',
    // عناوين الصفحات
    titleSale:'واجهة البيع', titleInventory:'إدارة المخزون',
    titleCustomers:'إدارة الزبائن', titleReports:'إدارة الأعمال',
    titleUsers:'إدارة المستخدمين', titleSuppliers:'إدارة الموردين',
    titleSettings:'الإعدادات العامة', titleAbout:'حول التطبيق',
    // أزرار مشتركة
    btnSave:'حفظ', btnCancel:'إلغاء', btnClose:'إغلاق', btnAdd:'إضافة',
    btnEdit:'تعديل', btnDelete:'حذف', btnPrint:'طباعة', btnSearch:'بحث',
    btnBack:'رجوع', btnConfirm:'تأكيد', btnAll:'الكل', btnExport:'تصدير',
    btnImport:'استيراد', btnBackup:'نسخة احتياطية', btnRefresh:'تحديث',
    // البيع
    saleSearchPH:'ابحث عن منتج أو امسح الباركود...',
    saleProduct:'المنتج', saleQty:'الكمية', salePrice:'السعر', saleTotal:'المجموع',
    saleDiscount:'خصم:', saleCustomer:'الزبون:', salePaid:'المبلغ المدفوع:',
    saleBtnCheckout:'تسديد', saleBtnPartial:'جزئي + دين', saleBtnDebt:'دين كامل',
    saleEmpty:'السلة فارغة', saleTotalLabel:'الإجمالي', saleItemsUnit:'صنف',
    saleModalTitle:'تأكيد البيع', saleBtnPrint:'طباعة الفاتورة',
    saleSelectCustomer:'— اختر الزبون —',
    // الميزان
    scaleWeight:'الوزن:', scalePrice:'السعر/كغ:', scaleTotal:'المجموع:',
    scaleBtnAdd:'إضافة للسلة', scaleBtnLabel:'طباعة ملصق', scaleBtnConnect:'اتصال بالميزان',
    scaleConnected:'متصل', scaleDisconnected:'غير متصل', scaleManualInput:'أدخل الوزن يدوياً',
    // الزبائن
    custAdd:'إضافة زبون', custSearch:'ابحث بالاسم أو الهاتف...',
    custFilterAll:'الكل', custFilterDebt:'مديونون', custFilterClear:'مسددون',
    custName:'الاسم', custPhone:'الهاتف', custEmail:'البريد الإلكتروني',
    custBtnDebts:'الديون', custBtnPartial:'تسديد جزئي', custBtnPayAll:'تسديد الكل',
    custTotalCustomers:'إجمالي الزبائن', custTotalDebt:'إجمالي الديون',
    custNoDebt:'لا ديون', custDebtLeft:'دين متبقي', custDaysSince:'يوم',
    // المخزون
    invAddProduct:'إضافة منتج', invAddFamily:'إضافة عائلة',
    invSearch:'ابحث عن منتج...',
    invColProduct:'المنتج', invColFamily:'العائلة', invColBuyPrice:'سعر الشراء',
    invColPrice:'سعر البيع', invColQty:'المخزون', invColBarcode:'الباركود', invColActions:'إجراءات',
    invLowStock:'مخزون منخفض', invOutStock:'نفذت الكمية',
    // التقارير / المحاسبة
    repDashboard:'لوحة التحكم', repDaily:'المداخيل اليومية',
    repDebts:'الديون', repFamilies:'العائلات', repProducts:'السلع',
    repScale:'الميزان', repAccounting:'المحاسبة',
    repRevenue:'مداخيل البيع', repCost:'تكلفة الشراء',
    repExpenses:'المصاريف', repGrossProfit:'الفائدة الإجمالية',
    repNetProfit:'صافي الربح', repTotalDebts:'إجمالي الديون',
    repToday:'اليوم', repWeek:'أسبوعي', repMonth:'شهري', repYear:'سنوي',
    repCloseDay:'إقفال اليوم', repPrintAll:'طباعة الكل',
    // الإعدادات
    settGeneral:'إعدادات عامة', settDisplay:'العرض', settPrint:'الطباعة',
    settNotif:'الإشعارات', settScale:'الميزان', settSync:'المزامنة',
    settEmail:'البريد الإلكتروني', settSMS:'الرسائل SMS',
    settCard:'الدفع بالبطاقة', settAbout:'حول التطبيق',
    settFont:'الخط', settLanguage:'اللغة', settTheme:'اللون', settBgMode:'وضع العرض',
    fontCairo:'Cairo', fontTajawal:'Tajawal', fontIBM:'IBM Plex Arabic',
    fontNoto:'Noto Sans Arabic', fontAlmarai:'Almarai', fontAmiri:'Amiri',
    modeDark:'داكن', modeLight:'فاتح',
    // حول
    aboutVersion:'الإصدار', aboutDate:'تاريخ الإصدار',
    aboutApp:'تطبيق نقطة بيع جزائري متكامل',
    // أخطاء
    errRequired:'هذا الحقل مطلوب', errInvalidQty:'الكمية غير صالحة',
    errOutOfStock:'المخزون غير كافٍ', errNoCustomer:'يجب اختيار زبون للدين',
    errLoginFailed:'اسم المستخدم أو كلمة المرور خاطئة',
    errScaleNotConnected:'الميزان غير متصل',
    // تأكيدات
    confirmDelete:'هل أنت متأكد من الحذف؟',
    confirmLogout:'هل تريد تسجيل الخروج؟',
    confirmCloseDay:'هل تريد إقفال اليوم؟',
    // حوارات
    dialogYes:'نعم', dialogNo:'لا', dialogOk:'حسناً',
    currencyLabel:'دج',
    // تقارير إضافية
    repBackToSale:'رجوع للبيع', repPeriodWeek:'أسبوعي', repPeriodMonth:'شهري', repPeriodYear:'سنوي',
    // إعدادات labels
    saveBtn:'💾 حفظ', labelDate:'صيغة التاريخ', labelCurrency:'رمز العملة',
    labelLang:'لغة البرنامج', labelLangDesc:'تطبيق فوري على كل الصفحات',
    labelFont:'خط التطبيق', labelFontSize:'حجم الخط',
    labelBgMode:'وضع الخلفية', bgDark:'داكن', bgLight:'فاتح',
    labelAccentColor:'لون الأيقونات والأزرار',
    labelSoundAdd:'صوت إضافة المنتج', labelSoundSell:'صوت إتمام البيع', labelSoundBtn:'صوت الأزرار',
    labelBarcode:'تفعيل قارئ الباركود', labelBarcodeDesc:'يضيف المنتجات تلقائياً',
    labelBarcodeAuto:'حجز المنتجات تلقائياً',
    labelTouchKb:'الكيبورد الافتراضي', labelTouchKbDesc:'زر قابل للسحب على جانب الشاشة',
    // المخزون إضافي
    invAlerts:'تنبيهات المخزون', invTabAll:'كل المنتجات', invTabFamilies:'العائلات',
    invTabImport:'استيراد / تصدير', invFormTitleAdd:'إضافة منتج جديد',
    invColUnit:'الوحدة', invColExpiry:'الصلاحية', invColAlert:'تنبيه',
    invLabelName:'اسم المنتج', invLabelSize:'الحجم / المقاس', invLabelExpiry:'تاريخ نهاية الصلاحية',
    invBtnClear:'تفريغ الحقول', invImportTitle:'استيراد المنتجات', invExportTitle:'تصدير المنتجات',
    invBtnExport:'تصدير كل المنتجات (CSV)', invBtnTemplate:'تحميل نموذج CSV',
    invImportConfirm:'تأكيد الاستيراد', invImportAccept:'قبول التحديث', invImportSkip:'تجاهل المنتجات المشابهة',
    // الموردون
    supBtnAdd:'إضافة مورد جديد', supSearch:'ابحث عن مورد...',
    supAddress:'العنوان', supActivity:'نوع النشاط',
    // المستخدمون
    userBtnAdd:'إضافة مستخدم', userColName:'المستخدم',
    userColRole:'الصلاحية', userColDate:'تاريخ الإنشاء',
    userLabelName:'اسم المستخدم', userLabelPass:'الرقم السري',
    // تاريخ الدين
    custDebtDate:'تاريخ الدين:',
  },
  fr: {
    navSale:'Vente', navInventory:'Stock',
    navCustomers:'Clients', navReports:'Activité',
    navUsers:'Utilisateurs', navSuppliers:'Fournisseurs',
    navSettings:'Paramètres', navLogout:'Déconnexion',
    navGroupSale:'Ventes', navGroupManage:'Gestion', navGroupSystem:'Système',
    titleSale:'Interface de Vente', titleInventory:'Gestion du Stock',
    titleCustomers:'Gestion Clients', titleReports:'Activité Commerciale',
    titleUsers:'Gestion Utilisateurs', titleSuppliers:'Fournisseurs',
    titleSettings:'Paramètres Généraux', titleAbout:'À propos',
    btnSave:'Enregistrer', btnCancel:'Annuler', btnClose:'Fermer', btnAdd:'Ajouter',
    btnEdit:'Modifier', btnDelete:'Supprimer', btnPrint:'Imprimer', btnSearch:'Rechercher',
    btnBack:'Retour', btnConfirm:'Confirmer', btnAll:'Tout', btnExport:'Exporter',
    btnImport:'Importer', btnBackup:'Sauvegarde', btnRefresh:'Actualiser',
    saleSearchPH:'Rechercher un produit ou scanner...',
    saleProduct:'Produit', saleQty:'Qté', salePrice:'Prix', saleTotal:'Total',
    saleDiscount:'Remise:', saleCustomer:'Client:', salePaid:'Montant payé:',
    saleBtnCheckout:'Payer', saleBtnPartial:'Partiel + Crédit', saleBtnDebt:'Crédit total',
    saleEmpty:'Panier vide', saleTotalLabel:'Total', saleItemsUnit:'article(s)',
    saleModalTitle:'Confirmer la vente', saleBtnPrint:'Imprimer la facture',
    saleSelectCustomer:'— Choisir client —',
    scaleWeight:'Poids:', scalePrice:'Prix/kg:', scaleTotal:'Total:',
    scaleBtnAdd:'Ajouter au panier', scaleBtnLabel:'Imprimer étiquette', scaleBtnConnect:'Connecter balance',
    scaleConnected:'Connectée', scaleDisconnected:'Déconnectée', scaleManualInput:'Saisir poids manuellement',
    custAdd:'Ajouter client', custSearch:'Rechercher par nom ou téléphone...',
    custFilterAll:'Tout', custFilterDebt:'Débiteurs', custFilterClear:'Soldés',
    custName:'Nom', custPhone:'Téléphone', custEmail:'E-mail',
    custBtnDebts:'Dettes', custBtnPartial:'Paiement partiel', custBtnPayAll:'Tout payer',
    custTotalCustomers:'Total clients', custTotalDebt:'Total dettes',
    custNoDebt:'Aucune dette', custDebtLeft:'Reste à payer', custDaysSince:'j',
    invAddProduct:'Ajouter produit', invAddFamily:'Ajouter famille',
    invSearch:'Rechercher produit...',
    invColProduct:'Produit', invColFamily:'Famille', invColBuyPrice:"Prix d'achat",
    invColPrice:'Prix vente', invColQty:'Stock', invColBarcode:'Code-barres', invColActions:'Actions',
    invLowStock:'Stock bas', invOutStock:'Rupture de stock',
    repDashboard:'Tableau de bord', repDaily:'Revenus journaliers',
    repDebts:'Dettes', repFamilies:'Familles', repProducts:'Produits',
    repScale:'Balance', repAccounting:'Comptabilité',
    repRevenue:"Chiffre d'affaires", repCost:"Coût d'achat",
    repExpenses:'Dépenses', repGrossProfit:'Bénéfice brut',
    repNetProfit:'Bénéfice net', repTotalDebts:'Total dettes',
    repToday:"Aujourd'hui", repWeek:'Semaine', repMonth:'Mois', repYear:'Année',
    repCloseDay:'Clôture journée', repPrintAll:'Tout imprimer',
    settGeneral:'Paramètres généraux', settDisplay:'Affichage', settPrint:'Impression',
    settNotif:'Notifications', settScale:'Balance', settSync:'Synchronisation',
    settEmail:'E-mail', settSMS:'SMS', settCard:'Paiement carte', settAbout:'À propos',
    settFont:'Police', settLanguage:'Langue', settTheme:'Couleur', settBgMode:"Mode d'affichage",
    fontCairo:'Cairo', fontTajawal:'Tajawal', fontIBM:'IBM Plex Arabic',
    fontNoto:'Noto Sans Arabic', fontAlmarai:'Almarai', fontAmiri:'Amiri',
    modeDark:'Sombre', modeLight:'Clair',
    aboutVersion:'Version', aboutDate:'Date de mise à jour', aboutApp:'Logiciel de caisse algérien complet',
    errRequired:'Ce champ est obligatoire', errInvalidQty:'Quantité invalide',
    errOutOfStock:'Stock insuffisant', errNoCustomer:'Client requis pour crédit',
    errLoginFailed:'Identifiant ou mot de passe incorrect', errScaleNotConnected:'Balance non connectée',
    confirmDelete:'Confirmer la suppression?', confirmLogout:'Se déconnecter?', confirmCloseDay:'Clôturer la journée?',
    dialogYes:'Oui', dialogNo:'Non', dialogOk:'OK',
    currencyLabel:'DA',
    repBackToSale:'Back to Sales', repPeriodWeek:'Weekly', repPeriodMonth:'Monthly', repPeriodYear:'Yearly',
    saveBtn:'💾 Save', labelDate:'Date format', labelCurrency:'Currency',
    labelLang:'App language', labelLangDesc:'Applied immediately to all pages',
    labelFont:'App font', labelFontSize:'Font size',
    labelBgMode:'Background mode', bgDark:'Dark', bgLight:'Light',
    labelAccentColor:'Icons & buttons color',
    labelSoundAdd:'Product add sound', labelSoundSell:'Sale complete sound', labelSoundBtn:'Button sounds',
    labelBarcode:'Enable barcode scanner', labelBarcodeDesc:'Adds products automatically',
    labelBarcodeAuto:'Auto-add by scanner',
    labelTouchKb:'Touch keyboard', labelTouchKbDesc:'Draggable side button',
    invAlerts:'Stock alerts', invTabAll:'All products', invTabFamilies:'Families',
    invTabImport:'Import / Export', invFormTitleAdd:'Add new product',
    invColUnit:'Unit', invColExpiry:'Expiry', invColAlert:'Alert',
    invLabelName:'Product name', invLabelSize:'Size / Format', invLabelExpiry:'Expiry date',
    invBtnClear:'Clear fields', invImportTitle:'Import products', invExportTitle:'Export products',
    invBtnExport:'Export all (CSV)', invBtnTemplate:'Download CSV template',
    invImportConfirm:'Confirm import', invImportAccept:'Accept update', invImportSkip:'Skip duplicates',
    supBtnAdd:'Add supplier', supSearch:'Search supplier...',
    supAddress:'Address', supActivity:'Activity type',
    userBtnAdd:'Add user', userColName:'User',
    userColRole:'Role', userColDate:'Creation date',
    userLabelName:'Username', userLabelPass:'Password',
    custDebtDate:'Debt date:',
    invAlerts:'Alertes stock', invTabAll:'Tous les produits', invTabFamilies:'Familles',
    invTabImport:'Import / Export', invFormTitleAdd:'Ajouter un produit',
    invColUnit:'Unité', invColExpiry:'Expiration', invColAlert:'Alerte',
    invLabelName:'Nom du produit', invLabelSize:'Taille / Format', invLabelExpiry:"Date d'expiration",
    invBtnClear:'Vider les champs', invImportTitle:'Importer des produits', invExportTitle:'Exporter les produits',
    invBtnExport:'Exporter tous (CSV)', invBtnTemplate:'Télécharger modèle CSV',
    invImportConfirm:"Confirmer l'import", invImportAccept:'Accepter mise à jour', invImportSkip:'Ignorer les doublons',
    supBtnAdd:'Ajouter fournisseur', supSearch:'Rechercher fournisseur...',
    supAddress:'Adresse', supActivity:'Activité',
    userBtnAdd:'Ajouter utilisateur', userColName:'Utilisateur',
    userColRole:'Rôle', userColDate:'Date création',
    userLabelName:"Nom d'utilisateur", userLabelPass:'Mot de passe',
    custDebtDate:'Date dette:',
  },
  en: {
    navSale:'Sale', navInventory:'Inventory',
    navCustomers:'Customers', navReports:'Business',
    navUsers:'Users', navSuppliers:'Suppliers',
    navSettings:'Settings', navLogout:'Logout',
    navGroupSale:'Sales', navGroupManage:'Management', navGroupSystem:'System',
    titleSale:'Sale Interface', titleInventory:'Inventory Management',
    titleCustomers:'Customer Management', titleReports:'Business Analytics',
    titleUsers:'User Management', titleSuppliers:'Suppliers',
    titleSettings:'General Settings', titleAbout:'About',
    btnSave:'Save', btnCancel:'Cancel', btnClose:'Close', btnAdd:'Add',
    btnEdit:'Edit', btnDelete:'Delete', btnPrint:'Print', btnSearch:'Search',
    btnBack:'Back', btnConfirm:'Confirm', btnAll:'All', btnExport:'Export',
    btnImport:'Import', btnBackup:'Backup', btnRefresh:'Refresh',
    saleSearchPH:'Search product or scan barcode...',
    saleProduct:'Product', saleQty:'Qty', salePrice:'Price', saleTotal:'Total',
    saleDiscount:'Discount:', saleCustomer:'Customer:', salePaid:'Paid:',
    saleBtnCheckout:'Pay', saleBtnPartial:'Partial + Debt', saleBtnDebt:'Full Credit',
    saleEmpty:'Cart is empty', saleTotalLabel:'Total', saleItemsUnit:'item(s)',
    saleModalTitle:'Confirm Sale', saleBtnPrint:'Print Invoice',
    saleSelectCustomer:'— Select customer —',
    scaleWeight:'Weight:', scalePrice:'Price/kg:', scaleTotal:'Total:',
    scaleBtnAdd:'Add to cart', scaleBtnLabel:'Print label', scaleBtnConnect:'Connect scale',
    scaleConnected:'Connected', scaleDisconnected:'Disconnected', scaleManualInput:'Enter weight manually',
    custAdd:'Add Customer', custSearch:'Search by name or phone...',
    custFilterAll:'All', custFilterDebt:'Debtors', custFilterClear:'Cleared',
    custName:'Name', custPhone:'Phone', custEmail:'Email',
    custBtnDebts:'Debts', custBtnPartial:'Partial payment', custBtnPayAll:'Pay all',
    custTotalCustomers:'Total Customers', custTotalDebt:'Total Debts',
    custNoDebt:'No debts', custDebtLeft:'Remaining debt', custDaysSince:'d',
    invAddProduct:'Add Product', invAddFamily:'Add Family',
    invSearch:'Search product...',
    invColProduct:'Product', invColFamily:'Family', invColBuyPrice:'Buy Price',
    invColPrice:'Sell Price', invColQty:'Stock', invColBarcode:'Barcode', invColActions:'Actions',
    invLowStock:'Low stock', invOutStock:'Out of stock',
    repDashboard:'Dashboard', repDaily:'Daily Revenue',
    repDebts:'Debts', repFamilies:'Families', repProducts:'Products',
    repScale:'Scale', repAccounting:'Accounting',
    repRevenue:'Revenue', repCost:'Cost of goods',
    repExpenses:'Expenses', repGrossProfit:'Gross profit',
    repNetProfit:'Net profit', repTotalDebts:'Total debts',
    repToday:'Today', repWeek:'Weekly', repMonth:'Monthly', repYear:'Yearly',
    repCloseDay:'Close Day', repPrintAll:'Print All',
    settGeneral:'General settings', settDisplay:'Display', settPrint:'Printing',
    settNotif:'Notifications', settScale:'Scale', settSync:'Sync',
    settEmail:'Email', settSMS:'SMS', settCard:'Card payment', settAbout:'About',
    settFont:'Font', settLanguage:'Language', settTheme:'Color', settBgMode:'Display mode',
    fontCairo:'Cairo', fontTajawal:'Tajawal', fontIBM:'IBM Plex Arabic',
    fontNoto:'Noto Sans Arabic', fontAlmarai:'Almarai', fontAmiri:'Amiri',
    modeDark:'Dark', modeLight:'Light',
    aboutVersion:'Version', aboutDate:'Release date', aboutApp:'Complete Algerian Point of Sale software',
    errRequired:'This field is required', errInvalidQty:'Invalid quantity',
    errOutOfStock:'Insufficient stock', errNoCustomer:'Customer required for credit sale',
    errLoginFailed:'Invalid username or password', errScaleNotConnected:'Scale not connected',
    confirmDelete:'Confirm deletion?', confirmLogout:'Logout?', confirmCloseDay:'Close the day?',
    dialogYes:'Yes', dialogNo:'No', dialogOk:'OK',
    currencyLabel:'DA',
    // Inventory extra keys
    invAlerts:'Stock alerts', invTabAll:'All products', invTabFamilies:'Families',
    invTabImport:'Import / Export', invFormTitleAdd:'Add new product',
    invColUnit:'Unit', invColExpiry:'Expiry', invColAlert:'Alert',
    invLabelName:'Product name', invLabelSize:'Size / Format', invLabelExpiry:'Expiry date',
    invBtnClear:'Clear fields', invImportTitle:'Import products', invExportTitle:'Export products',
    invBtnExport:'Export all (CSV)', invBtnTemplate:'Download CSV template',
    invImportConfirm:'Confirm import', invImportAccept:'Accept update', invImportSkip:'Skip duplicates',
    // Suppliers
    supBtnAdd:'Add supplier', supSearch:'Search supplier...',
    supAddress:'Address', supActivity:'Activity type',
    // Users
    userBtnAdd:'Add user', userColName:'User',
    userColRole:'Role', userColDate:'Creation date',
    userLabelName:'Username', userLabelPass:'Password',
    // Customers
    custDebtDate:'Debt date:',
    // Reports
    repBackToSale:'Back to Sales', repPeriodWeek:'Weekly', repPeriodMonth:'Monthly', repPeriodYear:'Yearly',
    // Settings labels
    saveBtn:'💾 Save', labelDate:'Date format', labelCurrency:'Currency',
    labelLang:'App language', labelLangDesc:'Applied immediately to all pages',
    labelFont:'App font', labelFontSize:'Font size',
    labelBgMode:'Background mode', bgDark:'Dark', bgLight:'Light',
    labelAccentColor:'Icons & buttons color',
    labelSoundAdd:'Product add sound', labelSoundSell:'Sale complete sound', labelSoundBtn:'Button sounds',
    labelBarcode:'Enable barcode scanner', labelBarcodeDesc:'Adds products automatically',
    labelBarcodeAuto:'Auto-add by scanner',
    labelTouchKb:'Touch keyboard', labelTouchKbDesc:'Draggable side button',
  }
};

// دالة ترجمة سريعة
function t(key) {
  const lang = localStorage.getItem('posdz_lang') || 'ar';
  return APP_I18N[lang]?.[key] ?? APP_I18N.ar[key] ?? key;
}

function applyPageTranslation(lang) {
  const dict = APP_I18N[lang] || APP_I18N.ar;
  const dir  = lang === 'ar' ? 'rtl' : 'ltr';

  // login.html ثابتة — لا تتغير باللغة أبداً
  const isLogin = window.location.pathname.includes('login');
  if (!isLogin) {
    document.documentElement.lang = lang;
    document.documentElement.dir  = dir;
  }
  localStorage.setItem('posdz_lang', lang);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = dict[el.dataset.i18n];
    if (v === undefined) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = v;
    else el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el  => { const v=dict[el.dataset.i18nPh];  if(v!==undefined)el.placeholder=v; });
  document.querySelectorAll('[data-i18n-title]').forEach(el=> { const v=dict[el.dataset.i18nTitle]; if(v!==undefined)el.title=v; });
  document.querySelectorAll('[data-nav]').forEach(el       => { const v=dict[el.dataset.nav];     if(v!==undefined)el.textContent=v; });

  // اتجاه الـ Sidebar حسب اللغة — فقط نغيّر الـ CSS class وليس style مباشرة
  // (style مباشرة تُفتح الـ sidebar — الـ CSS يتولى الموضع الصحيح)
  const sb = document.getElementById('sidebar');
  if (sb) {
    // لا نلمس style.right/left — الـ CSS يتكفل بذلك عبر [lang] selector
    // فقط نتأكد أن الـ sidebar مغلق
    if (sb.classList.contains('open')) {
      // لا نُغلقه هنا — إذا كان المستخدم فتحه يدوياً نبقيه مفتوحاً
    }
  }
  window._i18n = dict;

  // تحديث رمز العملة عند تغيير اللغة
  // currency variable موجود في كل صفحة تحمل البيانات
  const curLabel = dict.currencyLabel;
  if (curLabel) {
    _currency = curLabel; // _currency في app.js
    // تحديث متغير currency المحلي في الصفحة (sale, inventory, customers...)
    try { if (typeof currency !== 'undefined') currency = curLabel; } catch(e){}
  }
}

// ══════════════════════════════════════════════════════════════
//  Theme
// ══════════════════════════════════════════════════════════════
async function applyTheme() {
  const [accent, bg, font, lang, sizeStr] = await Promise.all([
    getSetting('themeColor'), getSetting('bgMode'), getSetting('appFont'),
    getSetting('language'),   getSetting('fontSize')
  ]);
  const root  = document.documentElement;
  const _a    = accent || 'blue_purple';
  const _bg   = bg     || 'dark';
  const _font = font   || 'cairo';
  const _lang = lang   || localStorage.getItem('posdz_lang') || 'ar';
  const _size = parseInt(sizeStr) || 15;

  root.setAttribute('data-accent', _a);
  root.setAttribute('data-bg',     _bg);
  root.setAttribute('data-font',   _font);
  root.setAttribute('data-theme',  _a === 'blue_purple' ? '' : _a);
  root.style.fontSize = _size + 'px';

  if (_bg === 'light') { document.body.style.background='#F0F0F5'; document.body.style.color='#0F0F0F'; }
  else                 { document.body.style.background=''; document.body.style.color=''; }

  applyPageTranslation(_lang);
  startClock(); // إعادة تشغيل الساعة بالـ locale الصحيح
}

// ══════════════════════════════════════════════════════════════
//  Custom Dialogs
// ══════════════════════════════════════════════════════════════
function customConfirm(message, onOk, onCancel) {
  document.getElementById('_posdzConfirm')?.remove();
  const lang     = localStorage.getItem('posdz_lang') || 'ar';
  const yesLabel = APP_I18N[lang]?.dialogYes || 'نعم';
  const noLabel  = APP_I18N[lang]?.dialogNo  || 'لا';
  const ov = document.createElement('div');
  ov.id = '_posdzConfirm';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;';
  ov.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--primary);border-radius:16px;padding:28px 24px;max-width:340px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;">
      <div style="font-size:1.8rem;margin-bottom:10px;"><i class="fa-solid fa-circle-question" style="color:var(--warning);"></i></div>
      <div style="color:var(--text-primary);font-size:0.97rem;font-weight:600;margin-bottom:22px;line-height:1.5;">${message}</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="_cOk" style="flex:1;padding:11px 18px;border-radius:10px;border:none;cursor:pointer;background:var(--primary);color:#fff;font-family:var(--font-main);font-size:0.95rem;font-weight:700;">${yesLabel}</button>
        <button id="_cNo" style="flex:1;padding:11px 18px;border-radius:10px;cursor:pointer;background:transparent;color:var(--text-secondary);font-family:var(--font-main);font-size:0.95rem;font-weight:700;border:1px solid var(--border);">${noLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#_cOk').onclick = () => { close(); onOk?.(); };
  ov.querySelector('#_cNo').onclick = () => { close(); onCancel?.(); };
  ov.addEventListener('click', e => { if(e.target===ov){close();onCancel?.();} });
}

function customConfirmAsync(message) {
  return new Promise(r => customConfirm(message, ()=>r(true), ()=>r(false)));
}

function customAlert(message, icon = 'info') {
  document.getElementById('_posdzAlert')?.remove();
  const lang    = localStorage.getItem('posdz_lang') || 'ar';
  const okLabel = APP_I18N[lang]?.dialogOk || 'حسناً';
  const icons   = { info:'fa-circle-info', success:'fa-circle-check', warning:'fa-triangle-exclamation', error:'fa-circle-xmark' };
  const colors  = { info:'var(--primary)', success:'var(--success)', warning:'var(--warning)', error:'var(--danger)' };
  const ov = document.createElement('div');
  ov.id = '_posdzAlert';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;';
  ov.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:28px 24px;max-width:320px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;"><i class="fa-solid ${icons[icon]||icons.info}" style="color:${colors[icon]||colors.info};"></i></div>
      <div style="color:var(--text-primary);font-size:0.95rem;margin-bottom:20px;line-height:1.5;">${message}</div>
      <button onclick="document.getElementById('_posdzAlert').remove()" style="padding:10px 28px;border-radius:10px;border:none;background:var(--primary);color:#fff;font-family:var(--font-main);font-size:0.9rem;font-weight:700;cursor:pointer;">${okLabel}</button>
    </div>`;
  document.body.appendChild(ov);
}

function _inputDialog(label, defaultVal = '') {
  const lang         = localStorage.getItem('posdz_lang') || 'ar';
  const confirmLabel = APP_I18N[lang]?.btnConfirm || 'تأكيد';
  const cancelLabel  = APP_I18N[lang]?.btnCancel  || 'إلغاء';
  return new Promise(resolve => {
    document.getElementById('_posdzInput')?.remove();
    const ov = document.createElement('div');
    ov.id = '_posdzInput';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--primary);border-radius:16px;padding:24px 22px;max-width:320px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
        <div style="color:var(--text-primary);font-size:0.95rem;font-weight:600;margin-bottom:14px;">${label}</div>
        <input id="_piField" type="text" value="${defaultVal}" style="width:100%;background:var(--bg-input);border:1px solid var(--primary);border-radius:8px;color:var(--text-primary);padding:10px 12px;font-family:var(--font-main);font-size:1rem;outline:none;box-sizing:border-box;margin-bottom:14px;"/>
        <div style="display:flex;gap:10px;">
          <button id="_piOk"     style="flex:2;padding:10px;border-radius:10px;border:none;cursor:pointer;background:var(--primary);color:#fff;font-family:var(--font-main);font-size:0.92rem;font-weight:700;">${confirmLabel}</button>
          <button id="_piCancel" style="flex:1;padding:10px;border-radius:10px;cursor:pointer;background:transparent;color:var(--text-secondary);font-family:var(--font-main);font-size:0.92rem;border:1px solid var(--border);">${cancelLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const inp    = ov.querySelector('#_piField');
    const submit = () => { ov.remove(); resolve(inp.value.trim()||null); };
    const cancel = () => { ov.remove(); resolve(null); };
    ov.querySelector('#_piOk').onclick     = submit;
    ov.querySelector('#_piCancel').onclick = cancel;
    inp.addEventListener('keydown', e => { if(e.key==='Enter')submit(); if(e.key==='Escape')cancel(); });
    inp.focus(); inp.select();
  });
}

// ══════════════════════════════════════════════════════════════
//  نظام الإشعارات الداخلية
// ══════════════════════════════════════════════════════════════
const NOTIF_KEY = 'posdz_notifications';

function _loadNotifs()   { try{return JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]');}catch{return[];} }
function _saveNotifs(l)  { try{localStorage.setItem(NOTIF_KEY,JSON.stringify(l));}catch{} }

function _pushNotif(id, icon, title, body, type='warning') {
  const list=_loadNotifs(), now=Date.now(), ex=list.find(n=>n.id===id);
  if(ex&&(now-ex.ts)<86400000) return;
  const fresh=list.filter(n=>n.id!==id);
  fresh.unshift({id,icon,title,body,type,ts:now,read:false});
  _saveNotifs(fresh.slice(0,50));
  _renderBell();
}
function _markRead(id)  { _saveNotifs(_loadNotifs().map(n=>n.id===id?{...n,read:true}:n)); _renderBell(); _renderNotifPanel(); }
function _markAllRead() { _saveNotifs(_loadNotifs().map(n=>({...n,read:true}))); _renderBell(); _renderNotifPanel(); }

function _injectBell() {
  const header=document.querySelector('.app-header');
  if(!header) return;
  // الجرس موجود في HTML مباشرة — فقط نربط الـ event ونُنشئ الـ panel
  let bell=document.getElementById('_notifBell');
  if(!bell){
    // fallback: إنشاء الجرس إن لم يكن في HTML
    bell=document.createElement('button');
    bell.id='_notifBell'; bell.className='notif-bell'; bell.title='الإشعارات';
    bell.innerHTML='<i class="fa-solid fa-bell"></i><span id="_notifBadge" class="notif-badge" style="display:none;"></span>';
    const menuBtn=header.querySelector('.menu-btn');
    if(menuBtn) menuBtn.insertAdjacentElement('afterend',bell); else header.appendChild(bell);
  }
  bell.onclick=(e)=>{e.stopPropagation();_toggleNotifPanel();};

  const panel=document.createElement('div');
  panel.id='_notifPanel';
  panel.style.cssText='display:none;position:fixed;top:68px;right:16px;z-index:9000;width:340px;max-height:480px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--primary);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.55);font-family:var(--font-main);';
  document.body.appendChild(panel);

  document.addEventListener('click',(e)=>{ if(!panel.contains(e.target)&&!bell.contains(e.target))panel.style.display='none'; });
  _renderBell();
}

function _renderBell() {
  const badge=document.getElementById('_notifBadge'); if(!badge)return;
  const n=_loadNotifs().filter(x=>!x.read).length;
  if(n>0){badge.style.display='flex';badge.textContent=n>99?'99+':String(n);}
  else badge.style.display='none';
}

function _toggleNotifPanel() {
  const p=document.getElementById('_notifPanel'); if(!p)return;
  if(!p.style.display||p.style.display==='none'){_renderNotifPanel();p.style.display='block';}
  else p.style.display='none';
}

function _renderNotifPanel() {
  const p=document.getElementById('_notifPanel'); if(!p)return;
  const list=_loadNotifs(), unread=list.filter(n=>!n.read).length;
  const tc={warning:'#f59e0b',danger:'#ef4444',success:'#10b981',info:'#3b82f6'};

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg-dark);border-radius:14px 14px 0 0;position:sticky;top:0;z-index:1;">
    <span style="font-weight:800;font-size:1rem;color:var(--primary-light);">
      <i class="fa-solid fa-bell"></i> الإشعارات
      ${unread>0?`<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 8px;font-size:0.72rem;margin-right:6px;">${unread}</span>`:''}
    </span>
    ${unread>0?`<button onclick="_markAllRead()" style="background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:4px 10px;border-radius:8px;cursor:pointer;font-family:var(--font-main);font-size:0.75rem;">قراءة الكل ✓</button>`:'<span style="color:var(--success);font-size:0.82rem;">✅ لا جديد</span>'}
  </div>`;

  if(!list.length) {
    html+=`<div style="padding:32px;text-align:center;color:var(--text-secondary);font-size:0.9rem;"><div style="font-size:2rem;margin-bottom:10px;"><i class="fa-solid fa-bell-slash"></i></div>لا توجد إشعارات</div>`;
  } else {
    const sorted=[...list.filter(n=>!n.read),...list.filter(n=>n.read)];
    html+=sorted.map(n=>{
      const color=tc[n.type]||'#6b7280';
      const ds=new Date(n.ts).toLocaleDateString(_getLocale())+' '+new Date(n.ts).toLocaleTimeString(_getLocale(),{hour:'2-digit',minute:'2-digit'});
      return`<div onclick="_markRead('${n.id}')" style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${n.read?'transparent':'rgba(124,58,237,0.06)'};${n.read?'opacity:0.6;':''}" onmouseenter="this.style.background='var(--bg-medium)'" onmouseleave="this.style.background='${n.read?'transparent':'rgba(124,58,237,0.06)'}'">
        <div style="width:36px;height:36px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">${n.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:${n.read?'600':'800'};font-size:0.88rem;color:var(--text-primary);margin-bottom:3px;">${n.title}${!n.read?'<span style="background:#ef4444;border-radius:50%;width:8px;height:8px;display:inline-block;margin-right:4px;"></span>':''}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;">${n.body}</div>
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:4px;opacity:0.7;">${ds}</div>
        </div>
      </div>`;
    }).join('');
    html+=`<div style="padding:10px 16px;text-align:center;"><button onclick="localStorage.removeItem('${NOTIF_KEY}');_renderBell();_renderNotifPanel();" style="background:transparent;border:1px solid var(--danger);color:var(--danger);padding:5px 14px;border-radius:8px;cursor:pointer;font-family:var(--font-main);font-size:0.78rem;"><i class="fa-solid fa-trash"></i> مسح جميع الإشعارات</button></div>`;
  }
  p.innerHTML=html;
}

// ── فحوصات الإشعارات الدورية ──────────────────────────────────
async function initNotifications() {
  if(await getSetting('notifEnabled')==='0') return;
  _injectBell();
  if(await getSetting('notifInApp')==='0') return;
  try {
    const [products, debts, customers] = await Promise.all([dbGetAll('products'), dbGetAll('debts'), dbGetAll('customers')]);
    const now = new Date();

    // نفاذ المخزون
    if(await getSetting('notifLowStock')!=='0') {
      products.filter(p=>p.quantity>0&&p.quantity<=(p.minStock||5)).forEach(p=>
        _pushNotif(`low_${p.id}`,'📉','مخزون منخفض',`${p.name} — الكمية: ${p.quantity}`,'warning')
      );
    }
    // انتهاء الكمية
    if(await getSetting('notifOutStock')!=='0') {
      products.filter(p=>p.quantity===0).forEach(p=>
        _pushNotif(`out_${p.id}`,'🚫','نفاذ الكمية',`${p.name} — نفدت الكمية`,'danger')
      );
    }
    // ديون > 28 يوم
    if(await getSetting('notifDebt30')!=='0') {
      const grouped={};
      debts.filter(d=>!d.isPaid).forEach(d=>{
        const days=Math.floor((now-new Date(d.date))/86400000);
        if(days>=28){if(!grouped[d.customerId])grouped[d.customerId]={days:0,amount:0};grouped[d.customerId].days=Math.max(grouped[d.customerId].days,days);grouped[d.customerId].amount+=parseFloat(d.amount||0);}
      });
      for(const[cid,info] of Object.entries(grouped)){
        const c=customers.find(x=>x.id===parseInt(cid));
        _pushNotif(`debt_${cid}`,info.days>=30?'💳':'⚠️',info.days>=30?'دين متجاوز 30 يوم':'دين يقترب من 30 يوم',`${c?.name||'—'} — ${info.amount.toFixed(0)} ${_currency} — منذ ${info.days} يوم`,info.days>=30?'danger':'warning');
      }
    }
    // انتهاء الصلاحية
    if(await getSetting('notifExpiry')!=='0') {
      products.filter(p=>p.expiryDate).forEach(p=>{
        const dl=(new Date(p.expiryDate)-now)/86400000;
        if(dl<=7&&dl>=0) _pushNotif(`exp_${p.id}`,'⏰','انتهاء الصلاحية قريب',`${p.name} — يتبقى ${Math.ceil(dl)} يوم`,'warning');
        else if(dl<0)    _pushNotif(`exp_${p.id}`,'❌','منتج منتهي الصلاحية',`${p.name} — انتهت الصلاحية`,'danger');
      });
    }
    _renderBell();
    setTimeout(()=>initNotifications(), 24*60*60*1000);
  } catch(e) { /* silent */ }
}

// إشعارات فورية
function notifLogin(username) {
  getSetting('notifEnabled').then(en=>{
    if(en==='0')return;
    getSetting('notifLogin').then(v=>{
      if(v==='0')return;
      const t=new Date().toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'});
      _pushNotif(`login_${username}_${Date.now()}`,'👤','دخول مستخدم',`${username} — دخل في ${t}`,'info');
    });
  });
}
function notifPasswordChange(username) {
  getSetting('notifEnabled').then(en=>{
    if(en==='0')return;
    getSetting('notifPwdChange').then(v=>{
      if(v==='0')return;
      _pushNotif(`pwd_${username}_${Date.now()}`,'🔑','تغيير كلمة المرور',`تم تغيير كلمة مرور: ${username}`,'warning');
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  Init الرئيسي
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  Auto Backup — يحفظ مرة يومياً عند تغيير التاريخ
// ══════════════════════════════════════════════════════════════
async function _scheduleAutoBackup() {
  if (await getSetting('autoBackup') !== '1') return;
  const lastKey = 'posdz_last_autobackup';
  const lastDate = localStorage.getItem(lastKey) || '';
  const today = todayStr();
  if (lastDate !== today) {
    // انتظر 5 ثوان لضمان تحميل كل شيء
    setTimeout(async () => {
      try {
        if (await getSetting('autoBackup') !== '1') return;
        const stores=['users','products','families','customers','suppliers','sales','saleItems','debts','debtPayments','expenses','purchases','settings'];
        const bk={version:APP_VERSION.number,timestamp:new Date().toISOString(),auto:true};
        for(const s of stores) bk[s]=await dbGetAll(s);
        const json = JSON.stringify(bk);
        // حفظ في localStorage (آخر نسخة فقط لتجنب امتلاء الذاكرة)
        try { localStorage.setItem('posdz_autobackup_data', json); } catch(e) {}
        localStorage.setItem(lastKey, today);
        _pushNotif('autobackup_'+today,'💾','نسخة احتياطية تلقائية',`تم حفظ النسخة الاحتياطية ليوم ${today}`,'success');
      } catch(e) {}
    }, 5000);
  }
  // فحص كل ساعة
  setTimeout(_scheduleAutoBackup, 60 * 60 * 1000);
}

async function initApp() {
  _initSessionTimeout(); // تفعيل إشعار انتهاء الجلسة
  await openDB();
  await applyTheme();
  await loadCurrency();
  await loadHeaderStoreName();
  startClock();
  initSidebar();
  _ensureSidebarClosed();
  initVirtualKeyboard();
  initButtonSounds();
  await SYNC.init();
  setTimeout(() => initNotifications(), 1500);
  _scheduleAutoBackup();
}
