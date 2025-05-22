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
        regForm.addEventListener("submit", async e => {
            e.preventDefault();
            if (!validateForm()) return;
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