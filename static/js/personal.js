window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    fetch('/personal/api/info/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('無法取得個人資料');
      return res.json();
    })
    .then(data => {
      // 後端回傳：{ first_name, last_name, email, phone }
      const { first_name: givenName, last_name: familyName, email, phone, avatar_url } = data;

      // 將 fullName (姓 + 名) 填到 #name-display 與 #profile-name
      const fullName = (familyName || '') + (givenName || '');
      document.getElementById('name-display').textContent =
        (familyName || givenName) ? fullName : '尚未設定';
      document.getElementById('profile-name').textContent =
        (familyName || givenName) ? fullName : '用戶姓名';
      document.getElementById('email-main-item').textContent = email || '尚未設定';
      // 將 phone 填到 #phone-display
      document.getElementById('phone-display').textContent = phone || '尚未設定';

      // 判斷 avatar_base64
      if (data.avatar_url) {
        // avatar_url 已經是完整 Data URI: "data:image/png;base64,AAA..."
        existingAvatar.style.backgroundImage = `url(${data.avatar_url})`;
        // 移除 .hidden，讓它顯示出來
        // existingAvatar.classList.remove('hidden');
        existingAvatar.classList.add('has-image'); // 如果你要額外套樣式
      } else {
        // 沒有 avatar，就確保它是隱藏狀態
        // existingAvatar.classList.add('hidden');
      }

      // 更新按鈕狀態與 completionStatus
      if (familyName || givenName) {
        nameValues.family = familyName;
        nameValues.given  = givenName;
        completionStatus.name = true;
        document.getElementById('name-add-button').innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
            <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"></path>
          </svg>
          編輯
        `;
      }

      if (email) {
        completionStatus.email = true;
        document.getElementById('email-add-button').innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
            <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"></path>
          </svg>
          編輯
        `;
      }


      // 如果「姓名」「電子郵件」「行動電話」都不為空，就直接顯示主畫面
      if (familyName && givenName && email && phone) {
        transitionToMainContent();
        return;
      }

      // 否則顯示歡迎頁面，並更新進度條
      updateCompletionPercentage();
    })
    .catch(err => {
      console.error(err);
      // 若抓不到，就顯示歡迎頁或顯示錯誤訊息
    });
  }
});

// =============== 既有程式：追蹤完成狀態 ===============
let completionStatus = {
  name: false,
  email: false,
};

// 存「姓」與「名」目前值 (family = last_name, given = first_name)
let nameValues = {
  family: '',
  given: ''
};

// 更新進度條
function updateCompletionPercentage() {
  const total = Object.keys(completionStatus).length;
  const completed = Object.values(completionStatus).filter(status => status).length;
  const percentage = Math.round((completed / total) * 100);
  document.getElementById('completion-percentage').textContent = `${percentage}%`;
  document.getElementById('progress-fill').style.width = `${percentage}%`;
  if (percentage === 100) {
    showSuccessAnimation();
  }
}

// 顯示成功動畫
function showSuccessAnimation() {
  const successAnimation = document.getElementById('success-animation');
  successAnimation.classList.add('active');
  setTimeout(() => {
    successAnimation.classList.remove('active');
    transitionToMainContent();
  }, 1500);
}

// 切換到主畫面
function transitionToMainContent() {
  document.getElementById('welcome-screen').classList.add('fade-out');
  setTimeout(() => {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('main-container').classList.remove('hidden');
  }, 500);
}

// 打開/關閉 Modal
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ============== 儲存姓名 ==============
function saveName() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    showToast('請先登入', 'error');
    return;
  }
  // first-name-input 是「姓」，last-name-input 是「名」
  const family = document.getElementById('first-name-input').value.trim();
  const given  = document.getElementById('last-name-input').value.trim();
  if (!family || !given) {
    showToast('請輸入完整的姓與名', 'error');
    return;
  }
  fetch('/personal/api/info/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      first_name: given,    // 名 -> first_name
      last_name:  family    // 姓 -> last_name
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('更新姓名失敗');
    return res.json();
  })
  .then(() => {
    nameValues.family = family;
    nameValues.given  = given;
    const fullName = family + given;
    // 更新 #name-display 和 #profile-name
    document.getElementById('name-display').textContent = fullName;
    document.getElementById('profile-name').textContent = fullName;
    completionStatus.name = true;
    updateCompletionPercentage();
    closeModal('name-modal');
    showToast('姓名已儲存', 'success');
    document.getElementById('name-add-button').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"></path>
      </svg>
      編輯
    `;
  })
  .catch(err => {
    console.error(err);
    showToast('儲存姓名失敗，請稍後再試', 'error');
  });
}

// ============== 儲存電子郵件 ==============
function saveEmail() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    showToast('請先登入', 'error');
    return;
  }
  const emailInput = document.getElementById('email-input').value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailInput) {
    showToast('請輸入電子郵件', 'error');
    return;
  }
  if (!emailRegex.test(emailInput)) {
    showToast('請輸入有效的電子郵件格式', 'error');
    return;
  }
  fetch('/personal/api/info/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      email: emailInput
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('更新電子郵件失敗');
    return res.json();
  })
  .then(() => {
    document.getElementById('email-display').textContent = emailInput;
    completionStatus.email = true;
    updateCompletionPercentage();
    closeModal('email-modal');
    showToast('電子郵件已儲存', 'success');
    document.getElementById('email-add-button').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.32,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"></path>
      </svg>
      編輯
    `;

    // ===== 新增：同步更新「主畫面」的電子郵件文字 =====
    const mainEmailElem = document.getElementById('email-main-item');
    if (mainEmailElem) {
        mainEmailElem.textContent = emailInput;
    }
  })
  .catch(err => {
    console.error(err);
    showToast('儲存電子郵件失敗，請稍後再試', 'error');
  });
}

// ============== Toast 通知 ==============
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.background = '#b91c1c';
  } else if (type === 'success') {
    toast.style.background = '#15803d';
  }
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  }, 2000);
}

// 綁定按鈕開啟 Modal
document.getElementById('email-add-button').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('email-modal-title').textContent = '編輯電子郵件';
  const currentEmail = document.getElementById('email-display').textContent.trim();
  document.getElementById('email-input').value =
    currentEmail === '尚未設定' ? '' : currentEmail;
  openModal('email-modal');
});

document.getElementById('name-add-button').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('name-modal-title').textContent = '編輯姓名';
  // 把「姓（last_name）」放到 first-name-input，把「名（first_name）」放到 last-name-input
  document.getElementById('first-name-input').value = nameValues.family;  // 姓
  document.getElementById('last-name-input').value  = nameValues.given;   // 名
  openModal('name-modal');
});

document.getElementById('email-item').addEventListener('click', function () {
  openModal('email-modal');
});
document.getElementById('name-item').addEventListener('click', function () {
  openModal('name-modal');
});



// 綁定主畫面行動電話那一整塊可點擊，讓它打開 Phone Modal
document.getElementById('phone-item').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('phone-modal-title').textContent = '編輯行動電話';
  const currentPhone = document.getElementById('phone-display').textContent.trim();
  document.getElementById('phone-input').value =
    currentPhone === '尚未設定' ? '' : currentPhone;
  openModal('phone-modal');
});

// 綁定主畫面 Email 整個區塊點擊
document.getElementById('email-item-main').addEventListener('click', function(e) {
  e.stopPropagation();
  // 把當前畫面顯示的 Email 塞進 modal input
  const currentEmail = document.getElementById('email-main-item').textContent.trim();
  document.getElementById('main-email-input').value = (currentEmail === '--' ? '' : currentEmail);
  openModal('main-email-modal');
});

// 綁定「修改用戶代號及密碼」設定項目，點擊就打開 Modal
  document.getElementById('credentials-item').addEventListener('click', function (e) {
    e.stopPropagation();
    openModal('credentials-modal');
  });

// ============== 儲存行動電話 ==============
function savePhone() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    showToast('請先登入', 'error');
    return;
  }

  // 1. 先拿現有畫面上顯示的電話
  const existingPhone = document.getElementById('phone-display').textContent.trim();

  // 2. 再拿使用者在 Modal 裡輸入的電話
  const phoneInput = document.getElementById('phone-input').value.trim();

  // 3. 如果兩者一樣，就顯示 Toast 提示，然後 return
  if (phoneInput === existingPhone) {
    showToast('行動電話未更改', 'error');
    return;
  }

  // 4. 格式驗證：必須 09 開頭 + 8 位數
  const phoneRegex = /^09\d{8}$/;
  if (!phoneInput) {
    showToast('請輸入行動電話', 'error');
    return;
  }
  if (!phoneRegex.test(phoneInput)) {
    showToast('請輸入正確的行動電話格式（例如 0912345678）', 'error');
    return;
  }

  // 5. 如果跟原本不一樣，就送出 PATCH
  fetch('/personal/api/info/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ phone: phoneInput })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => {
          throw new Error(errData.detail || '更新行動電話失敗');
        });
      }
      return res.json();
    })
    .then(() => {
      // 更新成功：把主畫面上行動電話直接改成新值
      document.getElementById('phone-display').textContent = phoneInput;
      closeModal('phone-modal');
      showToast('行動電話已更新', 'success');
    })
    .catch(err => {
      console.error(err);
      showToast(err.message, 'error');
    });
}

// ============== 儲存電子郵件 ==============
function saveMainEmail() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    showToast('請先登入', 'error');
    return;
  }

  // 1. 先拿現有畫面上顯示的電話
  const existingEmail = document.getElementById('email-main-item').textContent.trim();

  // 2. 取得使用者在 Modal 裡輸入的 email
  const emailInput = document.getElementById('main-email-input').value.trim();

  // 3-1. 檢查是否為空
  if (!emailInput) {
    showToast('請輸入電子郵件', 'error');
    return;
  }

  // 3-2. 如果兩者一樣，就顯示 Toast 提示，然後 return
  if (existingEmail === emailInput) {
    showToast('電子郵件未更改', 'error');
    return;
  }

  // 3-3. 簡單正規驗證：xxx@yyy.zzz
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput)) {
    showToast('請輸入正確格式的電子郵件', 'error');
    return;
  }

  // 4. 送出 PATCH 請求更新 server
  fetch('/personal/api/info/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ email: emailInput })
  })
  .then(res => {
    if (!res.ok) {
      // 如果後端回 409 或 400，body 裡面可能有 { "detail": "Email 已存在" } 之類
      return res.json().then(errData => {
        throw new Error(errData.detail || '更新電子郵件失敗');
      });
    }
    return res.json();
  })
  .then(data => {
    // 更新成功：把主畫面上的文字改成最新 email
    document.getElementById('email-main-item').textContent = emailInput;
    closeModal('main-email-modal');
    showToast('電子郵件已更新', 'success');
  })
  .catch(err => {
    console.error(err);
    showToast(err.message, 'error');
  });
}

// ============== 儲存新的使用者代號及密碼 ==============
document.addEventListener('DOMContentLoaded', function () {
  fetchUserInfo(); // 載入時預填 user_code
});

function fetchUserInfo() {
  fetch('/personal/api/info/', {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
    }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById('user-code-input').value = data.user_code || '';
    })
    .catch(err => {
      console.error('取得用戶資料失敗', err);
    });
}

function enableEditing(inputId) {
  const input = document.getElementById(inputId);
  input.disabled = false;
  input.focus();
}

function saveUserCode() {
  const userCode = document.getElementById('user-code-input').value.trim();

  if (userCode.length < 6 || userCode.length > 20) {
    showToast('用戶代號長度必須在 6 到 20 字元之間', 'error');
    return;
  }

  fetch('/personal/api/credentials/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
    },
    body: JSON.stringify({ user_code: userCode })
  })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200) {
        showToast('更新成功', 'success');
        closeModal('credentials-modal');
      } else {
        showToast('更新失敗', 'error');
      }
    })
    .catch(err => {
      console.error('更新用戶代號失敗', err);
    });
}