// jwt_session_timeout.js

// 1. 設定 access token 有效時間（秒）
const ACCESS_TOKEN_LIFETIME = 3600;  // 1 小時 = 3600 秒
const WARNING_BEFORE_EXPIRE = 60;    // 幾秒前要跳出提示（這裡 1 分鐘）

let warningTimer = null;
let logoutTimer = null;

function startSessionTimers() {
  clearTimeout(warningTimer);
  clearTimeout(logoutTimer);

  // 2. 設定 X 秒後跳出提示視窗
  warningTimer = setTimeout(showSessionWarningModal, (ACCESS_TOKEN_LIFETIME - WARNING_BEFORE_EXPIRE) * 1000);

  // 3. 再過 Y 秒後自動登出
  logoutTimer = setTimeout(forceLogout, ACCESS_TOKEN_LIFETIME * 1000);
}

function showSessionWarningModal() {
  const modal = document.createElement('div');
  modal.id = 'session-warning-modal';
  modal.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0,0,0,0.6); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        background: white; padding: 20px 30px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center;
        max-width: 400px; width: 100%;
      ">
        <h3>即將登出</h3>
        <p>1 分鐘內未操作將自動登出</p>
        <button id="extend-session-btn" style="
          background-color: #3b82f6; color: white;
          padding: 8px 20px; margin-top: 15px; border: none;
          border-radius: 5px; cursor: pointer;
        ">繼續使用</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('extend-session-btn').addEventListener('click', () => {
    extendSession();
    modal.remove();
  });
}

function extendSession() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    forceLogout();
    return;
  }

  fetch('/api/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  })
    .then(res => {
      if (!res.ok) throw new Error('refresh failed');
      return res.json();
    })
    .then(data => {
      localStorage.setItem('accessToken', data.access);
      startSessionTimers(); // 重設計時器
    })
    .catch(err => {
      console.error('refresh error:', err);
      forceLogout();
    });
}

function forceLogout() {
  alert("已自動登出，請重新登入");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login/"; // 導回登入頁
}

// 初次啟動
startSessionTimers();
