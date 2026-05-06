// ===== إعدادات البوت والشات =====
const BOT_TOKEN = "8770754568:AAExYFyI88GA8J3adDv1s6YL6ZVYtabxkb8"; // للاختبار المحلي فقط
const PRIVATE_CHAT_ID = 8223130191;
const CHANNEL_USERNAME = "@AaNnAn2"; // اختياري

// لو عايز تستخدم دالة Serverless بدل الإرسال المباشر ضع true
const USE_SERVERLESS = true;
const FRONTEND_SEND_ENDPOINT = "/.netlify/functions/sendMessage"; // عدّل لو استخدمت Vercel أو مسار آخر

// ===== إعدادات API =====
const COIN_ID = "the-open-network";
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_ID}&vs_currencies=usd`;
const USD_EGP_URL = "https://api.exchangerate.host/latest?base=USD&symbols=EGP";

// ===== عناصر DOM =====
const cardsEl = document.getElementById("cards");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");
const sendBtn = document.getElementById("send-btn");
const autoSendCheckbox = document.getElementById("auto-send");

// ===== حالة التطبيق =====
let lastFetched = { tonUSD: null, tonEGP: null };
let selectedPriceUSD = null; // السعر اللي اختاره المستخدم
let autoSendIntervalId = null;

// ===== عرض البطاقة =====
function renderTonCard(usd, egp) {
  const usdText = usd !== null ? Number(usd).toLocaleString(undefined,{maximumFractionDigits:6}) + " $" : "—";
  const egpText = egp !== null ? Number(egp).toLocaleString(undefined,{maximumFractionDigits:2}) + " ج.م" : "—";

  cardsEl.innerHTML = `
    <div class="card">
      <h2>Toncoin (TON)</h2>
      <div id="ton-usd" class="price-usd">${usdText}</div>
      <div class="price-egp">${egpText}</div>
    </div>
  `;

  const usdEl = document.getElementById("ton-usd");

  // لو في اختيار سابق نعرضه كـ selected
  if (selectedPriceUSD !== null) {
    usdEl.classList.add("selected");
    usdEl.innerText = Number(selectedPriceUSD).toLocaleString(undefined,{maximumFractionDigits:6}) + " $";
  }

  // حدث النقر للاختيار/إلغاء الاختيار
  usdEl.addEventListener("click", () => {
    if (!usdEl.classList.contains("selected")) {
      if (lastFetched.tonUSD !== null) {
        selectedPriceUSD = lastFetched.tonUSD;
        usdEl.classList.add("selected");
        usdEl.innerText = Number(selectedPriceUSD).toLocaleString(undefined,{maximumFractionDigits:6}) + " $";
        statusEl.innerText = "تم اختيار سعر التون: " + selectedPriceUSD + " $";
      } else {
        statusEl.innerText = "لا يوجد سعر حالي للاختيار";
      }
    } else {
      selectedPriceUSD = null;
      usdEl.classList.remove("selected");
      if (lastFetched.tonUSD !== null) {
        usdEl.innerText = Number(lastFetched.tonUSD).toLocaleString(undefined,{maximumFractionDigits:6}) + " $";
      } else {
        usdEl.innerText = "—";
      }
      statusEl.innerText = "تم إلغاء اختيار السعر";
    }
  });
}

// ===== جلب السعر =====
async function getTonPrice() {
  try {
    statusEl.innerText = "جاري جلب سعر TON...";
    const [coinResp, fxResp] = await Promise.all([fetch(COINGECKO_URL), fetch(USD_EGP_URL)]);
    if (!coinResp.ok) throw new Error("فشل جلب بيانات CoinGecko");
    if (!fxResp.ok) throw new Error("فشل جلب سعر الدولار");

    const coinData = await coinResp.json();
    const fxData = await fxResp.json();
    const usdToEgp = fxData?.rates?.EGP ?? null;

    const tonUSD = coinData[COIN_ID]?.usd ?? null;
    const tonEGP = (tonUSD !== null && usdToEgp !== null) ? (tonUSD * usdToEgp) : null;

    lastFetched.tonUSD = tonUSD;
    lastFetched.tonEGP = tonEGP;

    // لو المستخدم لم يختر سعرًا نعرض آخر قيمة، وإلا نحتفظ بعلامة الاختيار
    renderTonCard(tonUSD, tonEGP);

    statusEl.innerText = "تم التحديث " + new Date().toLocaleTimeString();
    return { tonUSD, tonEGP };
  } catch (err) {
    console.error("getTonPrice error:", err);
    renderTonCard(null, null);
    statusEl.innerText = "خطأ في جلب السعر — افتح Console للمزيد";
    return null;
  }
}

// ===== إرسال السعر للبوت (يستخدم السعر المختار إن وُجد) =====
async function sendTonToBotOnce() {
  try {
    const priceToSend = selectedPriceUSD !== null ? selectedPriceUSD : lastFetched.tonUSD;
    if (priceToSend === null) {
      console.warn("لا يوجد سعر لإرساله");
      return { ok: false, reason: "no_price" };
    }

    const messageText = `سعر التون الحالي: ${priceToSend} $`;

    if (USE_SERVERLESS) {
      // إرسال آمن عبر دالة Serverless
      const resp = await fetch(FRONTEND_SEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText, sendToChannel: false })
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) {
        console.warn("Serverless send failed:", resp.status, json);
        return { ok: false, reason: "serverless_failed", details: json };
      }
      return { ok: true, via: "serverless" };
    } else {
      // إرسال مباشر من المتصفح
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: PRIVATE_CHAT_ID, text: messageText })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        console.warn("Direct send failed:", r.status, j);
        return { ok: false, reason: "direct_failed", details: j };
      }
      return { ok: true, via: "direct" };
    }
  } catch (err) {
    console.error("sendTonToBotOnce error:", err);
    return { ok: false, reason: "exception", details: err.message };
  }
}

// ===== تحكم الإرسال التلقائي =====
async function autoSendTick() {
  // نجلب السعر أولًا (نحدّث lastFetched)
  await getTonPrice();
  // ثم نحاول الإرسال
  const res = await sendTonToBotOnce();
  if (res.ok) {
    statusEl.innerText = `✅ تم إرسال السعر تلقائيًا (${res.via}) — ${new Date().toLocaleTimeString()}`;
  } else {
    // عرض سبب فشل الإرسال بشكل مختصر
    if (res.reason === "no_price") statusEl.innerText = "لا يوجد سعر لإرساله تلقائيًا";
    else statusEl.innerText = `فشل الإرسال التلقائي — ${res.reason}`;
    console.warn("autoSendTick result:", res);
  }
}

function startAutoSend(intervalMs = 60_000) {
  if (autoSendIntervalId) clearInterval(autoSendIntervalId);
  // نفّذ فورًا ثم كل دقيقة
  autoSendTick();
  autoSendIntervalId = setInterval(autoSendTick, intervalMs);
  statusEl.innerText = "التحديث والإرسال التلقائي مفعل كل دقيقة";
}

function stopAutoSend() {
  if (autoSendIntervalId) clearInterval(autoSendIntervalId);
  autoSendIntervalId = null;
  statusEl.innerText = "التحديث التلقائي متوقف";
}

// ===== أحداث الأزرار والـ checkbox =====
refreshBtn.addEventListener("click", getTonPrice);
sendBtn.addEventListener("click", async () => {
  statusEl.innerText = "جاري إرسال السعر المختار/الأخير...";
  const r = await sendTonToBotOnce();
  if (r.ok) statusEl.innerText = "✅ تم إرسال السعر يدوياً";
  else statusEl.innerText = "فشل الإرسال اليدوي — افتح Console للمزيد";
});

if (autoSendCheckbox) {
  autoSendCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) startAutoSend(60_000);
    else stopAutoSend();
  });
}

// ===== تشغيل أولي =====
getTonPrice();
