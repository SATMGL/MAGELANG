// ========================================
// KONFIGURASI API
// ========================================

// URL Google Apps Script Web App Anda
const API_URL = 'https://script.google.com/macros/s/AKfycbw2QJSnb4DaWQ16tzipgHATXoQxEWuCyjCeW8l1-LInvwD-SbYC2KFL2EaY2DqYbuyWQg/exec';

// ========================================
// FUNGSI HELPER UNTUK FETCH API
// ========================================

/**
 * Fungsi untuk memanggil API Google Apps Script
 * @param {string} action - Nama action/fungsi yang akan dipanggil
 * @param {object} params - Parameter yang akan dikirim
 * @returns {Promise} - Promise yang resolve dengan response data
 */
async function callAPI(action, params = {}) {
  try {
    const payload = {
      action: action,
      ...params
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// FUNGSI-FUNGSI API SPESIFIK
// ========================================

/**
 * Mendapatkan daftar bulan yang tersedia
 */
async function apiGetAvailableMonths(mode) {
  return await callAPI('getAvailableMonths', { mode });
}

/**
 * Mendapatkan daftar unit
 */
async function apiGetUnits() {
  return await callAPI('getUnits');
}

/**
 * Mendapatkan data jadwal
 */
async function apiGetJadwal(mode, bulan, unit) {
  return await callAPI('getJadwal', { mode, bulan, unit });
}

/**
 * Menyimpan jadwal lengkap
 */
async function apiSaveJadwal(mode, bulan, unit, jadwalData) {
  return await callAPI('saveJadwal', { mode, bulan, unit, jadwalData });
}

/**
 * Menyimpan single cell (auto-save)
 */
async function apiSaveSingleCell(mode, bulan, unit, pIdx, jIdx, value) {
  return await callAPI('saveSingleCell', { mode, bulan, unit, pIdx, jIdx, value });
}

/**
 * Mendapatkan data untuk Excel
 */
async function apiGetExcelData(mode, bulan, unit) {
  return await callAPI('getExcelData', { mode, bulan, unit });
}

/**
 * Verifikasi password unit
 */
async function apiVerifyPassword(unit, password) {
  return await callAPI('verifyPassword', { unit, password });
}

/**
 * Verifikasi password admin
 */
async function apiVerifyAdminPassword(password) {
  return await callAPI('verifyAdminPassword', { password });
}

/**
 * Mendapatkan semua password unit (admin only)
 */
async function apiGetAllUnitPasswords() {
  return await callAPI('getAllUnitPasswords');
}

/**
 * Mengubah password admin
 */
async function apiChangeAdminPassword(newPassword) {
  return await callAPI('changeAdminPassword', { newPassword });
}

/**
 * Mendapatkan data hari kerja
 */
async function apiGetHariKerja(mode, bulan, unit) {
  return await callAPI('getHariKerja', { mode, bulan, unit });
}

/**
 * Update nama personil
 */
async function apiUpdatePersonilNama(mode, bulan, unit, personilIndex, newNama) {
  return await callAPI('updatePersonilNama', { mode, bulan, unit, personilIndex, newNama });
}

/**
 * Swap posisi personil
 */
async function apiSwapPersonilPosition(mode, bulan, unit, fromIndex, toIndex) {
  return await callAPI('swapPersonilPosition', { mode, bulan, unit, fromIndex, toIndex });
}

/**
 * Ubah password unit
 */
async function apiChangeUnitPassword(unit, oldPassword, newPassword) {
  return await callAPI('changeUnitPassword', { unit, oldPassword, newPassword });
}
