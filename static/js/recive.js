/* static/js/recive.js -------------------------------------- */
function updateDateHeaders() {
  document.querySelectorAll("#txList .section-title").forEach(h3 => {
    let el = h3.nextElementSibling;
    let hasVisible = false;
    while (el && !el.classList.contains("section-title")) {
      if (el.matches(".transaction-item") && !el.classList.contains("hidden")) {
        hasVisible = true;
        break;
      }
      el = el.nextElementSibling;
    }
    h3.classList.toggle("hidden", !hasVisible);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  /* ---------- 共用 ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const tpl = $("#txItemTpl").content;

  const token = localStorage.getItem("accessToken");
  if (!token) return location.href = "/login/";

  const auth = (url) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

  /* ---------- 1) 抓交易 + 組圖表資料 ---------- */
  const account = await auth("/api/v1/accounts/?category=ntd").then(list => list[0]);
  if (!account) { alert("找不到帳戶"); return; }

  let txs, summary;
  try {
    [txs, summary] = await Promise.all([
      auth(`/api/v1/accounts/${account.id}/transactions/`),
      auth(`/api/v1/accounts/${account.id}/summary/`)
    ]);
  } catch (e) {
    console.error("取明細或彙總失敗", e);
    txs = await auth(`/api/v1/accounts/${account.id}/transactions/`);
    summary = { income: 0, expense: 0, six_months: { labels: [], data: [] } };
  }

  /* ---------- 2) 依日期分群渲染 ---------- */
  const listEl = $("#txList");
  const groups = {};
  txs.forEach(t => {
    const d = t.tx_time.slice(0, 10); // YYYY-MM-DD
    (groups[d] ??= []).push(t);
  });

  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      // 加日期標題
      const h = document.createElement("h3");
      h.className = "section-title mt-4 font-semibold";
      h.textContent = date;
      listEl.appendChild(h);

      // 每筆交易
      groups[date].forEach(t => {
        const frag = tpl.cloneNode(true);
        const item = frag.firstElementChild;

        item.dataset.kind = t.tx_type; // in / out

        // 1) 填入標題、時間、金額
        item.querySelector(".transaction-title").textContent = t.memo || "(無備註)";
        item.querySelector(".transaction-time").textContent =
          new Date(t.tx_time).toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit"
          });

        const amtEl = item.querySelector(".amount-text");
        const sign = t.tx_type === "in" ? "+" : "-";
        amtEl.textContent = `${sign}NT$${Math.abs(t.amount).toLocaleString()}`;
        amtEl.className = t.tx_type === "in"
          ? "amount-text text-emerald-600"
          : "amount-text text-rose-600";

        // 2) 直接抓 transaction-title 的文字來決定圖示
        const iconEl = item.querySelector(".transaction-icon");
        const titleText = item.querySelector(".transaction-title").textContent.toLowerCase();

        if (titleText.includes("早餐") || titleText.includes("午餐") || titleText.includes("晚餐")) {
          // 餐飲：叉子＋刀子（精緻版）
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M20 4H4V6h16V4zm0 3H4v2c0 3.31 2.69 6 6 6v2H8v2h8v-2h-2v-2c3.31 0 6-2.69 6-6V7zM6 9v-.5h12V9c0 2.21-1.79 4-4 4H10c-2.21 0-4-1.79-4-4z"/>
            </svg>
            `;
        }
        else if (titleText.includes("捷運") || titleText.includes("公車") || titleText.includes("出租車") || titleText.includes("計程車")) {
          // 交通：小汽車圖示（精緻版）
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="w-full h-full text-blue-500"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 13h18v-3c0-1.1-.9-2-2-2h-2.5l-1-3h-7l-1 3H5c-1.1 0-2 .9-2 2v3z"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 16a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 16a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 13v-3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 13v-3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        else if (titleText.includes("訂閱") ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.89 2-1.99h-4c0 1.1.9 1.99 2 1.99zM18.29 16.29L18 16V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-.29.29A1.003 1.003 0 006 18h12a1.003 1.003 0 00.29-1.71z"/>
            </svg>
            `;
        }
        else if (titleText.includes("轉入") || titleText.includes("轉出")  ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
              <path d="M7 7h13v2H7v3L2 8l5-4v3zm10 10H4v-2h13v-3l5 4-5 4v-3z"/>
            </svg>

            `;
        }
        else if (titleText.includes("超商")  ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
              <path d="M19 2H5v20l3-2 3 2 3-2 3 2 2-2V2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z"/>
            </svg>
            `;
        }
        else if (titleText.includes("開戶禮金")  ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <circle cx="12" cy="12" r="10"/>
              <text x="12" y="16" font-size="10" text-anchor="middle" fill="#fff" font-family="Arial">$</text>
            </svg>
            `;
        }
        else if (titleText.includes("薪資")  ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
              <path d="M19 2H5v20l3-2 3 2 3-2 3 2 2-2V2zM7 6h10v2H7V6zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/>
            </svg>

            `;
        }
        else if (titleText.includes("網購") ) {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10
                0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9
                2-2-.9-2-2-2zM7.16 14.26l.03.01.01.01L7.75
                16h8.5l1.6-3H8.53l-.37-.75L5.1 4H2v2h2l3.6
                7.59-1.35 2.44c-.16.28-.25.61-.25.97C6
                18.1 6.9 19 8 19h12v-2H8.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.62h7.45c.75
                0 1.41-.41 1.75-1.03L21 6H6.21l-.94-2H2V2h3.6l1.66
                3.59L7.16 14.26z"/>
            </svg>

            `;
        }

        listEl.appendChild(frag);
      });
    });

  /* ---------- 3) Tabs 過濾 ---------- */
  $$(".tab-link").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".tab-link").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const filter = tab.dataset.filter; // all/in/out
      $$("#txList .transaction-item").forEach(it => {
        const hide = (filter !== "all" && it.dataset.kind !== filter);
        it.classList.toggle("hidden", hide);
      });

      updateDateHeaders();
    });
  });

  updateDateHeaders();

  /* ---------- 4) Chart.js 分析 ---------- */
  // 先確認畫圖的 DOM 元素存在再做 Chart 初始化
  const doughnutCanvas = document.querySelector("#doughnut");
  const barCanvas      = document.querySelector("#barChart");

  if (doughnutCanvas && barCanvas && summary) {
    // 當且僅當本頁面有這兩個 ID，才做以下兩張圖
    new Chart(doughnutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["收入", "支出"],
        datasets: [{
          data: [
            Number(summary.income),
            Number(summary.expense)
          ],
          backgroundColor: ["#16a34a", "#dc2626"]
        }]
      },
      options: {
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });

    new Chart(barCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: summary.six_months?.labels || [],
        datasets: [{
          label: "每月支出 (NT$)",
          data: (summary.six_months?.data || []).map(v => Math.abs(v)),
          backgroundColor: "#94a3b8"
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  }
});
