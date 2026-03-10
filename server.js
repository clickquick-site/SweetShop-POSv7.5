// ============================================================
//  POS DZ — server.js  v6.0.0
//  سيرفر Node.js: البريد Gmail + المزامنة LAN + SMS
//  التشغيل: node server.js
//  المتطلبات: npm install express nodemailer cors
// ============================================================

'use strict';

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config file (يُحفظ بجانب server.js) ─────────────────────
const CONFIG_FILE = path.join(__dirname, 'server_config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch(e) {}
  return {
    emailSender:      '',
    emailAppPassword: '',
    emailRecipient:   '',
    smsSid:           '',
    smsToken:         '',
    smsFrom:          '',
    smsEnabled:       false,
    syncStore:        {},      // بيانات المزامنة المشتركة
  };
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8'); } catch(e) {}
}

let config = loadConfig();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ── Logging ─────────────────────────────────────────────────
function log(type, msg) {
  const ts = new Date().toISOString().replace('T',' ').substring(0,19);
  console.log(`[${ts}] [${type}] ${msg}`);
}

// ════════════════════════════════════════════════════════════
//  API: Ping (فحص الاتصال)
// ════════════════════════════════════════════════════════════
app.get('/api/ping', (req, res) => {
  res.json({ status:'ok', version:'6.0.0', time: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════
//  API: Config (حفظ/قراءة الإعدادات من الواجهة)
// ════════════════════════════════════════════════════════════
app.get('/api/config', (req, res) => {
  // لا نُرسل كلمات المرور للواجهة — فقط حالة التفعيل
  res.json({
    emailConfigured: !!(config.emailSender && config.emailAppPassword),
    smsConfigured:   !!(config.smsSid && config.smsToken),
    smsEnabled:      config.smsEnabled || false,
  });
});

app.post('/api/config', (req, res) => {
  const { emailSender, emailAppPassword, emailRecipient, smsSid, smsToken, smsFrom, smsEnabled } = req.body;
  if (emailSender      !== undefined) config.emailSender      = emailSender;
  if (emailAppPassword !== undefined) config.emailAppPassword  = emailAppPassword;
  if (emailRecipient   !== undefined) config.emailRecipient    = emailRecipient;
  if (smsSid           !== undefined) config.smsSid            = smsSid;
  if (smsToken         !== undefined) config.smsToken          = smsToken;
  if (smsFrom          !== undefined) config.smsFrom           = smsFrom;
  if (smsEnabled       !== undefined) config.smsEnabled        = smsEnabled;
  saveConfig(config);
  log('CONFIG', 'تم حفظ الإعدادات');
  res.json({ status:'ok' });
});

// ════════════════════════════════════════════════════════════
//  API: Email — Gmail عبر Nodemailer
// ════════════════════════════════════════════════════════════
app.post('/api/email', async (req, res) => {
  const { to, subject, body, html } = req.body;

  if (!config.emailSender || !config.emailAppPassword) {
    log('EMAIL', 'غير مُهيَّأ — أدخل البريد وكلمة التطبيق في الإعدادات');
    return res.status(503).json({ error: 'email_not_configured' });
  }
  if (!to || !subject) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.emailSender,
        pass: config.emailAppPassword,   // App Password من Google Account
      },
    });

    const info = await transporter.sendMail({
      from:    `"POS DZ" <${config.emailSender}>`,
      to,
      subject,
      text:    body  || '',
      html:    html  || body || '',
    });

    log('EMAIL', `إرسال ناجح → ${to} | ID: ${info.messageId}`);
    res.json({ status:'ok', messageId: info.messageId });

  } catch(e) {
    log('EMAIL', `خطأ: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  API: SMS — Twilio (⛔ معطّل — يُفعَّل بإضافة SID+Token)
// ════════════════════════════════════════════════════════════
app.post('/api/sms', async (req, res) => {
  if (!config.smsEnabled) {
    return res.status(503).json({ error: 'sms_disabled' });
  }
  if (!config.smsSid || !config.smsToken || !config.smsFrom) {
    return res.status(503).json({ error: 'sms_not_configured' });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    // Twilio REST API — بدون مكتبة خارجية
    const auth    = Buffer.from(`${config.smsSid}:${config.smsToken}`).toString('base64');
    const body    = new URLSearchParams({ To:to, From:config.smsFrom, Body:message }).toString();
    const https   = require('https');
    const options = {
      hostname: 'api.twilio.com',
      path:     `/2010-04-01/Accounts/${config.smsSid}/Messages.json`,
      method:   'POST',
      headers:  { 'Authorization':'Basic '+auth, 'Content-Type':'application/x-www-form-urlencoded', 'Content-Length':Buffer.byteLength(body) }
    };

    await new Promise((resolve, reject) => {
      const r = https.request(options, (res2) => {
        let data = '';
        res2.on('data', d => data += d);
        res2.on('end', () => {
          try { const j=JSON.parse(data); j.sid ? resolve(j) : reject(new Error(j.message||'SMS error')); }
          catch(e) { reject(e); }
        });
      });
      r.on('error', reject);
      r.write(body);
      r.end();
    });

    log('SMS', `إرسال ناجح → ${to}`);
    res.json({ status:'ok' });

  } catch(e) {
    log('SMS', `خطأ: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  API: مزامنة LAN
//  يستقبل التغييرات ويوزعها على الأجهزة الأخرى
// ════════════════════════════════════════════════════════════

// تخزين مؤقت في الذاكرة (يُحفظ في config للدوام)
if (!config.syncStore) config.syncStore = {};

// قائمة الأجهزة المتصلة (SSE)
const sseClients = new Set();

// استقبال البيانات من أي جهاز
app.post('/api/sync', (req, res) => {
  const { action, store, data } = req.body;
  if (!store || !action) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  // تحديث الـ store في الذاكرة
  if (!config.syncStore[store]) config.syncStore[store] = [];

  if (action === 'add' || action === 'update') {
    const idx = config.syncStore[store].findIndex(r => r.id === data?.id);
    if (idx >= 0) config.syncStore[store][idx] = data;
    else          config.syncStore[store].push(data);

  } else if (action === 'delete') {
    config.syncStore[store] = config.syncStore[store].filter(r => r.id !== data?.id);
  }

  // بث التغيير لكل الأجهزة المتصلة (SSE)
  const event = JSON.stringify({ action, store, data, ts: Date.now() });
  sseClients.forEach(client => {
    try { client.write(`data: ${event}\n\n`); } catch(e) { sseClients.delete(client); }
  });

  log('SYNC', `${action.toUpperCase()} → ${store} (${sseClients.size} أجهزة متصلة)`);
  res.json({ status:'ok' });
});

// سحب كل بيانات store
app.get('/api/data/:store', (req, res) => {
  const store = req.params.store;
  res.json(config.syncStore[store] || []);
});

// SSE — اشتراك الأجهزة لتلقي التحديثات فوراً
app.get('/api/subscribe', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  log('SSE', `جهاز جديد متصل — إجمالي: ${sseClients.size}`);

  // إرسال نبضة كل 30 ثانية لإبقاء الاتصال
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
  }, 30000);

  req.on('close', () => {
    sseClients.delete(res);
    clearInterval(heartbeat);
    log('SSE', `جهاز انقطع — إجمالي: ${sseClients.size}`);
  });
});

// حفظ دوري لـ syncStore (كل 60 ثانية)
setInterval(() => saveConfig(config), 60000);

// ════════════════════════════════════════════════════════════
//  API: إرسال تقرير يومي مجدوَل (يُستدعى من cron أو يدوياً)
// ════════════════════════════════════════════════════════════
app.post('/api/daily-report', async (req, res) => {
  const { report } = req.body;
  if (!report) return res.status(400).json({ error: 'missing_report' });

  const to  = config.emailRecipient || req.body.to;
  if (!to)  return res.status(400).json({ error: 'no_recipient' });

  try {
    const currency = report.currency || 'DA';
    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#7C3AED;border-bottom:2px solid #7C3AED;padding-bottom:8px;">
          📊 التقرير اليومي — ${report.date || new Date().toISOString().split('T')[0]}
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr style="background:#f5f3ff;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">💰 مداخيل البيع</td>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;color:#059669;">${parseFloat(report.revenue||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;">📦 تكلفة الشراء</td>
            <td style="padding:10px;border:1px solid #ddd;">${parseFloat(report.cost||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr style="background:#f5f3ff;">
            <td style="padding:10px;border:1px solid #ddd;">📊 الفائدة الإجمالية</td>
            <td style="padding:10px;border:1px solid #ddd;color:#059669;">${parseFloat(report.grossProfit||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;">🧾 المصاريف</td>
            <td style="padding:10px;border:1px solid #ddd;color:#dc2626;">${parseFloat(report.expenses||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">✅ صافي الربح</td>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;color:#059669;font-size:1.1em;">${parseFloat(report.netProfit||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;">💳 الديون المعلقة</td>
            <td style="padding:10px;border:1px solid #ddd;color:#dc2626;">${parseFloat(report.debts||0).toFixed(2)} ${currency}</td>
          </tr>
          <tr style="background:#f5f3ff;">
            <td style="padding:10px;border:1px solid #ddd;">🛒 عدد المبيعات</td>
            <td style="padding:10px;border:1px solid #ddd;">${report.salesCount||0}</td>
          </tr>
        </table>
        <p style="margin-top:20px;font-size:12px;color:#999;text-align:center;">POS DZ v6.0.0</p>
      </div>`;

    const transporter = nodemailer.createTransport({
      service:'gmail', auth:{ user:config.emailSender, pass:config.emailAppPassword }
    });
    await transporter.sendMail({
      from:`"POS DZ" <${config.emailSender}>`,
      to, subject:`📊 التقرير اليومي ${report.date||''} — POS DZ`, html
    });

    log('REPORT', `تقرير يومي أُرسل → ${to}`);
    res.json({ status:'ok' });
  } catch(e) {
    log('REPORT', `خطأ: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  API: الطباعة المباشرة على طابعة محددة
// ════════════════════════════════════════════════════════════

// قائمة الطابعات المتاحة في النظام
app.get('/api/printers', (req, res) => {
  try {
    const { execSync } = require('child_process');
    let printers = [];

    if (process.platform === 'win32') {
      // Windows: wmic printer
      const out = execSync(
        'wmic printer get Name,Default /format:csv',
        { encoding: 'utf8', timeout: 5000 }
      );
      printers = out.split('\n')
        .filter(l => l.trim() && !l.startsWith('Node'))
        .map(l => {
          const parts = l.split(',');
          return { name: (parts[2] || '').trim(), isDefault: (parts[1] || '').trim() === 'TRUE' };
        })
        .filter(p => p.name);
    } else if (process.platform === 'linux') {
      // Linux: lpstat
      const out = execSync('lpstat -a 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 });
      printers = out.split('\n')
        .filter(l => l.trim())
        .map(l => ({ name: l.split(' ')[0], isDefault: false }))
        .filter(p => p.name);
    } else if (process.platform === 'darwin') {
      // macOS: lpstat
      const out = execSync('lpstat -p 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 });
      printers = out.split('\n')
        .filter(l => l.startsWith('printer'))
        .map(l => ({ name: l.split(' ')[1], isDefault: false }))
        .filter(p => p.name);
    }

    res.json({ status: 'ok', printers });
  } catch(e) {
    log('PRINTER', `خطأ في جلب الطابعات: ${e.message}`);
    res.json({ status: 'ok', printers: [] });
  }
});

// طباعة HTML مباشرة على طابعة محددة
app.post('/api/print', async (req, res) => {
  try {
    const { html, printerName, labelSize } = req.body;
    if (!html) return res.status(400).json({ error: 'html مطلوب' });

    const { execSync, exec } = require('child_process');
    const os  = require('os');
    const tmpHtml = path.join(os.tmpdir(), `posdz_print_${Date.now()}.html`);
    const tmpPdf  = path.join(os.tmpdir(), `posdz_print_${Date.now()}.pdf`);

    fs.writeFileSync(tmpHtml, html, 'utf8');

    // محاولة الطباعة عبر Chromium/Chrome headless (الأفضل للـ HTML)
    let printed = false;

    if (process.platform === 'win32') {
      // Windows: نستخدم SumatraPDF أو mshta كـ fallback
      const chrome = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      ].find(p => { try { return fs.existsSync(p); } catch { return false; } });

      if (chrome) {
        const printerArg = printerName ? `--printer-name="${printerName}"` : '';
        const sizeArg    = labelSize   ? `--print-to-pdf-no-header` : '';
        execSync(
          `"${chrome}" --headless --disable-gpu --print-to-pdf="${tmpPdf}" "${tmpHtml}"`,
          { timeout: 15000 }
        );
        if (fs.existsSync(tmpPdf)) {
          const printerCmd = printerName
            ? `"${chrome}" --headless --disable-gpu --print-to="${printerName}" "${tmpHtml}"`
            : `"${chrome}" --headless --disable-gpu --print-to-pdf="${tmpPdf}" "${tmpHtml}"`;
          execSync(printerCmd, { timeout: 15000 });
          printed = true;
        }
      }

      if (!printed) {
        // Fallback: PowerShell + IE/Edge silent print
        const psCmd = printerName
          ? `powershell -Command "& { $ie = New-Object -ComObject InternetExplorer.Application; $ie.Navigate('file:///${tmpHtml.replace(/\\/g,'/')}'); Start-Sleep 2; $ie.ExecWB(6,2); Start-Sleep 3; $ie.Quit() }"`
          : `powershell -Command "Start-Process -FilePath '${tmpHtml}' -Verb Print -Wait"`;
        try { execSync(psCmd, { timeout: 20000 }); printed = true; } catch(ex) {}
      }
    } else {
      // Linux/macOS: lpr
      const printerArg = printerName ? `-P "${printerName}"` : '';
      try {
        execSync(`lpr ${printerArg} "${tmpHtml}"`, { timeout: 10000 });
        printed = true;
      } catch(ex) {}
    }

    // تنظيف الملفات المؤقتة
    setTimeout(() => {
      try { if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch {}
      try { if (fs.existsSync(tmpPdf))  fs.unlinkSync(tmpPdf);  } catch {}
    }, 30000);

    if (printed) {
      log('PRINTER', `✅ طُبع على: ${printerName || 'الافتراضية'}`);
      res.json({ status: 'ok', printer: printerName || 'default' });
    } else {
      res.status(500).json({ error: 'فشل الطباعة — تأكد من تثبيت Chrome' });
    }
  } catch(e) {
    log('PRINTER', `خطأ: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  تشغيل السيرفر
// ════════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  log('SERVER', `✅ POS DZ Server يعمل على المنفذ ${PORT}`);
  log('SERVER', `🌐 الوصول المحلي: http://localhost:${PORT}`);
  log('SERVER', `📡 الشبكة المحلية: http://<IP-الجهاز>:${PORT}`);
  log('SERVER', `📧 البريد: ${config.emailSender ? '✅ مُهيَّأ' : '⚠️ يحتاج إعداد'}`);
  log('SERVER', `📱 SMS:    ${config.smsEnabled   ? '✅ مُفعَّل' : '⛔ معطّل'}`);
});
