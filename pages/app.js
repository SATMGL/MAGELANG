// ===================================
// MAIN APPLICATION JAVASCRIPT
// Standalone version with API communication
// Modified for separated pages (jadwal-kerja.html & jadwal-absensi.html)
// ===================================

// API Helper Functions
async function apiCall(action, params = {}, method = 'GET') {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    throw new Error('API URL belum dikonfigurasi. Silakan edit file config.js');
  }

  const payload = { action, ...params };
  
  try {
    let url = CONFIG.API_URL;
    let options = {
      method: method,
      mode: 'no-cors', // Important for Apps Script
    };

    if (method === 'GET') {
      const queryString = new URLSearchParams(payload).toString();
      url += '?' + queryString;
    } else if (method === 'POST') {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(payload);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
    options.signal = controller.signal;

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    // Note: dengan mode 'no-cors', kita tidak bisa baca response
    // Jadi kita pakai workaround dengan script tag injection
    return await fetchWithScript(action, params, method);

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - silakan coba lagi');
    }
    throw error;
  }
}

// Workaround untuk CORS menggunakan script tag
function fetchWithScript(action, params, method) {
  return new Promise((resolve, reject) => {
    const callbackName = 'apiCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    window[callbackName] = function(data) {
      delete window[callbackName];
      document.head.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    
    if (method === 'GET') {
      const payload = { action, ...params, callback: callbackName };
      const queryString = new URLSearchParams(payload).toString();
      script.src = CONFIG.API_URL + '?' + queryString;
    } else {
      // POST via GET with callback (workaround)
      const payload = { action, ...params, callback: callbackName };
      const queryString = new URLSearchParams(payload).toString();
      script.src = CONFIG.API_URL + '?' + queryString;
    }

    script.onerror = () => {
      delete window[callbackName];
      document.head.removeChild(script);
      reject(new Error('Failed to load script'));
    };

    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        reject(new Error('Request timeout'));
      }
    }, CONFIG.API_TIMEOUT);

    document.head.appendChild(script);
  });
}

// Simplified API call for Apps Script (using direct fetch)
async function callAPI(action, params = {}) {
  try {
    const payload = { action, ...params };
    const queryString = new URLSearchParams(payload).toString();
    const url = CONFIG.API_URL + '?' + queryString;
    
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// POST API call
async function callAPIPost(action, params = {}) {
  try {
    const payload = { action, ...params };
    
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Global Variables
const ALL_SHIFT_OPTIONS = ['', 'P', 'S', 'M', 'SM', 'P12', 'M12', 'OFF', 'CUTI'];
const WEEKDAY_SHIFT_OPTIONS = ['', 'P', 'S', 'M', 'SM', 'OFF', 'CUTI'];
const WEEKEND_SHIFT_OPTIONS = ['', 'P12', 'M12', 'OFF', 'CUTI'];
const EDIT_MODE_PSM_OPTIONS = ['', 'P', 'S', 'M', 'OFF', 'CUTI'];
const EDIT_MODE_P_SM_OPTIONS = ['', 'P', 'SM', 'OFF', 'CUTI'];

let currentMode = null;
let hariKerjaData = null;
let currentData = null;
let originalData = null;
let isEditMode = false;
let isAdminMode = false;
let editedData = {};
let undoStack = [];
let redoStack = [];
let lastVerifiedUnit = null;
let currentEditMode = 'LENGKAP';
let saveIndicatorTimeout = null;

// Prevent multi-touch zoom
document.addEventListener('touchstart', function(e) { 
  if (e.touches.length > 1) e.preventDefault(); 
}, { passive: false });

let lastY = 0;
document.addEventListener('touchmove', function(e) { 
  const currentY = e.touches[0].clientY; 
  const scrollTop = window.scrollY || document.documentElement.scrollTop; 
  if (scrollTop === 0 && currentY > lastY) { 
    e.preventDefault(); 
  } 
  lastY = currentY; 
}, { passive: false });

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

function saveToLocal(key, value) { 
  try { 
    localStorage.setItem(key, JSON.stringify(value)); 
  } catch(e) {} 
}

function getFromLocal(key) { 
  try { 
    return JSON.parse(localStorage.getItem(key)); 
  } catch(e) { 
    return null; 
  } 
}

// Modal Functions
function showCustomModal(options) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');
    const inputContainer = document.getElementById('modalInputContainer');
    const inputLabel = document.getElementById('modalInputLabel');
    const input = document.getElementById('modalInput');
    const buttonsContainer = document.getElementById('modalButtons');
    
    icon.textContent = options.icon || '❓';
    title.textContent = options.title || '';
    message.textContent = options.message || '';
    
    if (options.input) {
      inputContainer.style.display = 'block';
      inputLabel.textContent = options.inputLabel || 'Input:';
      input.type = options.inputType || 'text';
      input.value = '';
      input.placeholder = options.placeholder || '';
      
      setTimeout(() => input.focus(), 300);
      
      input.onkeypress = (e) => {
        if (e.key === 'Enter') {
          const btn = buttonsContainer.querySelector('.modal-btn-primary, .modal-btn-success');
          if (btn) btn.click();
        }
      };
    } else {
      inputContainer.style.display = 'none';
    }
    
    buttonsContainer.innerHTML = '';
    
    options.buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `modal-btn ${btn.className || 'modal-btn-secondary'}`;
      button.textContent = btn.text;
      button.onclick = () => {
        modal.classList.remove('show');
        if (options.input && btn.returnInput) {
          resolve(input.value);
        } else {
          resolve(btn.value);
        }
      };
      buttonsContainer.appendChild(button);
    });
    
    modal.classList.add('show');
    
    if (options.closeOnBackdrop) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          resolve(null);
        }
      };
    } else {
      modal.onclick = null;
    }
  });
}

function modernAlert(message, title = 'Pemberitahuan', icon = '✓') {
  return showCustomModal({
    icon: icon,
    title: title,
    message: message,
    buttons: [
      { text: 'OK', className: 'modal-btn-primary', value: true }
    ],
    closeOnBackdrop: false
  });
}

function modernConfirm(message, title = 'Konfirmasi', icon = '❓') {
  return showCustomModal({
    icon: icon,
    title: title,
    message: message,
    buttons: [
      { text: 'Batal', className: 'modal-btn-secondary', value: false },
      { text: 'Ya', className: 'modal-btn-primary', value: true }
    ],
    closeOnBackdrop: false
  });
}

function modernPrompt(message, title = 'Input', placeholder = '', icon = '✏️', inputType = 'text') {
  return showCustomModal({
    icon: icon,
    title: title,
    message: message,
    input: true,
    inputLabel: message,
    placeholder: placeholder,
    inputType: inputType,
    buttons: [
      { text: 'Batal', className: 'modal-btn-secondary', value: null },
      { text: 'OK', className: 'modal-btn-primary', returnInput: true }
    ],
    closeOnBackdrop: false
  });
}

function modernConfirmDanger(message, title = 'Peringatan', icon = '⚠️') {
  return showCustomModal({
    icon: icon,
    title: title,
    message: message,
    buttons: [
      { text: 'Batal', className: 'modal-btn-secondary', value: false },
      { text: 'Ya, Lanjutkan', className: 'modal-btn-danger', value: true }
    ],
    closeOnBackdrop: false
  });
}

function init() {
  editedData = getFromLocal('editedData') || {};
  undoStack = getFromLocal('undoStack') || [];
  redoStack = getFromLocal('redoStack') || [];
  originalData = getFromLocal('originalData') || null;
  lastVerifiedUnit = getFromLocal('lastVerifiedUnit') || null;
  isAdminMode = getFromLocal('isAdminMode') || false;
  currentEditMode = getFromLocal('currentEditMode') || 'LENGKAP';
  
  updateAdminUI();
  const savedMode = getFromLocal('currentMode');
  if (savedMode) { selectMode(savedMode, true); }
  
  // Hide config warning if API is configured
  if (CONFIG.API_URL && !CONFIG.API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    hideConfigWarning();
  }
}

function showSaveIndicator(message, duration = 2000) {
  const indicator = document.getElementById('saveIndicator');
  indicator.textContent = message;
  indicator.style.display = 'block';
  
  if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
  
  saveIndicatorTimeout = setTimeout(() => {
    indicator.style.display = 'none';
  }, duration);
}

// Admin Functions
async function loginAdmin() {
  const password = await modernPrompt('', 'Masukkan Password Admin', 'Password...', '🔐', 'password');
  if (!password) return;
  
  showSaveIndicator('🔐 Memverifikasi...', 3000);
  
  try {
    const result = await callAPI('verifyAdminPassword', { password });
    
    if (result.success) {
      isAdminMode = true;
      saveToLocal('isAdminMode', true);
      updateAdminUI();
      showSaveIndicator('✓ Admin mode aktif!', 2000);
    } else {
      modernAlert(result.message, 'Login Gagal', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

async function logoutAdmin() {
  const result = await modernConfirmDanger('Yakin ingin mematikan Admin Mode?', 'Konfirmasi Logout', '🚪');
  if (result) {
    isAdminMode = false;
    saveToLocal('isAdminMode', false);
    lastVerifiedUnit = null;
    saveToLocal('lastVerifiedUnit', null);
    updateAdminUI();
    showSaveIndicator('✓ Admin mode dimatikan', 2000);
  }
}

function toggleAdminMode() {
  if (isAdminMode) {
    logoutAdmin();
  } else {
    loginAdmin();
  }
}

function updateAdminUI() {
  const btn = document.getElementById('btnAdminToggle');
  const floatingIcon = document.getElementById('adminFloatingIcon');
  const badge = document.getElementById('adminBadge');
  
  if (btn) {
    if (isAdminMode) {
      btn.textContent = '🚫 MATIKAN ADMIN MODE';
      btn.style.background = 'linear-gradient(to bottom, #95a5a6 0%, #7f8c8d 50%, #6c7a7a 100%)';
      btn.style.borderColor = '#6c7a7a';
    } else {
      btn.textContent = '🔐 ADMIN MODE';
      btn.style.background = 'linear-gradient(to bottom, #e74c3c 0%, #c0392b 50%, #a93226 100%)';
      btn.style.borderColor = '#a93226';
    }
  }
  
  if (floatingIcon) {
    if (isAdminMode) {
      floatingIcon.classList.remove('hidden');
    } else {
      floatingIcon.classList.add('hidden');
    }
  }
  
  if (badge) {
    if (isAdminMode) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Admin Panel Functions
function openAdminPanel() {
  document.getElementById('adminPanelModal').classList.remove('hidden');
}

function closeAdminPanel() {
  document.getElementById('adminPanelModal').classList.add('hidden');
}

function viewAllUnits() {
  closeAdminPanel();
  const units = [
    'AKMIL', 'BANDONGAN', 'BOROBUDUR', 'BOTTON', 'CANDIMULYO', 'GLAGAH', 
    'GRABAG', 'KAJORAN', 'KALIANGKRIK', 'KARANG GADING', 'KC MAGELANG',
    'KCP SHOPING', 'KRASAK', 'MAGELANG SELATAN', 'MAGELANG UTARA', 
    'MERTOYUDAN', 'NGABLAK', 'PAKIS', 'PAYAMAN', 'REJOWINANGUN', 
    'SALAMAN', 'SECANG', 'SUKARNO HATTA', 'TEGALREJO', 'TEMPURAN', 'WINDUSARI'
  ];
  modernAlert(
    `Total: ${units.length} unit\n\n${units.join(', ')}`,
    'Daftar Semua Unit',
    '📊'
  );
}

async function viewUnitPasswords() {
  closeAdminPanel();
  showSaveIndicator('🔑 Mengambil data...', 3000);
  
  try {
    const result = await callAPI('getAllUnitPasswords');
    
    if (result.success) {
      let msg = '';
      result.data.forEach(item => {
        msg += `${item.unit}: ${item.password}\n`;
      });
      modernAlert(msg, 'Password Semua Unit', '🔑');
    } else {
      modernAlert(result.message, 'Error', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

async function changeAdminPassword() {
  closeAdminPanel();
  
  const newPassword = await modernPrompt('', 'Password Admin Baru', 'Password baru...', '🔐', 'password');
  if (!newPassword) return;
  
  const confirmPassword = await modernPrompt('', 'Konfirmasi Password', 'Ketik ulang password...', '🔐', 'password');
  if (newPassword !== confirmPassword) {
    modernAlert('Password tidak cocok!', 'Error', '❌');
    return;
  }
  
  showSaveIndicator('🔐 Menyimpan password...', 3000);
  
  try {
    const result = await callAPIPost('changeAdminPassword', { newPassword });
    
    if (result.success) {
      modernAlert('Password admin berhasil diubah!', 'Sukses', '✓');
    } else {
      modernAlert('Error: ' + result.message, 'Error', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

function logoutAdminFromPanel() {
  closeAdminPanel();
  logoutAdmin();
}

// User Password Change Functions
async function openUserChangePasswordModal() {
  document.getElementById('userPasswordModal').classList.add('show');
  await loadUserUnitDropdown();
}

function closeUserChangePasswordModal() {
  document.getElementById('userPasswordModal').classList.remove('show');
  document.getElementById('selectUserUnit').value = '';
  document.getElementById('oldUserPassword').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('confirmUserPassword').value = '';
}

async function loadUserUnitDropdown() {
  try {
    const units = await callAPI('getUnits');
    const sel = document.getElementById('selectUserUnit');
    sel.innerHTML = '<option value="">-- Pilih Unit --</option>';
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      sel.appendChild(opt);
    });
  } catch (error) {
    modernAlert('Error mengambil daftar unit: ' + error.message, 'Error', '❌');
  }
}

async function submitUserPasswordChange() {
  const unit = document.getElementById('selectUserUnit').value;
  const oldPass = document.getElementById('oldUserPassword').value;
  const newPass = document.getElementById('newUserPassword').value;
  const confirmPass = document.getElementById('confirmUserPassword').value;

  if (!unit) {
    modernAlert('Pilih unit terlebih dahulu!', 'Peringatan', '⚠️');
    return;
  }

  if (!oldPass) {
    modernAlert('Masukkan password lama!', 'Peringatan', '⚠️');
    return;
  }

  if (!newPass) {
    modernAlert('Masukkan password baru!', 'Peringatan', '⚠️');
    return;
  }

  if (newPass.length < 4) {
    modernAlert('Password minimal 4 karakter!', 'Peringatan', '⚠️');
    return;
  }

  if (newPass !== confirmPass) {
    modernAlert('Password baru dan konfirmasi tidak sama!', 'Peringatan', '⚠️');
    return;
  }

  showSaveIndicator('🔑 Mengubah password...', 3000);

  try {
    const result = await callAPIPost('changeUnitPassword', { unit, oldPassword: oldPass, newPassword: newPass });
    
    if (result.success) {
      modernAlert(
        'Password unit berhasil diubah!\n\nPassword baru Anda: ' + newPass + '\n\nSilakan catat dan simpan password baru Anda.',
        'Sukses',
        '✓'
      );
      closeUserChangePasswordModal();
      
      if (lastVerifiedUnit === unit) {
        lastVerifiedUnit = null;
        saveToLocal('lastVerifiedUnit', null);
      }
    } else {
      modernAlert(result.message, 'Gagal', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

function showResetPasswordInfo() {
  const unit = document.getElementById('selectUserUnit').value;
  
  if (!unit) {
    closeUserChangePasswordModal();
    setTimeout(() => {
      modernAlert('Pilih unit Anda terlebih dahulu!', 'Peringatan', '⚠️');
    }, 100);
    return;
  }
  
  const emailSubject = encodeURIComponent(`REQUEST RESET PASSWORD - Unit ${unit}`);
  const emailBody = encodeURIComponent(
    `Kepada Admin,\n\n` +
    `Saya dari Unit: ${unit}\n` +
    `Memohon bantuan untuk reset password unit saya karena lupa password lama.\n\n` +
    `Terima kasih.\n\n` +
    `---\n` +
    `Dikirim dari Aplikasi Jadwal Kerja Satpam`
  );
  
  const emailLink = `mailto:tukangrewangwae@gmail.com?subject=${emailSubject}&body=${emailBody}`;
  
  closeUserChangePasswordModal();
  
  setTimeout(() => {
    showCustomModal({
      icon: '📧',
      title: 'Lupa Password?',
      message: 'Untuk reset password unit Anda, silakan kirim email ke:\n\ntukangrewangwae@gmail.com\n\nKlik tombol di bawah untuk membuka aplikasi email Anda.',
      buttons: [
        { text: 'Batal', className: 'modal-btn-secondary', value: false },
        { text: '📧 Kirim Email', className: 'modal-btn-primary', value: true }
      ],
      closeOnBackdrop: true
    }).then(result => {
      if (result) {
        window.location.href = emailLink;
      }
    });
  }, 300);
}

// Mode Selection - MODIFIED FOR SEPARATED PAGES
async function selectMode(mode, isRestore) {
  // Set currentMode jika belum di-set (untuk halaman terpisah, ini sudah di-set di HTML)
  if (!window.currentMode) {
    currentMode = mode;
  } else {
    currentMode = window.currentMode;
  }
  saveToLocal('currentMode', currentMode);
  
  // Untuk halaman terpisah, menu page mungkin tidak ada
  const menuPage = document.getElementById('menuPage');
  const jadwalPage = document.getElementById('jadwalPage');
  if (menuPage) menuPage.classList.add('hidden');
  if (jadwalPage) jadwalPage.classList.remove('hidden');
  
  const title = currentMode === 'PEL' ? '📋 JADWAL PELAKSANAAN' : '📤 JADWAL PENGIRIMAN';
  const titleElement = document.getElementById('pageTitle');
  if (titleElement) titleElement.textContent = title;
  
  if (isAdminMode) {
    const badge = document.getElementById('adminBadge');
    if (badge) badge.classList.remove('hidden');
  } else {
    const badge = document.getElementById('adminBadge');
    if (badge) badge.classList.add('hidden');
  }
  
  showSaveIndicator('📅 Memuat data...', 2000);
  
  try {
    const months = await callAPI('getAvailableMonths', { mode: currentMode });
    populateMonths(months);
    
    const units = await callAPI('getUnits');
    populateUnits(units);
  } catch (error) {
    modernAlert('Error memuat data: ' + error.message, 'Error', '❌');
  }
}

function backToMenu() {
  if (isEditMode) { 
    modernConfirm('Anda sedang dalam mode edit. Yakin ingin kembali?', 'Konfirmasi', '⚠️')
      .then(result => {
        if (result) {
          cancelEdit();
          doBackToMenu();
        }
      });
  } else {
    doBackToMenu();
  }
}

// MODIFIED FOR SEPARATED PAGES - kembali ke index.html
function doBackToMenu() {
  window.location.href = '../index.html';
}

function populateMonths(months) {
  const sel = document.getElementById('selectBulan');
  sel.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  months.forEach(m => { 
    const opt = document.createElement('option'); 
    opt.value = m.value; 
    opt.textContent = m.label; 
    sel.appendChild(opt); 
  });
  const savedBulan = getFromLocal('selectedBulan');
  if (savedBulan) sel.value = savedBulan;
  checkAndLoad();
}

function populateUnits(units) {
  const sel = document.getElementById('selectUnit');
  sel.innerHTML = '<option value="">-- Pilih Unit --</option>';
  units.forEach(u => { 
    const opt = document.createElement('option'); 
    opt.value = u; 
    opt.textContent = u; 
    sel.appendChild(opt); 
  });
  const savedUnit = getFromLocal('selectedUnit');
  if (savedUnit) sel.value = savedUnit;
  checkAndLoad();
}

function checkAndLoad() {
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  if (bulan && unit && (isAdminMode || lastVerifiedUnit === unit)) loadJadwal();
}

function resetTable() {
  document.getElementById('tableContainer').innerHTML = '<div class="loading">Pilih bulan dan unit untuk menampilkan jadwal</div>';
  document.getElementById('btnEditContainer').classList.add('hidden');
  document.getElementById('legendContainer').classList.add('hidden');
  document.getElementById('downloadContainer').classList.add('hidden');
  currentData = null;
}

async function onUnitChange() {
  const unit = document.getElementById('selectUnit').value;
  if (!unit) { resetTable(); return; }
  
  if (isAdminMode) { loadJadwal(); return; }
  
  if (lastVerifiedUnit === unit) { loadJadwal(); return; }
  
  const password = await modernPrompt('', `Password Unit ${unit}`, 'Masukkan password...', '🔐', 'password');
  if (!password) { 
    document.getElementById('selectUnit').value = lastVerifiedUnit || ''; 
    return; 
  }
  
  showSaveIndicator('🔐 Memverifikasi...', 3000);
  
  try {
    const result = await callAPI('verifyPassword', { unit, password });
    
    if (result.success) { 
      lastVerifiedUnit = unit; 
      saveToLocal('lastVerifiedUnit', lastVerifiedUnit); 
      showSaveIndicator('✓ Password benar', 1500);
      loadJadwal(); 
    } else { 
      modernAlert(result.message, 'Password Salah', '❌');
      document.getElementById('selectUnit').value = ''; 
      lastVerifiedUnit = null; 
      saveToLocal('lastVerifiedUnit', null); 
      resetTable(); 
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
    document.getElementById('selectUnit').value = ''; 
    lastVerifiedUnit = null; 
    saveToLocal('lastVerifiedUnit', null); 
    resetTable(); 
  }
}

async function loadJadwal() {
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  saveToLocal('selectedBulan', bulan);
  saveToLocal('selectedUnit', unit);
  
  if (!bulan || !unit) { 
    document.getElementById('tableContainer').innerHTML = '<div class="loading">Pilih bulan dan unit untuk menampilkan jadwal</div>'; 
    document.getElementById('btnEditContainer').classList.add('hidden'); 
    document.getElementById('downloadContainer').classList.add('hidden'); 
    return; 
  }
  
  document.getElementById('tableContainer').innerHTML = '<div class="loading">📊 Memuat jadwal...</div>';
  document.getElementById('btnEditContainer').classList.add('hidden');
  document.getElementById('downloadContainer').classList.add('hidden');
  
  loadHariKerja();
  
  try {
    const data = await callAPI('getJadwal', { mode: currentMode, bulan: parseInt(bulan), unit });
    displayTable(data);
  } catch (error) {
    showSaveIndicator('❌ Error: ' + error.message, 3000);
    document.getElementById('tableContainer').innerHTML = '<div class="loading">Error memuat data</div>';
  }
}

async function loadHariKerja() {
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  
  if (!bulan || !unit) {
    hariKerjaData = null;
    return;
  }
  
  try {
    const result = await callAPI('getHariKerja', { mode: currentMode, bulan: parseInt(bulan), unit });
    
    if (result.success) {
      hariKerjaData = result.data;
      if (isEditMode) {
        renderTable(isEditMode);
      }
    } else {
      hariKerjaData = null;
    }
  } catch (error) {
    console.error('Error loading hari kerja:', error);
    hariKerjaData = null;
  }
}

function renderHariKerjaBoxes(personilIndex) {
  if (!hariKerjaData || !hariKerjaData[personilIndex]) {
    return '';
  }
  
  const data = hariKerjaData[personilIndex];
  return `
    <div class="harikerja-boxes">
      <div class="harikerja-box box-hk">${data.hk || 0}</div>
      <div class="harikerja-box box-hl">${data.hl || 0}</div>
      <div class="harikerja-box box-hw">${data.hw || 0}</div>
      <div class="harikerja-box box-off">${data.off || 0}</div>
    </div>
  `;
}

// Edit Nama Modal Functions
function openEditNamaModal() {
  if (!currentData || !currentData.personil) {
    modernAlert('Data tidak tersedia', 'Error', '❌');
    return;
  }
  
  document.getElementById('editNamaModal').classList.add('show');
  renderEditNamaList();
}

function closeEditNamaModal() {
  document.getElementById('editNamaModal').classList.remove('show');
}

function renderEditNamaList() {
  const container = document.getElementById('editNamaList');
  const personil = currentData.personil;
  
  let html = '';
  personil.forEach((p, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === personil.length - 1;
    
    html += `
      <div class="edit-nama-item">
        <div class="edit-nama-no">${p.no}</div>
        <div class="edit-nama-text">${p.nama}</div>
        <div class="edit-nama-buttons">
          <button class="btn-edit-nama-action btn-edit-nama-edit" onclick="editNamaPersonil(${idx})">✏️</button>
          <button class="btn-edit-nama-action btn-edit-nama-up" onclick="movePersonilUp(${idx})" ${isFirst ? 'disabled' : ''}>↑</button>
          <button class="btn-edit-nama-action btn-edit-nama-down" onclick="movePersonilDown(${idx})" ${isLast ? 'disabled' : ''}>↓</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

async function editNamaPersonil(idx) {
  const personil = currentData.personil[idx];
  
  const newNama = await modernPrompt(
    `Edit nama personil nomor ${personil.no}:`,
    'Edit Nama',
    personil.nama,
    '✏️',
    'text'
  );
  
  if (!newNama || newNama.trim() === '') return;
  if (newNama === personil.nama) return;
  
  showSaveIndicator('💾 Menyimpan perubahan nama...', 3000);
  
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  
  try {
    const result = await callAPIPost('updatePersonilNama', {
      mode: currentMode,
      bulan: parseInt(bulan),
      unit,
      personilIndex: idx,
      newNama
    });
    
    if (result.success) {
      currentData.personil[idx].nama = newNama;
      renderEditNamaList();
      renderTable(isEditMode);
      showSaveIndicator('✓ Nama berhasil diubah', 2000);
    } else {
      modernAlert(result.message, 'Error', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

function movePersonilUp(idx) {
  if (idx === 0) return;
  movePersonil(idx, idx - 1);
}

function movePersonilDown(idx) {
  if (idx === currentData.personil.length - 1) return;
  movePersonil(idx, idx + 1);
}

async function movePersonil(fromIdx, toIdx) {
  showSaveIndicator('🔄 Memindahkan personil...', 3000);
  
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  
  try {
    const result = await callAPIPost('swapPersonilPosition', {
      mode: currentMode,
      bulan: parseInt(bulan),
      unit,
      fromIndex: fromIdx,
      toIndex: toIdx
    });
    
    if (result.success) {
      const temp = currentData.personil[fromIdx];
      currentData.personil[fromIdx] = currentData.personil[toIdx];
      currentData.personil[toIdx] = temp;
      
      currentData.personil[fromIdx].no = fromIdx + 1;
      currentData.personil[toIdx].no = toIdx + 1;
      
      renderEditNamaList();
      renderTable(isEditMode);
      showSaveIndicator('✓ Urutan berhasil diubah', 2000);
    } else {
      modernAlert(result.message, 'Error', '❌');
    }
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

function displayTable(data) {
  if (!data) { 
    document.getElementById('tableContainer').innerHTML = '<div class="loading">Data tidak ditemukan</div>'; 
    return; 
  }
  currentData = data;
  
  const wasEditing = getFromLocal('isEditMode');
  if (wasEditing) {
    isEditMode = true;
    const savedMode = getFromLocal('currentEditMode') || 'LENGKAP';
    currentEditMode = savedMode;
    
    renderTable(true);
    document.getElementById('btnEditContainer').classList.add('hidden');
    document.getElementById('legendContainer').classList.remove('hidden');
    document.getElementById('downloadContainer').classList.add('hidden');
    document.getElementById('editModePanel').classList.remove('hidden');
    document.getElementById('editActions').classList.remove('hidden');
    document.getElementById('editInfo').classList.remove('hidden');
    document.getElementById('floatingButtons').classList.remove('hidden');
    document.getElementById('selectBulan').disabled = true;
    document.getElementById('selectUnit').disabled = true;
    
    document.querySelectorAll('.btn-edit-mode').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.btn-edit-mode[data-mode="${savedMode}"]`)?.classList.add('active');
    
    updateUndoRedoButtons();
  } else {
    renderTable(false);
    document.getElementById('btnEditContainer').classList.remove('hidden');
    document.getElementById('legendContainer').classList.remove('hidden');
    document.getElementById('downloadContainer').classList.remove('hidden');
  }
}

function getEditKey(pIdx, jIdx) { 
  const bulan = document.getElementById('selectBulan').value; 
  const unit = document.getElementById('selectUnit').value; 
  return `${currentMode}_${bulan}_${unit}_${pIdx}_${jIdx}`; 
}

function updateUndoRedoButtons() { 
  document.getElementById('btnUndo').disabled = undoStack.length === 0; 
  document.getElementById('btnRedo').disabled = redoStack.length === 0; 
}

async function onDropdownChange(pIdx, jIdx, value) {
  const key = getEditKey(pIdx, jIdx);
  const oldValue = editedData.hasOwnProperty(key) ? editedData[key] : currentData.personil[pIdx].jadwal[jIdx];
  
  undoStack.push({ key, oldValue, newValue: value, pIdx, jIdx }); 
  saveToLocal('undoStack', undoStack);
  redoStack = []; 
  saveToLocal('redoStack', redoStack);
  editedData[key] = value; 
  saveToLocal('editedData', editedData);
  updateUndoRedoButtons(); 
  await autoSave(pIdx, jIdx, value);
}

async function autoSave(pIdx, jIdx, value) {
  const bulan = document.getElementById('selectBulan').value; 
  const unit = document.getElementById('selectUnit').value;
  
  showSaveIndicator('💾 Menyimpan...', 1500);
  
  try {
    await callAPIPost('saveSingleCell', {
      mode: currentMode,
      bulan: parseInt(bulan),
      unit,
      pIdx,
      jIdx,
      value
    });
    
    showSaveIndicator('✓ Tersimpan', 1500);
    await reloadHariKerjaInEditMode();
  } catch (error) {
    console.log('Auto-save error:', error);
    showSaveIndicator('❌ Gagal menyimpan', 2000);
  }
}

async function reloadHariKerjaInEditMode() {
  const bulan = document.getElementById('selectBulan').value;
  const unit = document.getElementById('selectUnit').value;
  
  if (!bulan || !unit || !isEditMode) return;
  
  try {
    const result = await callAPI('getHariKerja', { mode: currentMode, bulan: parseInt(bulan), unit });
    
    if (result.success) {
      hariKerjaData = result.data;
      updateHariKerjaBoxes();
    }
  } catch (error) {
    console.error('Error reloading hari kerja:', error);
  }
}

function updateHariKerjaBoxes() {
  if (!hariKerjaData) return;
  
  document.querySelectorAll('td.col-nama .harikerja-boxes').forEach((boxesContainer, index) => {
    if (hariKerjaData[index]) {
      const data = hariKerjaData[index];
      boxesContainer.innerHTML = `
        <div class="harikerja-box box-hk">${data.hk || 0}</div>
        <div class="harikerja-box box-hl">${data.hl || 0}</div>
        <div class="harikerja-box box-hw">${data.hw || 0}</div>
        <div class="harikerja-box box-off">${data.off || 0}</div>
      `;
    }
  });
}

async function undoChange() {
  if (undoStack.length === 0) return;
  const action = undoStack.pop(); 
  saveToLocal('undoStack', undoStack);
  redoStack.push(action); 
  saveToLocal('redoStack', redoStack);
  editedData[action.key] = action.oldValue; 
  saveToLocal('editedData', editedData);
  
  const sel = document.querySelector(`select[data-p="${action.pIdx}"][data-j="${action.jIdx}"]`);
  if (sel) sel.value = action.oldValue;
  
  updateUndoRedoButtons(); 
  await autoSave(action.pIdx, action.jIdx, action.oldValue);
}

async function redoChange() {
  if (redoStack.length === 0) return;
  const action = redoStack.pop(); 
  saveToLocal('redoStack', redoStack);
  undoStack.push(action); 
  saveToLocal('undoStack', undoStack);
  editedData[action.key] = action.newValue; 
  saveToLocal('editedData', editedData);
  
  const sel = document.querySelector(`select[data-p="${action.pIdx}"][data-j="${action.jIdx}"]`);
  if (sel) sel.value = action.newValue;
  
  updateUndoRedoButtons(); 
  await autoSave(action.pIdx, action.jIdx, action.newValue);
}

function getEditedValue(pIdx, jIdx, originalValue) { 
  const key = getEditKey(pIdx, jIdx); 
  return editedData.hasOwnProperty(key) ? editedData[key] : originalValue; 
}

function renderTable(editMode) {
  const data = currentData; 
  const weekendDays = ['SAB', 'MIN'];
  let html = '<table>';
  html += `<tr><th class="header-judul" colspan="${data.headerTanggal.length + 2}">${data.judul}</th></tr>`;
  html += '<tr class="header-unit">';
  html += `<th colspan="2" style="position:sticky;left:0;z-index:15;background:#3d6ba8;">${data.unitName}</th>`;
  data.headerHari.forEach((h, i) => { 
    const isWeekend = weekendDays.includes(h); 
    html += `<th class="col-jadwal ${isWeekend ? 'weekend-header' : ''}" style="width:12vw;min-width:12vw;max-width:12vw;">${h}</th>`; 
  });
  html += '</tr><tr>';
  html += '<th class="col-no" style="position:sticky;left:0;z-index:15;background:#4a90d9;">NO</th><th class="col-nama" style="position:sticky;left:8vw;z-index:15;background:#4a90d9;">NAMA</th>';
  data.headerTanggal.forEach((t, i) => { 
    const isWeekend = weekendDays.includes(data.headerHari[i]); 
    html += `<th class="col-jadwal ${isWeekend ? 'weekend-header' : ''}" style="width:12vw;min-width:12vw;max-width:12vw;">${t}</th>`; 
  });
  html += '</tr>';
  
  data.personil.forEach((p, pIdx) => {
    html += '<tr>';
    html += `<td class="col-no readonly" style="position:sticky;left:0;z-index:5;background:#f0f0f0;">${p.no}</td>`;
    html += `<td class="col-nama readonly" style="position:sticky;left:8vw;z-index:5;background:#f0f0f0;">
      <div class="nama-cell-content">
        <div class="nama-text">${p.nama}</div>
        ${renderHariKerjaBoxes(pIdx)}
      </div>
    </td>`;
    p.jadwal.forEach((j, jIdx) => {
      const isWeekend = weekendDays.includes(data.headerHari[jIdx]); 
      const currentValue = getEditedValue(pIdx, jIdx, j);
      
      if (editMode) {
        let optionsForThisDay;
        if (isWeekend) {
          optionsForThisDay = WEEKEND_SHIFT_OPTIONS;
        } else {
          switch (currentEditMode) {
            case 'PSM': 
              optionsForThisDay = EDIT_MODE_PSM_OPTIONS; 
              break;
            case 'P_SM': 
              optionsForThisDay = EDIT_MODE_P_SM_OPTIONS; 
              break;
            case 'LENGKAP':
            default: 
              optionsForThisDay = WEEKDAY_SHIFT_OPTIONS; 
              break;
          }
        }
        
        if (currentValue && !optionsForThisDay.includes(currentValue)) {
          optionsForThisDay = ['', currentValue, ...optionsForThisDay.slice(1)];
        }
        
        html += `<td class="col-jadwal ${isWeekend ? 'weekend' : ''}" style="width:12vw;min-width:12vw;max-width:12vw;">
          <select data-p="${pIdx}" data-j="${jIdx}" onchange="onDropdownChange(${pIdx}, ${jIdx}, this.value)">
            ${optionsForThisDay.map(o => `<option value="${o}" ${currentValue === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </td>`;
      } else {
        html += `<td class="col-jadwal ${isWeekend ? 'weekend' : ''}" style="width:12vw;min-width:12vw;max-width:12vw;">${currentValue}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</table>';
  
  document.getElementById('tableContainer').innerHTML = html;
  document.getElementById('tableContainer').classList.toggle('edit-mode', editMode);
}

function toggleEditMode() {
  isEditMode = true;
  currentEditMode = 'LENGKAP';
  saveToLocal('currentEditMode', currentEditMode);
  
  if (!originalData) {
    originalData = JSON.parse(JSON.stringify(currentData));
    saveToLocal('originalData', originalData);
  }
  saveToLocal('isEditMode', true);
  
  renderTable(true);
  document.getElementById('btnEditContainer').classList.add('hidden');
  document.getElementById('legendContainer').classList.remove('hidden');
  document.getElementById('downloadContainer').classList.add('hidden');
  document.getElementById('editModePanel').classList.remove('hidden');
  document.getElementById('editActions').classList.remove('hidden');
  if (isAdminMode) {
    document.getElementById('editNamaContainer').classList.remove('hidden');
  }
  document.getElementById('editInfo').classList.remove('hidden');
  document.getElementById('floatingButtons').classList.remove('hidden');
  document.getElementById('selectBulan').disabled = true;
  document.getElementById('selectUnit').disabled = true;
  
  document.querySelectorAll('.btn-edit-mode').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.btn-edit-mode[data-mode="LENGKAP"]')?.classList.add('active');
  
  updateUndoRedoButtons();
  showSaveIndicator('✏️ Mode edit aktif', 2000);
}

async function setEditMode(mode) {
  if (currentEditMode === mode) return;
  
  const modeNames = {
    'PSM': 'Mode P, S, M',
    'LENGKAP': 'Mode Lengkap',
    'P_SM': 'Mode P, SM'
  };
  
  const result = await modernConfirm(
    `Dropdown akan berubah sesuai mode ini untuk semua hari kerja (bukan weekend).\n\nCatatan: Data yang sudah ada TETAP TAMPIL meskipun tidak ada di opsi dropdown mode ini.`,
    `Ganti ke ${modeNames[mode]}?`,
    '🔄'
  );
  
  if (!result) return;
  
  currentEditMode = mode;
  saveToLocal('currentEditMode', mode);
  
  document.querySelectorAll('.btn-edit-mode').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.btn-edit-mode[data-mode="${mode}"]`)?.classList.add('active');
  
  renderTable(true);
  showSaveIndicator(`✓ ${modeNames[mode]} aktif`, 2000);
}

async function cancelEdit() {
  const bulan = document.getElementById('selectBulan').value; 
  const unit = document.getElementById('selectUnit').value;
  
  if (originalData && originalData.personil) {
    document.getElementById('tableContainer').innerHTML = '<div class="loading">⏳ Membatalkan perubahan...</div>';
    const jadwalData = originalData.personil.map(p => ({ jadwal: p.jadwal }));
    
    showSaveIndicator('⏳ Membatalkan...', 3000);
    
    try {
      await callAPIPost('saveJadwal', {
        mode: currentMode,
        bulan: parseInt(bulan),
        unit,
        jadwalData
      });
      finishCancel(bulan, unit);
    } catch (error) {
      showSaveIndicator('❌ Error rollback: ' + error.message, 3000);
      finishCancel(bulan, unit); 
    }
  } else { 
    finishCancel(bulan, unit); 
  }
}

function finishCancel(bulan, unit) {
  isEditMode = false; 
  currentEditMode = 'LENGKAP';
  saveToLocal('isEditMode', false);
  saveToLocal('currentEditMode', 'LENGKAP');
  
  const prefix = `${currentMode}_${bulan}_${unit}_`;
  Object.keys(editedData).forEach(key => { 
    if (key.startsWith(prefix)) delete editedData[key]; 
  });
  saveToLocal('editedData', editedData);
  
  undoStack = []; 
  redoStack = []; 
  saveToLocal('undoStack', undoStack); 
  saveToLocal('redoStack', redoStack);
  
  originalData = null; 
  saveToLocal('originalData', null);
  
  document.getElementById('btnEditContainer').classList.remove('hidden');
  document.getElementById('legendContainer').classList.remove('hidden');
  document.getElementById('downloadContainer').classList.remove('hidden');
  document.getElementById('editModePanel').classList.add('hidden');
  document.getElementById('editActions').classList.add('hidden');
  document.getElementById('editInfo').classList.add('hidden');
  document.getElementById('floatingButtons').classList.add('hidden');
  document.getElementById('editNamaContainer').classList.add('hidden');
  document.getElementById('selectBulan').disabled = false;
  document.getElementById('selectUnit').disabled = false;
  
  document.querySelectorAll('.btn-edit-mode').forEach(btn => btn.classList.remove('active'));
  
  showSaveIndicator('✓ Perubahan dibatalkan', 2000);
  loadJadwal();
}

function saveChanges() {
  const bulan = document.getElementById('selectBulan').value; 
  const unit = document.getElementById('selectUnit').value;
  
  const prefix = `${currentMode}_${bulan}_${unit}_`;
  Object.keys(editedData).forEach(key => { 
    if (key.startsWith(prefix)) delete editedData[key]; 
  });
  saveToLocal('editedData', editedData); 
  saveToLocal('isEditMode', false);
  
  undoStack = []; 
  redoStack = []; 
  saveToLocal('undoStack', undoStack); 
  saveToLocal('redoStack', redoStack);
  
  originalData = null; 
  saveToLocal('originalData', null);
  
  isEditMode = false;
  currentEditMode = 'LENGKAP';
  saveToLocal('currentEditMode', 'LENGKAP');
  
  document.getElementById('btnEditContainer').classList.remove('hidden');
  document.getElementById('legendContainer').classList.remove('hidden');
  document.getElementById('downloadContainer').classList.remove('hidden');
  document.getElementById('editModePanel').classList.add('hidden');
  document.getElementById('editActions').classList.add('hidden');
  document.getElementById('editNamaContainer').classList.add('hidden');
  document.getElementById('editInfo').classList.add('hidden');
  document.getElementById('floatingButtons').classList.add('hidden');
  document.getElementById('selectBulan').disabled = false;
  document.getElementById('selectUnit').disabled = false;
  
  document.querySelectorAll('.btn-edit-mode').forEach(btn => btn.classList.remove('active'));
  
  showSaveIndicator('✓ Jadwal berhasil disimpan!', 2500);
  loadJadwal();
}

// Download Functions
function downloadPNG() {
  const table = document.querySelector('#tableContainer table');
  if (!table) {
    modernAlert('Tidak ada tabel untuk diunduh', 'Perhatian', '⚠️');
    return;
  }
  
  const bulan = document.getElementById('selectBulan'); 
  const unit = document.getElementById('selectUnit');
  const modeText = currentMode === 'PEL' ? 'Pelaksanaan' : 'Pengiriman';
  const filename = `Jadwal_${modeText}_${unit.options[unit.selectedIndex].text}_${bulan.options[bulan.selectedIndex].text}`;
  
  showSaveIndicator('📷 Membuat gambar...', 3000);
  
  const container = document.getElementById('tableContainer');
  const originalScrollTop = container.scrollTop;
  const originalScrollLeft = container.scrollLeft;
  const stickyElements = table.querySelectorAll('th, td[style*="sticky"]');
  const originalStyles = [];
  
  stickyElements.forEach(el => {
    originalStyles.push({
      element: el,
      position: el.style.position,
      top: el.style.top,
      left: el.style.left,
      zIndex: el.style.zIndex
    });
    el.style.position = 'relative';
    el.style.top = 'auto';
    el.style.left = 'auto';
  });
  
  container.scrollTop = 0;
  container.scrollLeft = 0;
  
  setTimeout(() => {
    html2canvas(table, { 
      scale: 2, 
      useCORS: true,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX
    }).then(canvas => {
      const link = document.createElement('a'); 
      link.download = filename + '.png'; 
      link.href = canvas.toDataURL('image/png'); 
      link.click();
      showSaveIndicator('✓ PNG berhasil diunduh', 2000);
    }).catch(e => {
      modernAlert('Gagal membuat PNG: ' + e.message, 'Error', '❌');
    }).finally(() => {
      originalStyles.forEach(style => {
        style.element.style.position = style.position;
        style.element.style.top = style.top;
        style.element.style.left = style.left;
        style.element.style.zIndex = style.zIndex;
      });
      container.scrollTop = originalScrollTop;
      container.scrollLeft = originalScrollLeft;
    });
  }, 100);
}

async function downloadExcel() {
  const bulan = document.getElementById('selectBulan'); 
  const unit = document.getElementById('selectUnit');
  const modeText = currentMode === 'PEL' ? 'Pelaksanaan' : 'Pengiriman';
  const filename = `Jadwal_${modeText}_${unit.options[unit.selectedIndex].text}_${bulan.options[bulan.selectedIndex].text}`;
  
  showSaveIndicator('📊 Membuat Excel...', 3000);
  
  try {
    const data = await callAPI('getExcelData', {
      mode: currentMode,
      bulan: parseInt(bulan.value),
      unit: unit.value
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data); 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal'); 
    XLSX.writeFile(wb, filename + '.xlsx');
    showSaveIndicator('✓ Excel berhasil diunduh', 2000);
  } catch (error) {
    modernAlert('Error: ' + error.message, 'Error', '❌');
  }
}

function downloadPDF() {
  const table = document.querySelector('#tableContainer table');
  if (!table) {
    modernAlert('Tidak ada tabel untuk diunduh', 'Perhatian', '⚠️');
    return;
  }
  
  const bulan = document.getElementById('selectBulan'); 
  const unit = document.getElementById('selectUnit');
  const modeText = currentMode === 'PEL' ? 'Pelaksanaan' : 'Pengiriman';
  const filename = `Jadwal_${modeText}_${unit.options[unit.selectedIndex].text}_${bulan.options[bulan.selectedIndex].text}`;
  
  showSaveIndicator('📄 Membuat PDF...', 3000);
  
  const container = document.getElementById('tableContainer');
  const originalScrollTop = container.scrollTop;
  const originalScrollLeft = container.scrollLeft;
  const stickyElements = table.querySelectorAll('th, td[style*="sticky"]');
  const originalStyles = [];
  
  stickyElements.forEach(el => {
    originalStyles.push({
      element: el,
      position: el.style.position,
      top: el.style.top,
      left: el.style.left,
      zIndex: el.style.zIndex
    });
    el.style.position = 'relative';
    el.style.top = 'auto';
    el.style.left = 'auto';
  });
  
  container.scrollTop = 0;
  container.scrollLeft = 0;
  
  setTimeout(() => {
    html2canvas(table, { 
      scale: 1.5,
      useCORS: true,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight > pageHeight - 20) {
        let heightLeft = imgHeight;
        let position = 10;
        
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
      }
      
      pdf.save(filename + '.pdf');
      showSaveIndicator('✓ PDF berhasil diunduh', 2000);
    }).catch(e => {
      modernAlert('Gagal membuat PDF: ' + e.message, 'Error', '❌');
    }).finally(() => {
      originalStyles.forEach(style => {
        style.element.style.position = style.position;
        style.element.style.top = style.top;
        style.element.style.left = style.left;
        style.element.style.zIndex = style.zIndex;
      });
      container.scrollTop = originalScrollTop;
      container.scrollLeft = originalScrollLeft;
    });
  }, 100);
}
