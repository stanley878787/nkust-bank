/* static/js/transfer.js */
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
        alert("轉帳成功！");
        location.reload();
      }else{
        const err = await r.json();
        alert(err.detail || JSON.stringify(err));
      }
    }catch(err){
      alert("伺服器未回應");
    }
  });
});
