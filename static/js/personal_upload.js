// 1. 取得必要 DOM
const existingAvatar = document.getElementById('profileAvatar') || document.querySelector('.avatar');
const avatarUploadOverlay = document.getElementById('avatarUploadModalOverlay');
const avatarUploadModal   = document.getElementById('avatarUploadModal');
const btnCloseUpload      = document.getElementById('avatarUploadCloseBtn');
const btnCancelUpload     = document.getElementById('avatarUploadCancelBtn');
const uploadArea          = document.getElementById('avatarUploadArea');
const fileInput           = document.getElementById('avatarUploadFileInput');
const previewContainer    = document.getElementById('avatarUploadPreviewContainer');
const imagePreview        = document.getElementById('avatarUploadImagePreview');
const saveButton          = document.getElementById('avatarUploadSaveBtn');

// 2. 頁面一載入，就拿 user 資料，包含 avatar_base64
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

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
    // 若 data.avatar_base64 有值，直接當背景
    if (data.avatar_base64) {
      existingAvatar.style.backgroundImage = `url(${data.avatar_base64})`;
      existingAvatar.classList.add('has-image');
    }
  })
  .catch(err => {
    console.error(err);
  });
});

// 3. 其餘 Modal 打開/關閉、拖拉、檔案選取等等照原本做
function openAvatarUploadModal() {
  avatarUploadOverlay.classList.remove('opacity-0', 'pointer-events-none');
  avatarUploadOverlay.classList.add('opacity-100');
  avatarUploadModal.classList.remove('translate-y-5', 'opacity-0');
  avatarUploadModal.classList.add('translate-y-0', 'opacity-100');
  avatarUploadOverlay.classList.add('active');
}

function closeAvatarUploadModal() {
  avatarUploadModal.classList.remove('translate-y-0', 'opacity-100');
  avatarUploadModal.classList.add('translate-y-5', 'opacity-0');
  setTimeout(() => {
    avatarUploadOverlay.classList.remove('active');
    avatarUploadOverlay.classList.remove('opacity-100');
    avatarUploadOverlay.classList.add('opacity-0', 'pointer-events-none');
    resetAvatarUploadState();
  }, 200);
}

function resetAvatarUploadState() {
  fileInput.value = '';
  previewContainer.classList.add('hidden');
  saveButton.disabled = true;
  uploadArea.style.borderColor = '';
  uploadArea.style.backgroundColor = '';
}

if (existingAvatar) {
  existingAvatar.style.cursor = 'pointer';
  existingAvatar.addEventListener('click', openAvatarUploadModal);
}
btnCloseUpload.addEventListener('click', closeAvatarUploadModal);
btnCancelUpload.addEventListener('click', closeAvatarUploadModal);
avatarUploadOverlay.addEventListener('click', (e) => {
  if (e.target === avatarUploadOverlay) closeAvatarUploadModal();
});
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '#3b82f6';
  uploadArea.style.backgroundColor = '#f1f5f9';
});
uploadArea.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  uploadArea.style.backgroundColor = '';
});
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  uploadArea.style.backgroundColor = '';
  if (e.dataTransfer.files.length) handleAvatarFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleAvatarFile(e.target.files[0]);
});

function handleAvatarFile(file) {
  const validTypes = ['image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    alert('請上傳 JPG 或 PNG 格式的圖片');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('檔案大小不能超過 5MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    // 這裡 e.target.result 就是「完整的 Data URI」，像 "data:image/png;base64,iVBORw0KGgoAAAANS..."
    imagePreview.src = e.target.result;
    previewContainer.classList.remove('hidden');
    saveButton.disabled = false;
  };
  reader.readAsDataURL(file);
}

// 4. 按「儲存」時：先顯示預覽效果，然後呼叫後端存 Base64
saveButton.addEventListener('click', () => {
  if (!imagePreview.src) return;

  // 先在畫面上顯示
  existingAvatar.style.backgroundImage = `url(${imagePreview.src})`;
  existingAvatar.classList.add('has-image');
  closeAvatarUploadModal();

  // 把完整的 Data URI 丟給後端
  const token = localStorage.getItem('accessToken');
  fetch('/personal/api/avatar/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ avatar_base64: imagePreview.src }) // <-- imagePreview.src 已經包含 "data:image/…;base64,…"
  })
  .then(res => res.json().then(body => ({ status: res.status, body })))
  .then(({ status, body }) => {
    if (status === 200) {
      console.log('上傳成功');
    } else {
      alert(body.detail || '上傳失敗');
      existingAvatar.style.backgroundImage = '';
      existingAvatar.classList.remove('has-image');
    }
  })
  .catch(err => {
    console.error('上傳頭像失敗', err);
    existingAvatar.style.backgroundImage = '';
    existingAvatar.classList.remove('has-image');
  });
});