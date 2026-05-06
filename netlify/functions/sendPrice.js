const fetch = require("node-fetch");

exports.handler = async function() {
  try {
    // 1. جلب سعر TON بالدولار من CoinGecko
    const COIN_ID = "the-open-network";
    const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_ID}&vs_currencies=usd`;

    const coinResp = await fetch(COINGECKO_URL);
    if (!coinResp.ok) throw new Error("فشل جلب بيانات CoinGecko");
    const coinData = await coinResp.json();
    const tonUSD = coinData[COIN_ID]?.usd ?? null;

    if (tonUSD === null) {
      throw new Error("لم يتم العثور على سعر TON");
    }

    // 2. تجهيز رسالة السعر
    const messageText = `سعر التون الحالي: ${tonUSD} $`;

    // 3. إرسال السعر للبوت
    const botToken = process.env.BOT_TOKEN;   // هتحط التوكن في Environment Variables
    const chatId = process.env.CHAT_ID;       // هتحط رقم الشات أو القناة في Environment Variables
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: messageText })
    });

    return { statusCode: 200, body: "تم إرسال السعر" };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
