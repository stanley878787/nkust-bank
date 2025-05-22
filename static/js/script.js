// static/js/script.js

const openEyeUrl = "https://cdn-icons-png.flaticon.com/512/159/159604.png";
const closedEyeUrl = "https://cdn-icons-png.flaticon.com/512/10812/10812267.png";
document.addEventListener("DOMContentLoaded", () => {
    const $ = (s) => document.querySelector(s);

    // 元素
    const captchaImg = $("#captchaImage");
    const captchaKeyI = $("#captchaKey");
    const captchaIn = $("#captcha");

    // 從後端 /captcha/refresh/ 取得新 key + 圖片 URL
    async function refreshCaptcha() {
        try {
            const res = await fetch("/captcha/refresh/", {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!res.ok) throw new Error(res.status);
            const { key, image_url } = await res.json();
            captchaImg.src = image_url;    // 圖片 URL 例如 /captcha/<key>/
            captchaKeyI.value = key;          // record the hashkey
            captchaIn.value = "";           // 清空使用者輸入
        } catch (err) {
            console.error("取驗證碼失敗", err);
            // 你可以在畫面上加個錯誤提醒
        }
    }

    // 點擊圖換一張
    captchaImg.addEventListener("click", refreshCaptcha);
    // 首次載入時呼叫
    refreshCaptcha();

    // ── 共用：顯示／清除欄位錯誤 ──
    function showFieldError(el, msg) {
        const grp = el.closest(".form-group");
        grp.classList.add("error");
        const e = grp.querySelector(".error-message");
        if (e) e.textContent = msg;
    }
    function clearFieldError(el) {
        const grp = el.closest(".form-group");
        grp.classList.remove("error");
        const e = grp.querySelector(".error-message");
        if (e) e.textContent = "";
    }

    // ── Login 即時驗證 ──
    const idLogin = document.getElementById("idNumber");
    if (idLogin) {
        idLogin.addEventListener("input", e => {
            const v = e.target.value = e.target.value.toUpperCase();
            if (/^[A-Z][12]\d{8}$/.test(v)) {
                clearFieldError(e.target);
            } else {
                showFieldError(e.target, "請輸入有效的身分證字號");
            }
        });
    }

    // ── Login 表單提交 ──
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async e => {
            e.preventDefault();
            // HTML5 驗證
            if (!loginForm.checkValidity()) {
                loginForm.reportValidity();
                return;
            }
            // 組裝 payload
            const payload = {
                id_number: document.getElementById("idNumber").value.trim().toUpperCase(),
                user_code: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value,
                captcha: document.getElementById("captcha").value.trim(),
                captcha_id: document.getElementById("captchaKey").value,
            };
            try {
                const res = await fetch("/api/v1/auth/login/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem("accessToken", data.access);
                    localStorage.setItem("refreshToken", data.refresh);
                    alert("登入成功！");
                    window.location.href = "/dashboard/";  // 或者你要跳的页面
                } else {
                    const err = await res.json();
                    alert(err.detail || "帳號或密碼錯誤");
                    await refreshCaptcha();
                }
            } catch (err) {
                console.error(err);
                alert("伺服器未回應，請稍後再試");
            }
        });
    }

    const userLogin = document.getElementById("username");
    if (userLogin) {
        userLogin.addEventListener("input", e => {
            if (e.target.value.trim()) clearFieldError(e.target);
            else showFieldError(e.target, "請輸入使用者代號");
        });
    }
    // 密碼長度
    const pwdLogin = document.getElementById("password");
    if (pwdLogin) {
        pwdLogin.addEventListener("input", e => {
            const len = e.target.value.length;
            if (len >= 8 && len <= 20) clearFieldError(e.target);
            else showFieldError(e.target, "密碼必須 8–20 字元");
        });
    }
    // 驗證碼
    const capLogin = document.getElementById("captcha");
    if (capLogin) {
        capLogin.addEventListener("input", e => {
            const v = e.target.value = e.target.value.toUpperCase();
            if (/^[A-Z0-9]{4}$/.test(v)) clearFieldError(e.target);
            else showFieldError(e.target, "請輸入 4 碼驗證碼");
        });
    }

    // ====== 註冊表單才綁定的「即時驗證／提交」 ======
    const regForm = document.getElementById("registerForm");
    if (regForm) {
        const idReg = regForm.querySelector("[name=id_number]");
        idReg.addEventListener("input", e => {
            const v = e.target.value = e.target.value.toUpperCase();
            /^[A-Z][12]\d{8}$/.test(v)
                ? clearFieldError(e.target)
                : showFieldError(e.target, "請輸入有效的身分證字號");
        });
        const phoneReg = regForm.querySelector("[name=phone]");
        phoneReg.addEventListener("input", e => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
            /^09\d{8}$/.test(e.target.value)
                ? clearFieldError(e.target)
                : showFieldError(e.target, "格式：09xxxxxxxx");
        });
        const codeReg = regForm.querySelector("[name=user_code]");
        codeReg.addEventListener("input", e => {
            /^[A-Za-z0-9]{6,20}$/.test(e.target.value.trim())
                ? clearFieldError(e.target)
                : showFieldError(e.target, "6–20 字母與數字");
        });
        const pwdReg = regForm.querySelector("[name=password]");
        const confirmReg = regForm.querySelector("[name=confirm_password]");
        pwdReg.addEventListener("input", e => {
            const len = e.target.value.length;
            (len >= 8 && len <= 20)
                ? clearFieldError(e.target)
                : showFieldError(e.target, "密碼必須 8–20 字元");
            if (confirmReg) confirmReg.dispatchEvent(new Event("input"));
        });
        confirmReg.addEventListener("input", e => {
            const val = e.target.value;
            if (!val) {
                // 空值不提示錯誤
                clearFieldError(e.target);
            } else if (val === pwdReg.value) {
                clearFieldError(e.target);
            } else {
                showFieldError(e.target, "與密碼不符");
            }
        });
        const capReg = regForm.querySelector("[name=captcha]");
        capReg.addEventListener("input", e => {
            const v = e.target.value = e.target.value.toUpperCase();
            /^[A-Z0-9]{4}$/.test(v)
                ? clearFieldError(e.target)
                : showFieldError(e.target, "請輸入 4 碼驗證碼");
        });
        // 提交
        // regForm.addEventListener("submit", async e => {
        //     e.preventDefault();
        //     if (!validateForm()) return;
        // });

        regForm.addEventListener("submit", async e => {
            e.preventDefault();
            // 改用 HTML5 內建驗證
            if (!regForm.checkValidity()) {
                // 如果欄位有問題，就叫瀏覽器顯示錯誤提示
                regForm.reportValidity();
                return;
            }

            // 組成要送到後端的資料
            const payload = {
                id_number: regForm.querySelector('[name=id_number]').value.trim().toUpperCase(),
                phone: regForm.querySelector('[name=phone]').value.trim(),
                user_code: regForm.querySelector('[name=user_code]').value.trim(),
                password: regForm.querySelector('[name=password]').value,
                confirm_password: regForm.querySelector('[name=confirm_password]').value,
                captcha: regForm.querySelector('[name=captcha]').value.trim(),
                captcha_id: regForm.querySelector('#captchaKey').value,
            };

            try {
                const res = await fetch("/api/v1/auth/register/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    alert("註冊成功！即將跳轉到登入頁");
                    window.location.href = "/login/";
                    return;
                }

                let errMsg = `伺服器錯誤 (${res.status})`;
                if (res.headers.get("content-type")?.includes("application/json")) {
                    const err = await res.json();
                    errMsg = err.detail
                        || err.non_field_errors?.[0]
                        || err.id_number?.[0]
                        || err.user_code?.[0]
                        || err.phone?.[0]
                        || err.password?.[0]
                        || err.confirm_password?.[0]
                        || err.captcha?.[0]
                        || errMsg;
                }
                alert(errMsg);
                await refreshCaptcha();
            } catch (error) {
                console.error(error);
                alert("伺服器未回應，請稍後再試");
            }
        });
    }

    document.querySelectorAll(".toggle-visibility").forEach(btn => {
        const img = btn.querySelector("img");
        const input = document.getElementById(btn.dataset.target);
        btn.addEventListener("click", () => {
            if (input.type === "password") {
                input.type = "text";
                img.src = openEyeUrl;
            } else {
                input.type = "password";
                img.src = closedEyeUrl;
            }
        });
    });

});