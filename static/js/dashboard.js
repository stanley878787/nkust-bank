/*  static/js/dashboard.js  ----------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // —— 0) 檢查 JWT —— 
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return location.href = "/login/";      // 沒 token 直接回登入
  }

  // 讓每次 fetch 都自帶 Authorization
  async function api(url) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.status === 401) {                // 過期 → 回登入頁
      localStorage.clear();
      return location.href = "/login/";
    }
    return r.json();
  }

  // —— 1) 取得「總覽」並塞進 3 張卡片 —— 
  try {
    const totals = await api("/api/v1/accounts/overview/");
    document.querySelectorAll(".stat-card").forEach(card => {
      const key = card.dataset.key;        // ntd_total / fx_total / inv_total
      const val = totals[key] ?? 0;
      // card.querySelector(".stat-value").textContent =
      //   Number(val).toLocaleString("en-US", { style: "currency", currency: "TWD" });
      // let currency = "TWD";
      // if (key === "fx_total") currency = "USD";   // 外幣總額以 USD 顯示
      // card.querySelector(".stat-value").textContent =
      //   Number(val).toLocaleString("en-US", { style: "currency", currency });

      const currency = key === "fx_total" ? "USD" : "TWD";
      let text = Number(val).toLocaleString("en-US", { style: "currency", currency });
      if (key === "fx_total") {
        text = `USD ${text.replace(/^US?[$]/, "")}`;
      } else {
        text = text.replace(/^NT\$/, "NT $");
      }
      card.querySelector(".stat-value").textContent = text;
    });
  } catch (e) {
    console.error("overview error", e);
  }

  // —— 2) 依三種 Category 取清單、動態渲染 —— 
  const tpl = document.getElementById("account-item-tpl");
  const categories = ["ntd", "fx", "inv"];

  for (const cat of categories) {
    try {
      const listData = await api(`/api/v1/accounts/?category=${cat}`);
      const container = document.querySelector(`.account-container[data-cat="${cat}"] .account-list`);
      container.innerHTML = "";            // 清掉預設
      listData.forEach(acc => {
        const li = tpl.content.cloneNode(true);
        li.querySelector(".account-name").textContent = acc.name;
        li.querySelector(".account-type").textContent = acc.type_desc || "";
        li.querySelector(".account-balance").textContent =
          Number(acc.balance).toLocaleString("en-US", { style: "currency", currency: acc.currency });
        container.appendChild(li);
      });
    } catch (e) {
      console.error(cat, e);
    }
  }

  // —— 3) Log-out 按鈕 —— 
  document.querySelector(".btn-link .btn-text")?.addEventListener("click", () => {
    localStorage.clear();
    location.href = "/login/";
  });
});
