/* static/js/recive.js -------------------------------------- */
function updateDateHeaders() {
  // 對每一個日期標題做檢查
  document.querySelectorAll("#txList .section-title").forEach(h3 => {
    let el = h3.nextElementSibling;
    let hasVisible = false;
    // 找到下一個 section-title 或結尾為止
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
  const account = await auth("/api/v1/accounts/?category=ntd")
    .then(list => list[0]);          // 先示範抓第一個台幣帳戶
  if (!account) { alert("找不到帳戶"); return; }

  // const [txs, summary] = await Promise.all([
  //   auth(`/api/v1/accounts/${account.id}/transactions/`),
  //   auth(`/api/v1/accounts/${account.id}/summary/`)
  // ]);

  let txs, summary;
  try {
    [txs, summary] = await Promise.all([
      auth(`/api/v1/accounts/${account.id}/transactions/`),
      auth(`/api/v1/accounts/${account.id}/summary/`)
    ]);
  } catch (e) {
    console.error("取明细或彙總失敗", e);
    // 至少取交易列表
    txs = await auth(`/api/v1/accounts/${account.id}/transactions/`);
    summary = { income: 0, expense: 0, six_months: { labels: [], data: [] } };
  }

  /* ---------- 2) 依日期分群渲染 ---------- */
  const listEl = $("#txList");
  const groups = {};                                // {"2025-05-29": [tx, ...]}
  txs.forEach(t => {
    const d = t.tx_time.slice(0, 10);                // YYYY-MM-DD
    (groups[d] ??= []).push(t);
  });

  // 日期由新到舊
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    // 加日期標題
    const h = document.createElement("h3");
    h.className = "section-title mt-4";
    h.textContent = date;
    listEl.appendChild(h);

    // 每筆交易
    groups[date].forEach(t => {
      const frag = tpl.cloneNode(true);
      const item = frag.firstElementChild;

      item.dataset.kind = t.tx_type;                       // in / out

      item.querySelector(".transaction-title").textContent = t.memo || "(無備註)";
      item.querySelector(".transaction-time").textContent =
        new Date(t.tx_time).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });

      const amtEl = item.querySelector(".amount-text");
      const sign = t.tx_type === "in" ? "+" : "-";
      amtEl.textContent = `${sign}NT$${Math.abs(t.amount).toLocaleString()}`;
      amtEl.className = t.tx_type === "in" ? "amount-text text-emerald-600"
        : "amount-text text-rose-600";

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
  const doughnutCtx = $("#doughnut"), barCtx = $("#barChart");

  new Chart(doughnutCtx, {
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
    options: { plugins: { legend: { position: "bottom" } } }
  });

  new Chart(barCtx, {
    type: "bar",
    data: {
      labels: summary.six_months.labels,
      datasets: [{
        label: "每月支出 (NT$)",
        data: summary.six_months.data.map(v => Math.abs(v)),
        backgroundColor: "#94a3b8"
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });

  /* ---------- 5) 顯示 / 隱藏分析面板 ---------- */
  $("#toggleAnalytics").addEventListener("click", () => {
    $("#analytics").classList.toggle("hidden");
  });
});
