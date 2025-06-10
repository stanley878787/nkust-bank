// --- static/js/invest.js ---
let tradeType = 'buy';
let maxQty = Infinity;
let currentHoldings = {};
let buyBtn, sellBtn;
let decreaseBtn, increaseBtn;
let quantityEl, estimatedEl;
let symbolEl, nameEl, priceEl;
let inputElement, suggestionsElement;
let submitBtn;

async function fetchAndDisplayInvestBalance() {
  try {
    const res = await fetch('/api/v1/accounts/?category=inv', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('取得投資帳戶餘額失敗');

    const accounts = await res.json();
    if (!accounts.length) {
      console.warn('找不到投資帳戶');
      return;
    }

    const ntdAccount = accounts[0];
    const balance = Number(ntdAccount.balance || 0).toLocaleString();
    document.getElementById('bankBalance').textContent = `${balance}`;
  } catch (error) {
    console.error('載入投資帳戶餘額錯誤：', error);
    document.getElementById('bankBalance').textContent = '取得失敗';
  }
}

function switchTab(tab) {
  const investSection = document.getElementById('investments-section');
  const tradingSection = document.getElementById('trading-section');
  const investTabBtn = document.querySelector(".tab-container .tab:nth-child(1)");
  const tradingTabBtn = document.querySelector(".tab-container .tab:nth-child(2)");

  if (tab === 'investments') {
    investSection.style.display = '';
    tradingSection.style.display = 'none';
    investTabBtn.classList.add('tab-active');
    investTabBtn.classList.remove('tab-inactive');
    tradingTabBtn.classList.add('tab-inactive');
    tradingTabBtn.classList.remove('tab-active');
  } else {
    investSection.style.display = 'none';
    tradingSection.style.display = '';
    if (typeof selectTradeType === 'function') {
      selectTradeType('buy');
    }
    investTabBtn.classList.add('tab-inactive');
    investTabBtn.classList.remove('tab-active');
    tradingTabBtn.classList.add('tab-active');
    tradingTabBtn.classList.remove('tab-inactive');
  }
}

function showToast(message, type = "success", duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = message;

  // 移除舊的 type class
  toast.classList.remove("toast-success", "toast-error", "show");

  // 加上新的 type
  toast.classList.add(type === "success" ? "toast-success" : "toast-error");
  // 顯示
  toast.classList.add("show");

  // 一段時間後隱藏
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function submitOrder() {
  // 1. 驗證 estimatedAmount 不是「–」
  const estText = estimatedEl.textContent.trim();
  if (!estText || estText === "–") {
    return showToast("請先選擇股票並確認預估金額！", "error");
  }

  // 2. 組出要傳的資料
  const payload = {
    symbol: symbolEl.textContent.trim(),
    name: nameEl.textContent.trim(),
    unit_price: parseFloat(priceEl.textContent.replace(/,/g, "")),
    quantity: parseInt(quantityEl.value, 10),
    total: parseFloat(estText.replace(/,/g, "")),
    trade_type: tradeType,
  };

  // 3. 讀 access token
  const token = localStorage.getItem("accessToken");
  if (!token) {
    showToast("未授權，請重新登入。", "error");
    return window.location.href = "/login/";  // 或你專案的登入頁
  }

  // 4. 送 AJAX 請求
  fetch("/investments/api/place_order/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
    .then(async res => {
      if (res.status === 401) {
        // 未授權
        showToast("未授權，請重新登入。", "error");
        return window.location.href = "/login/";
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    })
    .then(json => {
      // 1) 顯示成功訊息，持續 1.5 秒
      const duration = 1500;
      if (tradeType === 'buy') {
        showToast("買入成功！", "success", duration);
      } else {
        showToast("賣出成功！", "success", duration);
      }

      // ✅ 加這一行來即時更新銀行餘額
      fetchAndDisplayInvestBalance();

      // 2) 存一個 flag，讓頁面重整後知道要切到 invest tab
      localStorage.setItem("activeTab", "investments");
      resetStockSelection();
      // 3) 重新整理頁面
      setTimeout(() => {
        window.location.reload();
      }, duration);

    })
    .catch(err => {
      console.error("下單錯誤：", err);
      showToast("下單失敗：" + err.message, "error");
    });
}

// 一次性把所有下單相關欄位還原到初始「未選股」狀態
function resetStockSelection() {
  // 1. 清空輸入框、隱藏建議清單
  const inputEl = document.querySelector("#stockInput");
  const suggestionsEl = document.getElementById("suggestions");
  inputEl.value = "";
  suggestionsEl.classList.add("hidden");

  // 2. 隱藏股票資訊區塊
  const headerEl = document.getElementById("stockHeader");
  headerEl.style.display = "none";

  // 3. 鎖住數量加減鈕、下單鈕，並顯示「–」
  const decreaseBtn = document.getElementById("decreaseBtn");
  const increaseBtn = document.getElementById("increaseBtn");
  const submitBtn = document.getElementById("submitBtn");
  const quantityEl = document.getElementById("quantity");
  const estimatedEl = document.getElementById("estimatedAmount");

  quantityEl.value = "";
  quantityEl.disabled = true;
  decreaseBtn.disabled = true;
  increaseBtn.disabled = true;

  symbolEl.textContent = '–';
  nameEl.textContent = '–';
  quantityEl.placeholder = '–';

  if (submitBtn) submitBtn.disabled = true;
  estimatedEl.textContent = "–";

  // 4. （可選）也把 Price 與 Change 還原成空
  const priceEl = document.querySelector(".current-price");
  const changeEl = document.querySelector(".price-change");
  priceEl.textContent = "–";
  changeEl.textContent = "–";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.remove('btn-buy', 'btn-sell');
    submitBtn.classList.add('btn-disabled');
  }

  submitBtn.textContent = '整張下單';
  updateBuySellBtnState();
}

function changeQuantity(delta) {
  // 取得並清理文字內容
  // const rawText = quantityEl.textContent.trim();
  // const currentQty = parseInt(rawText, 10);
  if (quantityEl.disabled) return;

  let currentQty = parseInt(quantityEl.value, 10);
  if (isNaN(currentQty)) currentQty = 0;

  // 如果無法解析為數字，直接跳出
  // if (isNaN(currentQty)) {
  //   console.warn("無法解析數量：", rawText);
  //   return;
  // }

  // 計算新數量
  let newQty = currentQty + delta;
  newQty = Math.max(1, Math.min(maxQty, newQty));
  quantityEl.value = newQty;

  // 根據新數量控制按鈕狀態
  decreaseBtn.disabled = newQty <= 1;
  increaseBtn.disabled = newQty >= maxQty;

  updateAmountDisplays();
}

function updateAmountDisplays() {
  // const price = parseFloat(priceEl.textContent.replace(/,/g, ""));
  // const qtyUnits = parseInt(quantityEl.textContent, 10);
  const price = parseFloat(priceEl.textContent.replace(/,/g, "")) || 0;
  const qtyUnits = parseInt(quantityEl.value, 10) || 0;
  const shares = qtyUnits * 1000;

  if (tradeType === 'sell') {
    // 預估賣出總金額
    const estSell = price * shares;
    estimatedEl.textContent = estSell.toLocaleString();

    // 總成本
    // const avgCost = currentHoldings[symbolEl.textContent].avgCost;
    const holding = currentHoldings[symbolEl.textContent];
    if (!holding) {
      // 還沒選股或資料尚未載入，直接跳出
      return;
    }
    const avgCost = holding.avgCost;
    const totalCost = avgCost * shares;

    // 預估獲利
    const profit = estSell - totalCost;
    const sign = profit >= 0 ? '+' : '-';
    const profitText = sign + Math.abs(profit).toLocaleString();

    // 顯示／更新獲利那一行
    document.getElementById('estimatedProfit').textContent = profitText;

    // 同步更新上方卡片
    const profitEl = document.getElementById('totalProfit');
    profitEl.textContent = profitText;
    profitEl.className = `stat-value ${profit >= 0 ? 'positive' : 'negative'}`;

  } else {
    // 預估買進總金額
    const estBuy = price * shares;
    estimatedEl.textContent = estBuy.toLocaleString();
  }
}



document.addEventListener('DOMContentLoaded', () => {
  // 1. 定義全域變數 & 抓 DOM
  // let tradeType = 'buy';
  // let maxQty = Infinity;

  // 2. 初始化
  buyBtn = document.getElementById('buyBtn');
  sellBtn = document.getElementById('sellBtn');
  decreaseBtn = document.getElementById('decreaseBtn');
  increaseBtn = document.getElementById('increaseBtn');
  quantityEl = document.getElementById('quantity');
  estimatedEl = document.getElementById('estimatedAmount');
  symbolEl = document.querySelector('.stock-code');
  nameEl = document.querySelector('.stock-info h2');
  priceEl = document.querySelector('.current-price');
  inputElement = document.getElementById('stockInput');
  suggestionsElement = document.getElementById('suggestions');
  submitBtn = document.getElementById('submitBtn');

  resetStockSelection();
  updateBuySellBtnState();

  quantityEl.addEventListener('input', () => {
    let v = parseInt(quantityEl.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > maxQty) v = maxQty;
    quantityEl.value = v;

    // 按钮状态
    decreaseBtn.disabled = v <= 1;
    increaseBtn.disabled = v >= maxQty;

    updateAmountDisplays();
  });

  async function selectTradeType(type) {
    // resetStockSelection();
    tradeType = type;
    buyBtn.classList.toggle('active', type === 'buy');
    sellBtn.classList.toggle('active', type === 'sell');

    // resetStockSelection();
    updateStockPanelByTradeType();

    const profitRow = document.getElementById('profit-row');
    const bankRow = document.getElementById('bank-row');

    if (type === 'sell') {
      // 賣出模式：隱藏銀行餘額，顯示預估獲利
      profitRow.style.display = '';
      // bankRow.classList.add('hidden');
      bankRow.style.display = 'none';

      document.querySelector('.amount-section .amount-row:nth-child(1) .amount-label')
        .textContent = '預估賣出總金額';

      // document.getElementById('profit-row').style.display = '';
      // document.getElementById('bank-row').style.display = 'none';
      document.querySelector('.quantity-label').textContent = '庫存數量（1000股為單位）';
    } else {

      // 買進模式：顯示銀行餘額，隱藏預估獲利
      profitRow.style.display = 'none';
      bankRow.style.display = '';
      // bankRow.classList.remove('hidden');

      // document.querySelector('.quantity-label').textContent = '數量（1000股為單位）';
      document.querySelector('.amount-row:first-child .amount-label').textContent = '預估金額';
      document.querySelector('.quantity-label')
        .textContent = '數量（1000股為單位）';
      // document.getElementById('profit-row').style.display = 'none';
      // document.getElementById('bank-row').style.display = '';
      // document.querySelector('.amount-row:nth-child(2) .amount-label').textContent = '投資帳戶餘額';
      // if (submitBtn) {
      //   submitBtn.disabled = true;
      //   submitBtn.classList.remove('btn-buy', 'btn-sell', 'btn-disabled');
      //   submitBtn.classList.add('btn-disabled');
      // }
    }
    updateBuySellBtnState();
    if (tradeType === 'buy') {
      submitBtn.textContent = '整張買進';
    } else {
      submitBtn.textContent = '整張賣出';
    }
  }

  window.selectTradeType = selectTradeType;

  // 4. 綁定按鈕
  buyBtn.addEventListener('click', () => {
    if (buyBtn.disabled) return;
    selectTradeType('buy');
  });
  sellBtn.addEventListener('click', () => {
    if (sellBtn.disabled) return;
    selectTradeType('sell');
  });

  // 先看 localStorage 是否有 activeTab
  const active = localStorage.getItem('activeTab');
  if (active) {
    switchTab(active);                // 切到使用者欲停留的 tab
    localStorage.removeItem('activeTab');  // 清掉 flag
  } else {
    // 原本預設 tab
    switchTab('investments');
  }

  fetchAndDisplayInvestBalance();  // 新增這行：載入台幣帳戶餘額

  // 再載入持倉
  loadMyInvestments();

  async function loadMyInvestments() {
    try {
      // 1. 取持倉
      const res = await fetch('/investments/api/my_aggregated_holdings/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const holdings = await res.json();  // [{symbol, name, total_quantity, average_cost}, ...]

      // 2. 對每筆 order 去抓 quote，並組成一個 array of Promises
      const detailed = await Promise.all(holdings.map(async h => {
        const qRes = await fetch(`/investments/api/twse_quote/?symbol=${encodeURIComponent(h.symbol)}`);
        const qData = await qRes.json();
        const price = parseFloat(qData.price) || 0;
        const shares = h.total_quantity * 1000;
        const cost = parseFloat(h.average_cost) * shares;
        const value = price * shares;
        return {
          symbol: h.symbol,
          name: h.name,
          shares,
          currentPrice: price,
          cost,
          value,
          profit: value - cost
        };
      }));

      // 3. 計算總成本、總市值、總損益
      const totalCost = detailed.reduce((sum, x) => sum + x.cost, 0);
      const totalValue = detailed.reduce((sum, x) => sum + x.value, 0);
      const totalProf = totalValue - totalCost;

      // 4. 更新 stat 卡片
      document.getElementById('totalEstimatedCost').textContent = `$${totalCost.toLocaleString()}`;
      document.getElementById('totalEstimatedValue').textContent = `$${totalValue.toLocaleString()}`;
      const profitEl = document.getElementById('totalProfit');
      profitEl.textContent = `${totalProf >= 0 ? '+' : '-'}$${Math.abs(totalProf).toLocaleString()} (${totalCost > 0 ? ((totalProf / totalCost) * 100).toFixed(2) : '0'}%)`;
      profitEl.className = `stat-value ${totalProf >= 0 ? 'positive' : 'negative'}`;

      // 5. 最後再把列表 render 出來
      const grid = document.querySelector('.investment-grid');
      grid.innerHTML = '';
      detailed.forEach(d => appendInvestmentItem(d, grid));

    } catch (err) {
      console.error('載入持倉失敗', err);
    }
  }

  function appendInvestmentItem(d, container) {
    const item = document.createElement('div');
    item.className = 'investment-item';
    item.innerHTML = `
                      <div class="investment-header">
                      <div class="investment-name">${d.name} (${d.symbol})</div>
                      <div class="investment-type">股票</div>
                      </div>
                      <div class="investment-details">
                      <div class="detail-row">
                          <span class="detail-label">持有股數</span>
                          <span class="detail-value">${d.shares.toLocaleString()} 股</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">平均成本</span>
                          <span class="detail-value">$${(d.cost / d.shares).toLocaleString()}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">目前股價</span>
                          <span class="detail-value">$${d.currentPrice.toLocaleString()}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">損益</span>
                          <span class="detail-value ${d.profit >= 0 ? 'negative' : 'positive'}">
                          ${d.profit >= 0 ? '+' : '-'}$${Math.abs(d.profit).toLocaleString()} (${d.cost > 0 ? ((d.profit / d.cost) * 100).toFixed(2) : '0'}%)
                          </span>
                      </div>
                      </div>
                  `;
    container.appendChild(item);
  }



  // debounce 工具函式，避免頻繁呼叫後端
  function debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }





  // 監聽使用者在輸入框中輸入，debounce 後向後端查詢
  inputElement.addEventListener(
    "input",
    debounce(async (e) => {
      const q = e.target.value.trim();
      if (!q) {
        suggestionsElement.classList.add("hidden");
        return;
      }
      try {
        const res = await fetch(
          `/investments/api/twse_symbol_search/?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const js = await res.json();
        const results = js.results || [];
        if (results.length > 0) {
          renderSuggestions(results);
          suggestionsElement.classList.remove("hidden");
        } else {
          suggestionsElement.classList.add("hidden");
        }
      } catch (err) {
        console.error("twse_symbol_search 發生錯誤：", err);
        suggestionsElement.classList.add("hidden");
      }
    }, 400)
  );

  document.addEventListener("click", function (event) {
    if (
      !inputElement.contains(event.target) &&
      !suggestionsElement.contains(event.target)
    ) {
      suggestionsElement.classList.add("hidden");
    }
  });

  // 1. renderSuggestions 傳 name
  function renderSuggestions(results) {
    suggestionsElement.innerHTML = "";
    results.slice(0, 30).forEach(({ symbol, name }) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = `${symbol} - ${name}`;
      // 傳入 symbol 和 name
      item.addEventListener("click", () => selectStock(symbol, name));
      suggestionsElement.appendChild(item);
    });
  }

  async function selectStock(symbol, name) {
    // 隱藏 suggestions
    inputElement.value = symbol;
    suggestionsElement.classList.add("hidden");

    // 先隱藏 header，等確定可顯示再打開
    const headerEl = document.getElementById("stockHeader");
    headerEl.style.display = "none";

    // 更新標的名稱＆代碼
    document.querySelector(".stock-info h2").textContent = name;
    document.querySelector(".stock-code").textContent = symbol;

    // 重置「預估金額」顯示
    estimatedEl.textContent = "–";

    // 開啟 header
    // headerEl.style.display = "";

    // 根據買／賣初始化數量與上下限
    if (tradeType === 'sell') {
      let holdings;
      try {
        const res = await fetch('/investments/api/my_aggregated_holdings/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        holdings = await res.json();
      } catch (err) {
        return showToast('載入持倉失敗，請稍後再試', 'error');
      }
      // 建 map
      currentHoldings = holdings.reduce((acc, h) => {
        acc[h.symbol] = { quantity: h.total_quantity, avgCost: parseFloat(h.average_cost) };
        return acc;
      }, {});

      const hold = currentHoldings[symbol];
      if (!hold || hold.quantity <= 0) {
        // 賣出卻沒庫存 → 不顯示 header，也不往下跑任何顯示現價的流程
        return showToast('尚未持有此股票，無法賣出', 'error');
      }
      else {
        // 賣出且有庫存，才顯示 header
        headerEl.style.display = "";
        quantityEl.disabled = false;
        // 賣出模式：maxQty = 持倉數量
        maxQty = currentHoldings[symbol].quantity;
        quantityEl.disabled = false;
        quantityEl.value = maxQty;  // 一開始顯示全數

        // － 按鈕：只有當數量 > 1 才可用
        decreaseBtn.disabled = (maxQty <= 1);
        // ＋ 按鈕：剛好到最大庫存，必須禁用
        increaseBtn.disabled = true;
      }

    } else {
      headerEl.style.display = "";
      quantityEl.disabled = false;
      // 買進初始化
      maxQty = Infinity;
      quantityEl.disabled = false;
      quantityEl.value = 1;

      decreaseBtn.disabled = true;   // 不能再小於 1
      increaseBtn.disabled = false;  // 可無限制加
    }

    // 解鎖下單按鈕
    // if (submitBtn) submitBtn.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled', 'btn-buy', 'btn-sell');
      submitBtn.classList.add(tradeType === 'buy' ? 'btn-buy' : 'btn-sell');
    }

    // 取得最新報價
    let data;
    try {
      const qRes = await fetch(`/investments/api/twse_quote/?symbol=${encodeURIComponent(symbol)}`);
      if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
      data = await qRes.json();
      if (data.error) throw new Error(data.error);
    } catch (err) {
      console.error("fetch twse_quote 發生錯誤：", err);
      return showToast('無法取得報價，請稍後再試', 'error');
    }

    // 更新「目前股價」
    const price = parseFloat(data.price) || 0;
    document.querySelector(".current-price").textContent = price.toLocaleString();

    // 更新「漲跌幅」
    const changeValue = parseFloat(data.change);
    const sign = changeValue > 0 ? "+" : "";
    const priceChangeEl = document.querySelector(".price-change");
    priceChangeEl.textContent = `${sign}${data.change} (${data.percent})`;
    priceChangeEl.className = `price-change ${changeValue > 0 ? "positive" : changeValue < 0 ? "negative" : ""
      }`;

    // 最後計算並顯示預估金額或預估賣出金額／獲利
    updateAmountDisplays();
    updateBuySellBtnState();
  }

});

function updateStockPanelByTradeType() {
  // 取得目前選的 symbol 跟 name
  const symbol = symbolEl.textContent.trim();
  const name = nameEl.textContent.trim();

  // 沒選股就不處理
  if (!symbol || symbol === '–' || !name || name === '–') return;

  if (tradeType === 'sell') {
    // 重新載入持倉、設定 maxQty
    fetch('/investments/api/my_aggregated_holdings/', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    })
      .then(res => res.json())
      .then(holdings => {
        currentHoldings = holdings.reduce((acc, h) => {
          acc[h.symbol] = { quantity: h.total_quantity, avgCost: parseFloat(h.average_cost) };
          return acc;
        }, {});

        const hold = currentHoldings[symbol];
        if (!hold || hold.quantity <= 0) {
          showToast('尚未持有此股票，無法賣出', 'error');
          // 可以重設下單區塊（resetStockSelection()）
          return;
        }
        // 設定數量
        maxQty = hold.quantity;
        quantityEl.value = maxQty;
        quantityEl.disabled = false;
        decreaseBtn.disabled = (maxQty <= 1);
        increaseBtn.disabled = true;
        // 更新按鈕顏色
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled', 'btn-buy', 'btn-sell');
        submitBtn.classList.add('btn-sell');
        updateAmountDisplays();
      });
  } else {
    // 買進
    maxQty = Infinity;
    quantityEl.value = 1;
    quantityEl.disabled = false;
    decreaseBtn.disabled = true;
    increaseBtn.disabled = false;
    // 按鈕顏色
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-disabled', 'btn-buy', 'btn-sell');
    submitBtn.classList.add('btn-buy');
    updateAmountDisplays();
  }
}

function updateBuySellBtnState() {
  if (!buyBtn || !sellBtn || !symbolEl || !nameEl) return;

  const hasStock = symbolEl.textContent.trim() !== '–' && nameEl.textContent.trim() !== '–';

  // 1) Enable / Disable
  buyBtn.disabled = !hasStock;
  sellBtn.disabled = !hasStock;

  // 2) 灰掉 or 還原顏色
  buyBtn.classList.toggle('btn-disabled', !hasStock);
  sellBtn.classList.toggle('btn-disabled', !hasStock);

  // 3) active 狀態
  buyBtn.classList.toggle('active', hasStock && tradeType === 'buy');
  sellBtn.classList.toggle('active', hasStock && tradeType === 'sell');
}