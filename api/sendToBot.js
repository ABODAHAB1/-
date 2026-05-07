export default async function handler(req, res) {
  const price = await getTonPrice(); // دالة تجيب سعر التون من API
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.CHAT_ID,
      text: `السعر الحالي للتون: ${price}`
    })
  });
  res.status(200).json({ message: "Message sent!" });
}

async function getTonPrice() {
  // هنا تحط الكود اللي يجيب السعر من CoinGecko أو Binance
  return "2.5 USD"; // مثال مؤقت
}
