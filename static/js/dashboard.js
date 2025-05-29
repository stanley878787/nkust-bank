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



  //帳務資訊按鈕被點選時
  $('.info-btn').on('click', function () {
    const dataKey = $(this).data('key');
    let category = '';
    if (dataKey === 'ntd_total') {
      category = 'ntd';
    } else if (dataKey === 'fx_total') {
      category = 'fx';
    } else if (dataKey === 'inv_total') {
      category = 'inv';
    } else {
      return;
    }

    // 維持你原本的帳號複製事件綁定…
    $('#accountList').off('click', '.copy-btn');
    $('#accountList').on('click', '.copy-btn', function () {
      const $btn = $(this);
      const $accountNo = $btn.siblings('.account-no').text();
      if (navigator.clipboard) {
        navigator.clipboard.writeText($accountNo).then(() => {
          $btn.find('.copy-icon').addClass('hidden');
          $btn.find('.success-icon').removeClass('hidden');
          setTimeout(() => {
            $btn.find('.copy-icon').removeClass('hidden');
            $btn.find('.success-icon').addClass('hidden');
          }, 2000);
        }).catch(() => {
          alert('複製失敗，請手動複製');
        });
      } else {
        alert('你的瀏覽器不支援複製功能');
      }
    });

    const token = localStorage.getItem('accessToken');
    $.ajax({
      url: `/api/v1/accounts/?category=${category}`,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
      success: function (accounts) {
        const $modal = $('#accountModal');
        const $accountList = $('#accountList');
        $accountList.empty();
        if (accounts.length === 0) {
          $accountList.append(`<p class="text-gray-500">沒有可顯示的帳戶資料。</p>`);
        } else {
          accounts.forEach(account => {
            const html = `
              <div class="account-card p-4 mb-2 border border-gray-200 rounded-lg shadow-sm bg-white hover:border-blue-300">
                <div class="card-header flex justify-between items-center">
                  <div class="account-info flex items-center space-x-2">
                    <div class="account-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h5 class="account-name">${account.name}</h5>
                      <span class="badge badge-blue">${account.type_desc}</span>
                    </div>
                  </div>
                  <div>
                    <span class="badge badge-green">${account.currency}</span>
                  </div>
                </div>
                <div class="card-divider mt-3">
                  <div class="account-detail flex justify-between items-center">
                    <div class="account-label">帳號</div>
                    <div class="account-value flex items-center space-x-2">
                      <span class="account-no">${account.account_no}</span>
                      <button class="copy-btn" title="複製帳號">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy h-4 w-4 copy-icon">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                        </svg>
                        <svg class="success-icon hidden" xmlns="http://www.w3.org/2000/svg" fill="none"
                          stroke="green" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>`;
            $accountList.append(html);
          });
        }

        const titleMap = {
          ntd: '台幣帳戶資訊',
          fx: '外幣帳戶資訊',
          inv: '投資帳戶資訊'
        };
        const title = titleMap[category] || '帳戶資訊';
        $modal.find('#modalTitle').text(title);

        // 先把整個 overlay 顯示出來（但 #modalContent 還是透明+縮小）
        $modal.removeClass('hidden').addClass('flex');
        $('body').addClass('overflow-hidden');

        // 下一個 tick 再套用 .modal-open，觸發「淡入＋放大」動畫
        setTimeout(() => {
          $('#modalContent').addClass('modal-open');
        }, 10);
      },
      error: function () {
        alert('取得帳戶資料時發生錯誤，請重新登入或稍後再試。');
      }
    });
  });

  // 關閉 modal
  $('#closeModal').on('click', function () {
    const $modal = $('#accountModal');
    const $modalContent = $('#modalContent');

    // 1) 先把白色內容區的 modal-open 拿掉，觸發縮小＋淡出動畫
    $modalContent.removeClass('modal-open');

    $modal.removeClass('flex').addClass('hidden');
    $('body').removeClass('overflow-hidden');

  });


});
