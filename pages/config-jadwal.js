// ===================================
// CONFIGURATION FILE - JADWAL KERJA
// ===================================

// INSTRUKSI SETUP:
// 1. Deploy Apps Script sebagai Web App
// 2. Copy URL deployment
// 3. Paste URL tersebut di bawah ini
// 4. Format URL: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec

const CONFIG = {
  // ✅ URL DEPLOYMENT APPS SCRIPT - SUDAH DIKONFIGURASI
  API_URL: 'https://script.google.com/macros/s/AKfycbz3n1SqRhZ8oeW6SEekoyjYf8mmjhn-lvvMfS03WzvoyPSuKyF7nwYcxlkk-FCTok8OYw/exec',
  
  // Jangan ubah setting di bawah ini kecuali Anda tahu apa yang Anda lakukan
  API_TIMEOUT: 30000, // 30 detik
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000 // 1 detik
};

// Validasi konfigurasi saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    showConfigWarning();
  }
});

function showConfigWarning() {
  const indicator = document.getElementById('configIndicator');
  if (indicator) {
    indicator.style.display = 'block';
  }
}

function hideConfigWarning() {
  const indicator = document.getElementById('configIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

function openConfigModal() {
  showCustomModal({
    icon: '⚙️',
    title: 'Konfigurasi Aplikasi',
    message: `URL API saat ini:\n${CONFIG.API_URL}\n\nUntuk mengubah URL API:\n1. Edit file config-jadwal.js\n2. Ganti API_URL dengan URL deployment Apps Script Anda\n3. Save dan refresh halaman`,
    buttons: [
      { text: 'OK', className: 'modal-btn-primary', value: true }
    ],
    closeOnBackdrop: true
  });
}
