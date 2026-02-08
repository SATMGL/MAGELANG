# 🧪 API Testing Guide

Panduan untuk testing Apps Script API sebelum deploy frontend.

## 📋 Available API Endpoints

### 1. Get Units
**Action:** `getUnits`
**Method:** GET
**Response:** Array of unit names

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getUnits
```

**Expected Response:**
```json
[
  "AKMIL",
  "BANDONGAN",
  "BOROBUDUR",
  ...
]
```

---

### 2. Get Available Months
**Action:** `getAvailableMonths`
**Method:** GET
**Parameters:**
- `mode` (required): "PEL" or "PEN"

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAvailableMonths&mode=PEL
```

**Expected Response:**
```json
[
  { "value": 1, "label": "JANUARI" },
  { "value": 2, "label": "FEBRUARI" },
  ...
]
```

---

### 3. Get Jadwal
**Action:** `getJadwal`
**Method:** GET
**Parameters:**
- `mode` (required): "PEL" or "PEN"
- `bulan` (required): 1-12
- `unit` (required): Unit name

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getJadwal&mode=PEL&bulan=1&unit=KC%20MAGELANG
```

**Expected Response:**
```json
{
  "judul": "JADWAL PELAKSANAAN KERJA SATPAM",
  "unitName": "KC MAGELANG",
  "headerHari": ["SEN", "SEL", ...],
  "headerTanggal": [1, 2, 3, ...],
  "personil": [
    {
      "no": 1,
      "nama": "NAMA PERSONIL",
      "jadwal": ["P", "S", "M", ...]
    }
  ]
}
```

---

### 4. Verify Password
**Action:** `verifyPassword`
**Method:** GET
**Parameters:**
- `unit` (required): Unit name
- `password` (required): Unit password

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=verifyPassword&unit=KC%20MAGELANG&password=1234
```

**Expected Response (Success):**
```json
{
  "success": true
}
```

**Expected Response (Failed):**
```json
{
  "success": false,
  "message": "Password salah"
}
```

---

### 5. Verify Admin Password
**Action:** `verifyAdminPassword`
**Method:** GET
**Parameters:**
- `password` (required): Admin password

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=verifyAdminPassword&password=adminpass
```

**Expected Response:**
```json
{
  "success": true
}
```

---

### 6. Get Hari Kerja
**Action:** `getHariKerja`
**Method:** GET
**Parameters:**
- `mode` (required): "PEL" or "PEN"
- `bulan` (required): 1-12
- `unit` (required): Unit name

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getHariKerja&mode=PEL&bulan=1&unit=KC%20MAGELANG
```

**Expected Response:**
```json
{
  "success": true,
  "unitName": "KC MAGELANG",
  "mode": "PEL",
  "bulan": 1,
  "data": [
    {
      "no": 1,
      "nama": "NAMA PERSONIL",
      "hk": 15,
      "hl": 5,
      "hw": 2,
      "off": 9
    }
  ]
}
```

---

### 7. Save Single Cell (POST)
**Action:** `saveSingleCell`
**Method:** POST
**Body:**
```json
{
  "action": "saveSingleCell",
  "mode": "PEL",
  "bulan": 1,
  "unit": "KC MAGELANG",
  "pIdx": 0,
  "jIdx": 0,
  "value": "P"
}
```

**How to Test with curl:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "action": "saveSingleCell",
    "mode": "PEL",
    "bulan": 1,
    "unit": "KC MAGELANG",
    "pIdx": 0,
    "jIdx": 0,
    "value": "P"
  }' \
  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Expected Response:**
```json
{
  "success": true
}
```

---

### 8. Update Personil Nama (POST)
**Action:** `updatePersonilNama`
**Method:** POST
**Body:**
```json
{
  "action": "updatePersonilNama",
  "mode": "PEL",
  "bulan": 1,
  "unit": "KC MAGELANG",
  "personilIndex": 0,
  "newNama": "NAMA BARU"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Nama berhasil diubah di X sheet"
}
```

---

### 9. Swap Personil Position (POST)
**Action:** `swapPersonilPosition`
**Method:** POST
**Body:**
```json
{
  "action": "swapPersonilPosition",
  "mode": "PEL",
  "bulan": 1,
  "unit": "KC MAGELANG",
  "fromIndex": 0,
  "toIndex": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Posisi berhasil ditukar di X sheet"
}
```

---

### 10. Change Unit Password (POST)
**Action:** `changeUnitPassword`
**Method:** POST
**Body:**
```json
{
  "action": "changeUnitPassword",
  "unit": "KC MAGELANG",
  "oldPassword": "1234",
  "newPassword": "5678"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password berhasil diubah!"
}
```

---

### 11. Get All Unit Passwords (Admin Only)
**Action:** `getAllUnitPasswords`
**Method:** GET

**Test URL:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAllUnitPasswords
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    { "unit": "AKMIL", "password": "1234" },
    { "unit": "BANDONGAN", "password": "5678" }
  ]
}
```

---

## 🧪 Testing Checklist

### Pre-Deployment Tests:

- [ ] Test `getUnits` - Should return array of units
- [ ] Test `getAvailableMonths` for PEL mode
- [ ] Test `getAvailableMonths` for PEN mode
- [ ] Test `getJadwal` with valid unit
- [ ] Test `verifyPassword` with correct password
- [ ] Test `verifyPassword` with wrong password
- [ ] Test `verifyAdminPassword` with correct password
- [ ] Test `getHariKerja`
- [ ] Test `saveSingleCell` (POST)
- [ ] Test API when deployment is "Anyone" accessible

### Post-Deployment Tests (Frontend):

- [ ] Can select mode (PEL/PEN)
- [ ] Can select month from dropdown
- [ ] Can select unit from dropdown
- [ ] Password prompt appears
- [ ] Correct password allows access
- [ ] Wrong password shows error
- [ ] Jadwal displays correctly
- [ ] Edit mode works
- [ ] Autosave works
- [ ] Undo/Redo works
- [ ] Download PNG works
- [ ] Download Excel works
- [ ] Download PDF works
- [ ] Admin mode login works
- [ ] View all units (admin) works
- [ ] View passwords (admin) works
- [ ] Change admin password works
- [ ] Edit nama personil works (admin)
- [ ] Swap position works (admin)
- [ ] Change unit password works

---

## 🐛 Common Errors

### Error: "Script function not found"
**Cause:** Function name misspelled or not deployed
**Fix:** Redeploy Apps Script

### Error: "Authorization required"
**Cause:** Deployment not set to "Anyone"
**Fix:** Deploy → Manage → Edit → Who has access → Anyone

### Error: "Exception: Service invoked too many times"
**Cause:** Rate limiting
**Fix:** Wait a few minutes, optimize API calls

### Error: "Timeout"
**Cause:** Slow Google Sheets response
**Fix:** Increase `API_TIMEOUT` in config.js

### Error: "Cannot read property..."
**Cause:** Data structure mismatch
**Fix:** Check Google Sheets column structure

---

## 📊 Performance Tips

1. **Minimize API Calls:**
   - Cache results in localStorage when possible
   - Batch operations when possible

2. **Optimize Google Sheets:**
   - Remove unused formulas
   - Use values instead of formulas where possible
   - Keep sheets clean

3. **Monitor Usage:**
   - Apps Script has daily quotas
   - Check quotas at: https://script.google.com/home/executions

---

## 🔒 Security Best Practices

1. **Never commit actual passwords** to Git
2. **Use environment-specific configs** if needed
3. **Monitor Apps Script executions** regularly
4. **Rotate passwords** periodically
5. **Backup Google Sheets** regularly

---

**Last Updated:** 2024
**API Version:** 1.0.0
