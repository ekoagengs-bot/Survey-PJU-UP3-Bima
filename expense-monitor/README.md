# MoniKas — Pemantauan Pengeluaran

Web app/PWA ringan untuk mencatat dan memantau pengeluaran serta pendapatan.

## Fitur
- Dashboard saldo, pendapatan, pengeluaran, dan jumlah transaksi.
- Tambah transaksi pengeluaran/pendapatan.
- Filter dan pencarian transaksi.
- Anggaran per kategori dengan progress penggunaan.
- Laporan kategori dan rasio pengeluaran terhadap pendapatan.
- Ekspor seluruh data ke JSON.
- Responsive untuk Android/desktop.
- Offline/PWA menggunakan Service Worker.

## Penyimpanan data
Versi awal memakai `localStorage` browser. Jadi data tersimpan pada perangkat/browser yang digunakan dan belum tersinkron antar perangkat.

## Deploy GitHub Pages
Workflow `.github/workflows/expense-pages.yml` disiapkan untuk menerbitkan folder `expense-monitor`. Setelah branch `expense-monitor` dipush, buka pengaturan repository > Pages dan pastikan deployment menggunakan GitHub Actions.

## Pengembangan berikutnya
Untuk pemakaian bersama atau sinkron antar HP/PC, sambungkan form ke backend seperti Supabase/Firebase dan tambahkan autentikasi pengguna.
