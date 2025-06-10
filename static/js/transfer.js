/* static/js/transfer.js */

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

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return location.href = "/login/";

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const authFetch = (url, opt={}) =>
    fetch(url, {
      ...opt,
      headers: { "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json" }
    });

  // 1) 把自己的帳戶塞到 select
  const sel = $("select[name=from_account]");
  const accts = await (await authFetch("/api/v1/accounts/")).json();
  accts.forEach(a=>{
    const opt = document.createElement("option");
    opt.value = a.id;
    // opt.text  = `${a.currency} ${a.name} - ****${a.account_no.slice(-4)}`;
    opt.text  = `${a.type_desc} - ****${a.account_no.slice(-4)}`;
    sel.appendChild(opt);
  });

  // 2) 送出
  $("#transferForm")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const body = {
      from_account_id : sel.value,
      to_account_no   : $("#to_account").value.trim(),
      amount          : $("#amount").value,
      memo            : $("#memo").value.trim()
    };
    try{
      const r = await authFetch("/api/v1/transfer/", {
        method:"POST",
        body: JSON.stringify(body)
      });
      if(r.ok){
        const duration = 1500;
        showToast("轉帳成功！", "success", duration);
        // 重新整理頁面
        setTimeout(() => {
          window.location.reload();
        }, duration);
      }else{
        // 拿到後端回傳的 JSON 錯誤
        const err = await r.json();
        // 優先取 non_field_errors 陣列中的第一個字串，再 fallback 到 detail 或 message
        const errorMsg =
          (Array.isArray(err.non_field_errors) && err.non_field_errors.length > 0
            ? err.non_field_errors[0]
            : null)
          || err.detail
          || err.message
          || JSON.stringify(err);
        const duration = 3000;
        showToast(errorMsg, "error", duration);
      }
    }catch(err){
      const duration = 1500;
      showToast("伺服器未回應", "error", duration);
    }
  });
});
