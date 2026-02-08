# 📅 Jadwal Kerja Satpam - Migrasi ke GitHub Pages

Aplikasi jadwal kerja satpam yang sudah dimigrasi dari Apps Script murni menjadi aplikasi standalone yang bisa di-host di GitHub Pages dengan tetap terhubung ke Google Sheets melalui Apps Script API.

## 🏗️ Arsitektur Aplikasi

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│  GitHub Pages   │  ◄────►  │  Apps Script API │  ◄────►  │  Google Sheets  │
│  (Frontend)     │   HTTPS  │    (Backend)     │   Data   │   (Database)    │
└─────────────────┘          └──────────────────┘          └─────────────────┘
```

## 📦 File Structure

```
jadwal-satpam/
├── index.html       # Main HTML file
├── config.js        # Configuration (API URL)
├── app.js           # Main JavaScript
├── Code.gs          # Apps Script backend (deploy di Google)
└── README.md        # This file
```

## 🚀 Langkah Deploy - LENGKAP

### STEP 1: Setup Apps Script Backend

1. **Buka Google Sheets** yang berisi data jadwal satpam Anda

2. **Buka Apps Script Editor**:
   - Klik **Extensions** → **Apps Script**

3. **Hapus** semua kode yang ada di `Code.gs`

4. **Copy-paste** kode dari file `Code.gs` yang saya berikan

5. **Deploy sebagai Web App**:
   - Klik **Deploy** → **New deployment**
   - Di "Select type", pilih **Web app**
   - Isi konfigurasi:
     - **Description**: Jadwal Satpam API v1.0
     - **Execute as**: Me (your_email@gmail.com)
     - **Who has access**: **Anyone** ⚠️ PENTING!
   - Klik **Deploy**

6. **Copy URL Deployment**:
   - Setelah deploy, akan muncul URL seperti:
   ```
   https://script.google.com/macros/s/AKfycby...xxxxx.../exec
   ```
   - **COPY URL INI** - Anda akan butuh di step berikutnya

7. **Test API** (Optional):
   - Buka URL deployment di browser
   - Tambahkan `?action=getUnits` di akhir URL
   - Jika berhasil, akan muncul JSON list unit

### STEP 2: Setup Frontend di GitHub Pages

1. **Buat Repository Baru** di GitHub:
   - Nama repository: `jadwal-satpam` (atau terserah Anda)
   - Public repository
   - Jangan centang "Add README"

2. **Upload Files**:
   - Upload semua file: `index.html`, `config.js`, `app.js`
   - **JANGAN upload** `Code.gs` (itu khusus Apps Script)

3. **Edit `config.js`**:
   - Buka file `config.js` di GitHub
   - Klik tombol **Edit** (icon pensil)
   - Ganti bagian ini:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec',
   ```
   Dengan URL deployment Apps Script Anda (dari STEP 1 nomor 6)
   
   - Klik **Commit changes**

4. **Aktifkan GitHub Pages**:
   - Buka **Settings** repository
   - Scroll ke bagian **Pages** (di sidebar kiri)
   - Di **Source**, pilih **main** branch
   - Klik **Save**

5. **Akses Aplikasi**:
   - Tunggu 1-2 menit
   - URL aplikasi Anda:
   ```
   https://USERNAME.github.io/jadwal-satpam/
   ```
   (Ganti USERNAME dengan username GitHub Anda)

### STEP 3: Verifikasi & Testing

1. **Buka URL GitHub Pages** Anda di browser

2. **Test Fitur Dasar**:
   - Pilih mode (PEL/PEN)
   - Pilih bulan
   - Pilih unit
   - Masukkan password unit
   - Jadwal harus tampil

3. **Test Admin Mode**:
   - Klik tombol ADMIN MODE
   - Masukkan password admin
   - Coba lihat semua password unit

4. **Test Edit Mode**:
   - Login sebagai unit
   - Klik EDIT JADWAL
   - Ubah beberapa shift
   - Verifikasi perubahan tersimpan di Google Sheets

## ⚙️ Konfigurasi

### File config.js

```javascript
const CONFIG = {
  // URL Apps Script deployment
  API_URL: 'https://script.google.com/macros/s/YOUR_ID/exec',
  
  // Timeout settings (jangan ubah kecuali perlu)
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
};
```

### Cara Update URL API:

**Method 1: Edit di GitHub**
1. Buka file `config.js` di GitHub
2. Klik icon pensil (Edit)
3. Ganti URL
4. Commit changes
5. Tunggu 1-2 menit untuk update

**Method 2: Git (jika pakai Git di local)**
```bash
# Edit config.js locally
nano config.js  # atau text editor lain

# Commit & push
git add config.js
git commit -m "Update API URL"
git push origin main
```

## 🔧 Troubleshooting

### ❌ Problem: "API URL belum dikonfigurasi"

**Solusi:**
- Edit `config.js`
- Ganti `YOUR_DEPLOYMENT_ID` dengan ID deployment Anda
- Format harus: `https://script.google.com/macros/s/[ID]/exec`

### ❌ Problem: Data tidak muncul / Error 403

**Penyebab:** Apps Script deployment tidak set "Anyone"

**Solusi:**
1. Buka Apps Script editor
2. Deploy → Manage deployments
3. Edit deployment yang aktif
4. Ubah "Who has access" menjadi **Anyone**
5. Deploy ulang

### ❌ Problem: CORS Error di console

**Penyebab:** Browser blocking request

**Solusi:** 
- Aplikasi sudah menggunakan workaround untuk CORS
- Pastikan Apps Script di-deploy dengan akses "Anyone"
- Clear browser cache
- Coba browser lain (Chrome/Firefox recommended)

### ❌ Problem: Password tidak diterima

**Penyebab:** Sheet SETTING tidak ditemukan

**Solusi:**
- Pastikan Google Sheets punya sheet bernama "SETTING"
- Pastikan format password di kolom C sesuai

### ❌ Problem: Edit tidak tersimpan

**Penyebab:** Network error atau timeout

**Solusi:**
- Refresh halaman
- Cek koneksi internet
- Lihat console (F12) untuk error detail

## 📱 Mobile Optimization

Aplikasi sudah responsive untuk mobile:
- Touch-friendly buttons
- Swipe untuk scroll tabel
- Zoom disabled untuk prevent accidental zoom
- Bottom navigation placement

## 🔐 Security Notes

⚠️ **PENTING:**

1. **URL API** di `config.js` visible di source code
   - Ini normal untuk static sites
   - Apps Script deployment HARUS public

2. **Password Protection**:
   - Password unit tetap aman (stored di Google Sheets)
   - Admin password tetap aman
   - User harus input password untuk akses

3. **Data Protection**:
   - Semua data tetap di Google Sheets
   - Frontend hanya komunikasi via API
   - No data cached di browser (kecuali localStorage)

## 🔄 Update Aplikasi

### Update Frontend (HTML/CSS/JS):
1. Edit file di GitHub atau local
2. Commit & push
3. GitHub Pages auto-deploy (1-2 menit)

### Update Backend (Apps Script):
1. Edit `Code.gs` di Apps Script editor
2. **Deploy** → **New deployment**
3. Copy URL deployment yang baru
4. Update `API_URL` di `config.js`
5. Commit `config.js`

**ATAU** deploy di deployment yang sama:
1. **Deploy** → **Manage deployments**
2. Click icon ⚙️ di deployment aktif
3. **Version**: New version
4. **Deploy** (URL tetap sama, tidak perlu update config)

## 📊 Fitur Aplikasi

✅ Fitur yang berfungsi penuh:
- View jadwal (PEL & PEN mode)
- Edit jadwal dengan autosave
- Edit nama personil (Admin only)
- Swap posisi personil (Admin only)
- Undo/Redo changes
- Download PNG/Excel/PDF
- Password protection per-unit
- Admin mode
- Change password (unit & admin)
- Multi-edit mode (PSM, Lengkap, P_SM)
- Hari kerja tracking (HK, HL, HW, OFF)

## 🌐 Custom Domain (Optional)

Jika ingin domain sendiri (misal: jadwal.perusahaan.com):

1. **Beli domain** (di Namecheap, GoDaddy, dll)
2. **Setup DNS**:
   - Add CNAME record:
     ```
     jadwal -> USERNAME.github.io
     ```
3. **GitHub Settings**:
   - Pages → Custom domain
   - Masukkan domain Anda
   - Save
4. **Enable HTTPS** (otomatis setelah 24 jam)

## 📞 Support

Jika ada masalah:
1. Check console browser (F12 → Console tab)
2. Check network tab untuk lihat API calls
3. Verify Apps Script deployment masih aktif
4. Test API URL langsung di browser

## 📝 License

Private use untuk perusahaan satpam.

---

**Deployment Date:** 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready
