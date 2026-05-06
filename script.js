// إعدادات البوت والشات
const BOT_TOKEN = "8770754568:AAExYFyI88GA8J3adDv1s6YL6ZVYtabxkb8";
const PRIVATE_CHAT_ID = 8223130191;
const CHANNEL_USERNAME = "@AaNnAn2"; // لو عايز تبعت للقناة باليوزر

// إعدادات API
const COIN_ID = "the-open-network";
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_ID}&vs_currencies=usd`;
const USD_EGP_URL = "https://api.exchangerate.host/latest?base=USD&symbols=EGP";

// عناصر DOM
const cardsEl = document.getElementById("cards");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");
const sendBtn = document.getElementById("send-btn");
const autoSendCheckbox = document.getElementById("auto-send");

// حالة التخزين
let lastFetched = { tonUSD: null, tonEGP: null };
let selectedPriceUSD = null; // السعر اللي اختاره المستخدم (قيمة ثابتة عند الضغط)
let autoSendIntervalId = null;

// عرض بطاقة TON مع عنصر قابل للنقر
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

  // حدث النقر: يختار السعر الحالي (قيمة وقت الضغط) أو يلغي الاختيار
  usdEl.addEventListener("click", () => {
    // لو مش محدد الآن -> نخزن القيمة الحالية المعروضة كاختيار
    if (!usdEl.classList.contains("selected")) {
      // لو آخر قيمة موجودة نستخدمها
      if (lastFetched.tonUSD !== null) {
        selectedPriceUSD = lastFetched.tonUSD;
        usdEl.classList.add("selected");
        usdEl.innerText = Number(selectedPriceUSD).toLocaleString(undefined,{maximumFractionDigits:6}) + " $";
        statusEl.innerText = "تم اختيار سعر التون: " + selectedPriceUSD + " $";
      } else {
        statusEl.innerText = "لا يوجد سعر حالي للاختيار";
      }
    } else {
      // إلغاء الاختيار
      selectedPriceUSD = null;
      usdEl.classList.remove("selected");
      // نعيد عرض آخر قيمة حقيقية (لو موجودة)
      if (lastFetched.tonUSD !== null) {
        usdEl.innerText = Number(lastFetched.tonUSD).toLocaleString(undefined,{maximumFractionDigits:6}) + " $";
      } else {
        usdEl.innerText = "—";
      }
      statusEl.innerText = "تم إلغاء اختيار السعر";
    }
  });
}

// جلب السعر وتحديث العرض (لا يمسّ الاختيار إذا المستخدم اختار)
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

    // خزّن آخر قيمة حقيقية
    lastFetched.tonUSD = tonUSD;
    lastFetched.tonEGP = tonEGP;

    // لو المستخدم لم يختر سعرًا (selectedPriceUSD == null) نعرض آخر قيمة مباشرة
    if (selectedPriceUSD === null) {
      renderTonCard(tonUSD, tonEGP);
    } else {
      // لو المستخدم اختار، نعرض البطاقة لكن نحتفظ بعلامة الاختيار (renderTonCard يتعامل مع selectedPriceUSD)
      renderTonCard(tonUSD, tonEGP);
    }

    statusEl.innerText = "تم التحديث " + new Date().toLocaleTimeString();
    return { tonUSD, tonEGP };
  } catch (err) {
    console.error("getTonPrice error:", err);
    renderTonCard(null, null);
    statusEl.innerText = "خطأ في جلب السعر — افتح Console للمزيد";
    return null;
  }
}

// إرسال السعر: يرسل السعر المختار لو موجود، وإلا يرسل آخر سعر حقيقي
async function sendTonToBot() {
  try {
    statusEl.innerText = "جاري تجهيز الإرسال...";
    // تأكد من وجود سعر (إما مختار أو آخر قيمة)
    const priceToSend = selectedPriceUSD !== null ? selectedPriceUSD : lastFetched.tonUSD;
    if (priceToSend === null) {
      statusEl.innerText = "لا يوجد سعر لإرساله";
      return;
    }

    const messageText = `سعر التون الحالي: ${priceToSend} $`;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    // إرسال للخاص
    const respPrivate = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: PRIVATE_CHAT_ID, text: messageText })
    });
    const jsonPrivate = await respPrivate.json();
    if (!respPrivate.ok || !jsonPrivate.ok) {
      console.warn("خطأ إرسال للخاص:", jsonPrivate);
      statusEl.innerText = `فشل الإرسال للخاص - ${jsonPrivate.description || respPrivate.status}`;
      return;
    }

    // محاولة إرسال للقناة باليوزر (قد يفشل لو القناة خاصة أو البوت ليس مشرف)
    const respChannel = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHANNEL_USERNAME, text: messageText })
    });
    const jsonChannel = await respChannel.json();
    if (!respChannel.ok || !jsonChannel.ok) {
      console.warn("خطأ إرسال للقناة:", jsonChannel);
      statusEl.innerText = "✅ تم إرسال السعر للخاص — فشل الإرسال للقناة (راجع صلاحيات البوت أو استخدم chat_id)";
    } else {
      statusEl.innerText = "✅ تم إرسال السعر للخاص والقناة";
    }
  } catch (err) {
    console.error("sendTonToBot error:", err);
    statusEl.innerText = "خطأ أثناء الإرسال — افتح Console للمزيد";
  }
}

// تحكم التحديث التلقائي (اختياري)
let autoInterval = null;
function startAutoUpdate(intervalMs = 30_000) {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => getTonPrice(), intervalMs);
}
function stopAutoUpdate() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = null;
}

// أحداث الأزرار
refreshBtn.addEventListener("click", getTonPrice);
sendBtn.addEventListener("click", sendTonToBot);
if (autoSendCheckbox) {
  autoSendCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      startAutoUpdate(60_000); // كل دقيقة
      statusEl.innerText = "التحديث التلقائي مفعل كل دقيقة";
    } else {
      stopAutoUpdate();
      statusEl.innerText = "التحديث التلقائي متوقف";
    }
  });
}

// تشغيل أولي
getTonPrice();
