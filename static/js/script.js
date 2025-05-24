// static/js/script.js

const openEyeUrl = "https://cdn-icons-png.flaticon.com/512/159/159604.png";
const closedEyeUrl = "https://cdn-icons-png.flaticon.com/512/10812/10812267.png";
document.addEventListener("DOMContentLoaded", () => {

    const submitBtn = document.getElementById("submitBtn");
    const phoneInput = document.getElementById("phone");
    const phoneError = document.getElementById("phone-error");
    const otpSection = document.getElementById("otp-section");
    const otpInput = document.getElementById("otp");
    const otpError = document.getElementById("otp-error");

    if (submitBtn && phoneInput && phoneError && otpSection && otpInput && otpError) {
        // 都不為 null，才進行事件綁定
        let formattedPhone = "";
        let step = 1;

        console.log("857");

        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== "") {
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === name + "=") {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        const csrftoken = getCookie("csrftoken");

        function normalizePhone(input) {
            let v = input.trim().replace(/\D/g, "");
            if (v.startsWith("0")) v = v.substring(1);
            return "+886" + v;
        }

        submitBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (step === 1) {
                phoneError.textContent = "";
                const rawPhone = phoneInput.value;
                if (!/^09\d{8}$/.test(rawPhone)) {
                    phoneError.textContent = "請輸入有效的手機號碼 (例：0912345678)";
                    return;
                }

                formattedPhone = normalizePhone(rawPhone);

                fetch("/api/v1/auth/send-otp/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrftoken,
                    },
                    body: JSON.stringify({ phone: formattedPhone }),
                })
                .then(resp => {
                    // 先把 HTTP 狀態和狀態文字都印出來
                    console.log("send-otp response status:", resp.status, resp.statusText);
                    return resp.json().then(data => ({ status: resp.status, data }));
                })
                .then(({ status, data }) => {
                    console.log("send-otp JSON:", data);
                    if (status === 200 && data.status === "pending") {
                        step = 2;
                        otpSection.style.display = "block";
                        submitBtn.querySelector(".btn-text").textContent = "驗證碼驗證";
                    } else {
                        // 如果後端有回傳 error 或其他訊息，都把它印出來
                        console.error("send-otp not pending:", data);
                        phoneError.textContent = data.error || data.status || "無法發送驗證碼，請稍後再試。";
                    }
                })
                .catch(err => {
                    // 印出錯誤物件，包含 stack trace
                    console.error("send-otp fetch failed:", err);
                    phoneError.textContent = "伺服器錯誤，請稍後再試。";
                });

            } else if (step === 2) {
                otpError.style.display = "none";
                otpError.textContent = "";

                const code = otpInput.value.trim();
                if (!/^\d{6}$/.test(code)) {
                    otpError.style.display = "block";
                    otpError.textContent = "請輸入 6 位數驗證碼";
                    return;
                }

                fetch("/api/v1/auth/verify-otp/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrftoken,
                    },
                    body: JSON.stringify({ phone: formattedPhone, code: code }),
                })
                .then(resp => {
                    console.log("verify-otp response status:", resp.status, resp.statusText);
                    return resp.json().then(data => ({ status: resp.status, data }));
                })
                .then(({ status, data }) => {
                    console.log("verify-otp JSON:", data);
                    if (status === 200 && data.status === "approved") {
                        alert("驗證成功");
                    } else if ( data.status === "pending") {
                        otpError.style.display = "block";
                        otpError.textContent = data.error || data.status || "驗證失敗，請確認驗證碼正確。";
                    } {
                        console.error("verify-otp not approved:", data);
                        otpError.style.display = "block";
                        otpError.textContent = data.error || data.status || "驗證失敗，請確認驗證碼正確。";
                    }
                })
                .catch(err => {
                    console.error("verify-otp fetch failed:", err);
                    otpError.style.display = "block";
                    otpError.textContent = "伺服器錯誤，請稍後再試。";
                });
            }
        });
    }

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