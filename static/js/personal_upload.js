// 1. 取得必要 DOM
const existingAvatar = document.getElementById('profileAvatar') || document.querySelector('.avatar');
const avatarUploadOverlay = document.getElementById('avatarUploadModalOverlay');
const avatarUploadModal = document.getElementById('avatarUploadModal');
const btnCloseUpload = document.getElementById('avatarUploadCloseBtn');
const btnCancelUpload = document.getElementById('avatarUploadCancelBtn');

const uploadArea = document.getElementById('avatarUploadArea');
const fileInput = document.getElementById('avatarUploadFileInput');
const previewContainer = document.getElementById('avatarUploadPreviewContainer');
const imagePreview = document.getElementById('avatarUploadImagePreview');
const saveButton = document.getElementById('avatarUploadSaveBtn');

const cropContainer = document.getElementById('crop-container');
const cropImage = document.getElementById('crop-image');
const cropOverlay = document.getElementById('crop-overlay');
const uploadPlaceholder = document.getElementById('upload-placeholder');

const ABS_MIN_SCALE = 0.1;

let baseW, baseH, scale, minScale, maxScale;

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
  avatarUploadOverlay.classList.add('opacity-100', 'active');
  avatarUploadModal.classList.remove('translate-y-5', 'opacity-0');
  avatarUploadModal.classList.add('translate-y-0', 'opacity-100');
}

function closeAvatarUploadModal() {
  avatarUploadModal.classList.remove('translate-y-0', 'opacity-100');
  avatarUploadModal.classList.add('translate-y-5', 'opacity-0');
  setTimeout(() => {
    // (a) 退出裁切模式
    uploadArea.classList.remove('cropping');
    // (b) 還原 upload 區內容
    resetAvatarUploadState();
    // (c) 隱藏 overlay
    avatarUploadOverlay.classList.remove('active', 'opacity-100');
    avatarUploadOverlay.classList.add('opacity-0', 'pointer-events-none');
  }, 200);
}

existingAvatar?.addEventListener('click', openAvatarUploadModal);
btnCloseUpload.addEventListener('click', closeAvatarUploadModal);
btnCancelUpload.addEventListener('click', closeAvatarUploadModal);
avatarUploadOverlay.addEventListener('click', (e) => {
  if (e.target === avatarUploadOverlay) {
    closeAvatarUploadModal();
  }
});

// 當上傳區被點擊 或 拖拽檔案到此時，觸發 input type="file" 點擊
// uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('click', (e) => {
  // 如果已經進入裁切模式（cropping），就不再打開 fileInput
  if (uploadArea.classList.contains('cropping')) {
    e.stopPropagation();
    return;
  }
  // 否則才真正觸發 fileInput
  fileInput.click();
});
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
  if (e.dataTransfer.files.length) {
    handleAvatarFile(e.dataTransfer.files[0]);
  }
});

// 處理使用者選檔或拖檔，並顯示到 crop 區域
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleAvatarFile(e.target.files[0]);
  }
});

function resetAvatarUploadState() {
  fileInput.value = '';
  saveButton.disabled = true;

  // 隱藏裁切區、還原上傳提示
  cropContainer.classList.add('hidden');
  cropImage.style.display = 'none';
  cropImage.src = '';
  uploadPlaceholder.style.display = 'flex';

  // 取消 cropping 標記
  uploadArea.classList.remove('cropping');

  // 隱藏預覽區
  previewContainer.classList.remove('visible');
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
// uploadArea.addEventListener('click', () => fileInput.click());
// uploadArea.addEventListener('click', (e) => {
//   if (uploadArea.classList.contains('cropping')) {
//     e.stopPropagation();
//     return;
//   }
//   fileInput.click();
// });
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
    showToast('請上傳 JPG 或 PNG 格式的圖片', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('檔案大小不能超過 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result; // "data:image/png;base64,xxx..."
    initCropper(dataUrl);
    saveButton.disabled = false;     // 啟用「儲存」按鈕
  };
  reader.readAsDataURL(file);
}


// 初始化裁切：標記 cropping、隱藏提示、顯示 crop-container、讓圖片等比例 cover 並置中
function initCropper(dataUrl) {
  // (1) 進入「裁切模式」
  uploadArea.classList.add('cropping');

  // (2) 隱藏「點擊或拖曳提示」、顯示裁切區
  uploadPlaceholder.style.display = 'none';
  cropContainer.classList.remove('hidden');

  // (3) 把圖片放到 crop-image
  cropImage.src = dataUrl;
  cropImage.style.display = 'block';

  cropImage.onload = () => {
    // ① 基本尺寸
    baseW = cropImage.naturalWidth;
    baseH = cropImage.naturalHeight;

    const boxW = uploadArea.clientWidth;  // 300
    const boxH = uploadArea.clientHeight; // 300

    // ② 先算「完整 cover」所需縮放倍率（讓整個框內都被填滿）
    minScale = Math.min(boxW / baseW, boxH / baseH);
    maxScale = 4;          // 你想放大的上限，可自行調
    scale = minScale;   // 一開始就讓圖完整蓋住 area

    applyTransform(true);
    // constrain();          
    enablePanOnCropImage();
    enableWheelZoom();
  };
}

function enableWheelZoom() {
  cropImage.addEventListener('wheel', e => {
    e.preventDefault();

    const oldScale = scale;
    scale += (e.deltaY < 0 ? 1 : -1) * 0.05;          // 0.1 = 每格滾動倍率
    scale = Math.max(ABS_MIN_SCALE, Math.min(maxScale, scale));
    if (scale === oldScale) return;

    // /* 以滑鼠所在點為縮放中心 */
    // const rect = cropImage.getBoundingClientRect();
    // const mx = e.clientX - rect.left;
    // const my = e.clientY - rect.top;
    // const ratio = scale / oldScale;

    applyTransform(false);                               // 重設 width / height

  //   /* 校正 left / top，讓滑鼠下的點維持原地 */
  //   cropImage.style.left = parseFloat(cropImage.style.left) - (mx * (ratio - 1)) + 'px';
  //   cropImage.style.top = parseFloat(cropImage.style.top) - (my * (ratio - 1)) + 'px';
  // }, { passive: false });
   const boxW = uploadArea.clientWidth;
    const boxH = uploadArea.clientHeight;
    cropImage.style.left = (boxW - cropImage.offsetWidth) / 2 + 'px';
    cropImage.style.top  = (boxH - cropImage.offsetHeight) / 2 + 'px';
  }, { passive:false });
}

// 實作「滑鼠拖曳 cropImage」：限制不會拖到空白
function enablePanOnCropImage() {
  let dragging = false, startX = 0, startY = 0, originL = 0, originT = 0;

  cropImage.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    originL = parseFloat(cropImage.style.left);
    originT = parseFloat(cropImage.style.top);
    cropImage.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    cropImage.style.left = originL + dx + 'px';
    cropImage.style.top = originT + dy + 'px';
    // constrain();
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    cropImage.style.cursor = 'grab';
  });
}

function applyTransform() {
  cropImage.style.width = baseW * scale + 'px';
  cropImage.style.height = baseH * scale + 'px';

  if (center) {
    const boxW = uploadArea.clientWidth;
    const boxH = uploadArea.clientHeight;
    cropImage.style.left = (boxW - cropImage.offsetWidth) / 2 + 'px';
    cropImage.style.top = (boxH - cropImage.offsetHeight) / 2 + 'px';
  }
}


// function constrain () {
//   const boxW = uploadArea.clientWidth;
//   const boxH = uploadArea.clientHeight;
//   const imgW = cropImage.offsetWidth;
//   const imgH = cropImage.offsetHeight;

//   let maxL, minL, maxT, minT;

//   // 水平方向
//   if (imgW >= boxW) {            // 圖片比框寬 → 不能漏白
//     minL = boxW - imgW;
//     maxL = 0;
//   } else {                       // 圖片比框窄 → 允許整張在框中移動
//     const delta = (boxW - imgW) / 2;
//     minL = -delta;
//     maxL =  delta;
//   }

//   // 垂直方向
//   if (imgH >= boxH) {
//     minT = boxH - imgH;
//     maxT = 0;
//   } else {
//     const delta = (boxH - imgH) / 2;
//     minT = -delta;
//     maxT =  delta;
//   }

//   let l = parseFloat(cropImage.style.left);
//   let t = parseFloat(cropImage.style.top);

//   cropImage.style.left = Math.max(minL, Math.min(maxL, l)) + 'px';
//   cropImage.style.top  = Math.max(minT, Math.min(maxT, t)) + 'px';
// }


// 按下「儲存」時，把遮罩內圓形區域裁切下來，顯示預覽 & 送後端，並退出裁切
saveButton.addEventListener('click', () => {
  // (1) 先取得 cropOverlay 和 cropImage 的實際畫面座標
  const overlayRect = cropOverlay.getBoundingClientRect();
  const imgRect = cropImage.getBoundingClientRect();

  // (2) 建立 canvas；尺寸 = 裁切圓直徑 (180px)
  const diameter = overlayRect.width;
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d');

  // (3) 計算「裁切圓心」在螢幕的位置
  const circleCenterX = overlayRect.left + diameter / 2;
  const circleCenterY = overlayRect.top + diameter / 2;

  // (4) 圖片目前在螢幕中的位置 = { imgRect.left, imgRect.top }
  //    要把「螢幕座標 → canvas 座標」：  
  //    drawX = -(circleCenterX - imgRect.left) + diameter/2
  //    drawY = -(circleCenterY - imgRect.top ) + diameter/2
  const drawX = -(circleCenterX - imgRect.left) + diameter / 2;
  const drawY = -(circleCenterY - imgRect.top) + diameter / 2;

  // (5) 建立圓形裁切遮罩
  ctx.save();
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // (6) 把 cropImage 畫上去 (利用計算好的 drawX, drawY)
  ctx.drawImage(cropImage, drawX, drawY, imgRect.width, imgRect.height);
  ctx.restore();

  // (7) 拿到裁切後的 dataURL，顯示到「預覽區」
  const croppedDataUrl = canvas.toDataURL('image/png');
  // imagePreview.src = croppedDataUrl;
  // previewContainer.classList.add('visible');

  // (8) 把完整 dataURL 先在畫面左上方的 existingAvatar 更新
  existingAvatar.style.backgroundImage = `url(${croppedDataUrl})`;
  existingAvatar.classList.add('has-image');

  // (9) 同步送後端
  const token = localStorage.getItem('accessToken');
  fetch('/personal/api/avatar/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ avatar_base64: croppedDataUrl })
  })
    .then(res => {
      if (!res.ok) throw new Error('上傳失敗');
      return res.json();
    })
    .then(() => {
      showToast('上傳成功', 'success');
      closeAvatarUploadModal();
    })
    .catch(err => {
      console.error(err);
      showToast('上傳失敗，請稍後再試', 'error');
    });

  // (10) 退出裁切模式
  uploadArea.classList.remove('cropping');
});


// 在「關閉 Modal」或「取消」時，也要退出裁切，還原畫面
function resetAvatarUploadState() {
  // 清空 input 舊值
  fileInput.value = '';
  // 禁用儲存按鈕
  saveButton.disabled = true;

  // 隱藏裁切區，Crop Image 隱藏
  cropContainer.classList.add('hidden');
  cropImage.style.display = 'none';
  cropImage.src = '';

  // 還原「點擊或拖曳提示」
  uploadPlaceholder.style.display = 'flex';

  // 取消 cropping 標記
  uploadArea.classList.remove('cropping');

  // 隱藏預覽區 (若曾顯示)
  previewContainer.classList.remove('visible');
}

function applyTransform(center = false) {
  cropImage.style.width  = baseW * scale + 'px';
  cropImage.style.height = baseH * scale + 'px';

  if (center) {                      // 只有第一次載入需要置中
    const boxW = uploadArea.clientWidth;
    const boxH = uploadArea.clientHeight;
    cropImage.style.left = (boxW - cropImage.offsetWidth) / 2 + 'px';
    cropImage.style.top  = (boxH - cropImage.offsetHeight) / 2 + 'px';
  }
}