# Survey PJU UP3 Bima

Aplikasi pemeriksaan PJU berbasis Google Apps Script.

## Arsitektur
- GitHub: source code
- Google Apps Script: runtime / Web App
- Google Sheets: database
- Google Drive: penyimpanan foto

## File
- `Code.gs` - backend Apps Script
- `Index.html` - aplikasi pemeriksaan petugas
- `Dashboard.html` - dashboard

## Konfigurasi
Spreadsheet ID: `14lG84oTJGXkK5r1Fu4TbETSfQNF3G-2j`
Legacy Sheet GID: `786318515`

## Instalasi
1. Buka spreadsheet target.
2. Extensions > Apps Script.
3. Salin `Code.gs`, `Index.html`, dan `Dashboard.html` dari repository ke project Apps Script.
4. Simpan.
5. Jalankan `setupPJU()` dan berikan izin.
6. Jalankan `importLegacyToMaster()` untuk mengimpor database PJU lama.
7. Isi sheet `PETUGAS`.
8. Deploy sebagai Web app.

GitHub berfungsi sebagai repositori source code; Apps Script tetap menjadi tempat eksekusi aplikasi.
