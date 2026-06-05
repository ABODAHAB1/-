const API_URL = "https://animated-sfogliatella-b517b6.netlify.app";

const ordersDiv = document.getElementById("orders");

// دالة عرض الطلبات
function renderOrder(order) {
  const div = document.createElement("div");
  div.className = "order";

  div.innerHTML = `
    <h3>📦 طلب جديد</h3>
    <span><b>الاسم:</b> ${order.name}</span>
    <span><b>الهاتف:</b> ${order.phone}</span>
    <span><b>العنوان:</b> ${order.address}</span>
    <span><b>الطلب:</b> ${order.order}</span>
  `;

  ordersDiv.prepend(div);
}

// 👇 محاولة جلب الطلبات (لو في API شغال)
async function loadOrders() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    // لو رجع Array من الطلبات
    data.forEach(order => renderOrder(order));

  } catch (err) {
    console.log("لا يوجد API جاهز حالياً");
  }
}

loadOrders();

// 👇 استقبال طلبات جديدة بشكل وهمي (Polling)
setInterval(loadOrders, 5000);
