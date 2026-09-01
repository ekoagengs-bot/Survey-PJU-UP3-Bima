/* PJU Inspection System - source uploaded from the prepared package. */

const CFG = {
  SPREADSHEET_ID: '14lG84oTJGXkK5r1Fu4TbETSfQNF3G-2j',
  LEGACY_SHEET_GID: 786318515,
  DATA_SHEET: 'PEMERIKSAAN_PJU',
  MASTER_SHEET: 'MASTER_PJU',
  PETUGAS_SHEET: 'PETUGAS',
  DASHBOARD_SHEET: 'DASHBOARD_PJU',
  DRIVE_ROOT: 'PJU - DOKUMENTASI',
  TZ: 'Asia/Makassar',
  PUBLIC_PHOTO_LINK: false
};

const DATA_HEADERS = [
  'ID PEMERIKSAAN','TIMESTAMP','TANGGAL','JAM','PETUGAS','UNIT','ALAMAT','GARDU','TIANG',
  'JENIS LAMPU','DAYA LAMPU 1','DAYA LAMPU 2','DAYA LAMPU 3','DAYA LAMPU 4','DAYA LAMPU 5',
  'FOTO UTAMA','FOTO PANEL','FOTO PERBAIKAN','KOORDINAT','GOOGLE MAPS','KONDISI LAMPU','KONDISI ARMATUR',
  'KONDISI TIANG','KONDISI KABEL','KONDISI GARDU','STATUS PJU','TEMUAN','TINDAK LANJUT','PRIORITAS',
  'STATUS PEKERJAAN','KETERANGAN','FOLDER FOTO'
];

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'index';
  const file = page.toLowerCase() === 'dashboard' ? 'Dashboard' : 'Index';
  return HtmlService.createTemplateFromFile(file).evaluate()
    .setTitle(page.toLowerCase() === 'dashboard' ? 'Dashboard PJU' : 'Pemeriksaan PJU')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function ss_() { return SpreadsheetApp.openById(CFG.SPREADSHEET_ID); }
function getSheet_(name) { return ss_().getSheetByName(name); }

function setupPJU() {
  const ss = ss_();
  ensureSheet_(ss, CFG.DATA_SHEET, DATA_HEADERS);
  ensureSheet_(ss, CFG.MASTER_SHEET, ['ID PJU','UNIT','ALAMAT','GARDU','TIANG','JENIS LAMPU','DAYA LAMPU 1','DAYA LAMPU 2','DAYA LAMPU 3','DAYA LAMPU 4','DAYA LAMPU 5','KOORDINAT','STATUS']);
  ensureSheet_(ss, CFG.PETUGAS_SHEET, ['ID PETUGAS','NAMA PETUGAS','UNIT','STATUS']);
  ensureSheet_(ss, CFG.DASHBOARD_SHEET, ['METRIK','NILAI']);
  getOrCreateFolder_(DriveApp, CFG.DRIVE_ROOT);
  return 'Setup PJU selesai.';
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  else sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}

function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function generateId_() {
  const sh = getSheet_(CFG.DATA_SHEET);
  const now = new Date();
  const date = Utilities.formatDate(now, CFG.TZ, 'yyyyMMdd');
  const n = Math.max(1, sh.getLastRow());
  return 'PJU-' + date + '-' + Utilities.formatString('%04d', n);
}

function getPetugas() {
  const sh = getSheet_(CFG.PETUGAS_SHEET); if (!sh || sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,4).getValues().filter(r => String(r[3]).toUpperCase()==='AKTIF')
    .map(r=>({id:r[0],nama:r[1],unit:r[2]}));
}

function getMasterPJU() {
  const sh = getSheet_(CFG.MASTER_SHEET); if (!sh || sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,13).getValues().filter(r => String(r[12]).toUpperCase()!=='NONAKTIF')
    .map(r=>({id:r[0],unit:r[1],alamat:r[2],gardu:r[3],tiang:r[4],jenisLampu:r[5],daya1:r[6],daya2:r[7],daya3:r[8],daya4:r[9],daya5:r[10],koordinat:r[11],status:r[12]}));
}

function findPJU(query) {
  const q = String(query||'').trim().toLowerCase();
  if (!q) return [];
  return getMasterPJU().filter(x => [x.id,x.unit,x.alamat,x.gardu,x.tiang].join(' ').toLowerCase().includes(q)).slice(0,20);
}

function saveInspection(data) {
  validate_(data);
  const sh = getSheet_(CFG.DATA_SHEET); if (!sh) throw new Error('Sheet PEMERIKSAAN_PJU belum ada. Jalankan setupPJU().');
  const now = new Date(), id = generateId_();
  const root = DriveApp.getFoldersByName(CFG.DRIVE_ROOT).hasNext() ? DriveApp.getFoldersByName(CFG.DRIVE_ROOT).next() : DriveApp.createFolder(CFG.DRIVE_ROOT);
  const yf = getOrCreateFolder_(root, Utilities.formatDate(now,CFG.TZ,'yyyy'));
  const mf = getOrCreateFolder_(yf, Utilities.formatDate(now,CFG.TZ,'MM - MMMM'));
  const df = getOrCreateFolder_(mf, Utilities.formatDate(now,CFG.TZ,'yyyy-MM-dd'));
  const pf = df.createFolder(id);
  const fotos = {
    utama: data.fotoUtama ? savePhoto_(data.fotoUtama,pf,id+'_UTAMA') : '',
    panel: data.fotoPanel ? savePhoto_(data.fotoPanel,pf,id+'_PANEL') : '',
    perbaikan: data.fotoPerbaikan ? savePhoto_(data.fotoPerbaikan,pf,id+'_PERBAIKAN') : ''
  };
  const maps = data.latitude && data.longitude ? 'https://www.google.com/maps?q='+encodeURIComponent(data.latitude+','+data.longitude) : '';
  const row = [id,now,Utilities.formatDate(now,CFG.TZ,'dd/MM/yyyy'),Utilities.formatDate(now,CFG.TZ,'HH:mm:ss'),data.petugas||'',data.unit||'',data.alamat||'',data.gardu||'',data.tiang||'',data.jenisLampu||'',data.daya1||'',data.daya2||'',data.daya3||'',data.daya4||'',data.daya5||'',fotos.utama,fotos.panel,fotos.perbaikan,(data.latitude||'')+((data.latitude&&data.longitude)?', ':'')+(data.longitude||''),maps,data.kondisiLampu||'',data.kondisiArmatur||'',data.kondisiTiang||'',data.kondisiKabel||'',data.kondisiGardu||'',data.statusPju||'',data.temuan||'',data.tindakLanjut||'',data.prioritas||'',data.statusPekerjaan||'BELUM DIPROSES',data.keterangan||'',pf.getUrl()];
  sh.appendRow(row);
  return {success:true,id:id,mapsUrl:maps,folderUrl:pf.getUrl()};
}

function validate_(d) {
  if (!d || !d.petugas) throw new Error('Petugas wajib diisi.');
  if (!d.fotoUtama) throw new Error('Foto utama PJU wajib diambil.');
  if (!d.latitude || !d.longitude) throw new Error('Koordinat GPS wajib diambil.');
}

function savePhoto_(dataUrl, folder, name) {
  const parts = String(dataUrl).split(','); if (parts.length<2) throw new Error('Format foto tidak valid.');
  const mime = (parts[0].match(/data:(.*?);base64/)||[])[1] || 'image/jpeg';
  const bytes = Utilities.base64Decode(parts[1]);
  const blob = Utilities.newBlob(bytes,mime,name+'.jpg');
  const file = folder.createFile(blob);
  if (CFG.PUBLIC_PHOTO_LINK) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getDashboardData() {
  const sh = getSheet_(CFG.DATA_SHEET); if (!sh || sh.getLastRow()<2) return {total:0,baik:0,rusakRingan:0,rusakBerat:0,mati:0,tindakLanjut:0,rows:[]};
  const v = sh.getRange(2,1,sh.getLastRow()-1,DATA_HEADERS.length).getValues();
  const status = v.map(r=>String(r[25]).toUpperCase());
  return {total:v.length,baik:status.filter(x=>x==='BAIK').length,rusakRingan:status.filter(x=>x==='RUSAK RINGAN').length,rusakBerat:status.filter(x=>x==='RUSAK BERAT').length,mati:status.filter(x=>x==='MATI').length,tindakLanjut:v.filter(r=>String(r[27]||'').trim()).length,rows:v.slice(-100).reverse().map(r=>({id:r[0],tanggal:r[2],petugas:r[4],unit:r[5],alamat:r[6],tiang:r[8],status:r[25],prioritas:r[28],maps:r[19],foto:r[15]}))};
}

function importLegacyToMaster() {
  const ss = ss_();
  const legacy = ss.getSheets().find(s=>s.getSheetId()===Number(CFG.LEGACY_SHEET_GID));
  if (!legacy) throw new Error('Sheet legacy dengan GID '+CFG.LEGACY_SHEET_GID+' tidak ditemukan.');
  const rows = legacy.getDataRange().getValues();
  if (rows.length<2) return 'Tidak ada data legacy.';
  const sh = getSheet_(CFG.MASTER_SHEET); if (!sh) throw new Error('Jalankan setupPJU() terlebih dahulu.');
  const out = rows.slice(1).map((r,i)=>['LEGACY-'+(i+1),r[1]||'',r[2]||'',r[3]||'',r[4]||'',r[5]||'',r[6]||'',r[7]||'',r[8]||'',r[9]||'',r[10]||'',r[12]||'','AKTIF']);
  if (out.length) sh.getRange(sh.getLastRow()+1,1,out.length,out[0].length).setValues(out);
  return 'Import selesai: '+out.length+' baris.';
}

function addPetugas(id,nama,unit) {
  const sh=getSheet_(CFG.PETUGAS_SHEET); sh.appendRow([id,nama,unit,'AKTIF']); return true;
}
