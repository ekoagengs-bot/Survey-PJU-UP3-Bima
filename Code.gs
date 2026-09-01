/**
 * PJU INSPECTION PRO
 * Google Apps Script + Google Sheets + Google Drive
 *
 * IMPORTANT:
 * - Bind this script to the Google Spreadsheet used as database, OR set SPREADSHEET_ID.
 * - Run setupPro() once after pasting the files.
 * - Then deploy as Web App.
 */
const CONFIG = {
  APP_NAME: 'PJU Inspection PRO',
  SPREADSHEET_ID: '', // Empty = bound spreadsheet
  ROOT_FOLDER_NAME: 'PJU_INSPECTION_PHOTOS',
  TIMEZONE: Session.getScriptTimeZone() || 'Asia/Makassar',
  MAX_PHOTO_BYTES: 8 * 1024 * 1024,
  MAX_HISTORY: 2000
};

const SHEETS = {
  inspections: 'INSPECTIONS',
  assets: 'PJU_MASTER',
  users: 'USERS',
  lists: 'LISTS',
  tasks: 'TASKS'
};

const DEFAULT_ULPS = [
  'ULP Sape',
  'ULP Dompu',
  'ULP Woha',
  'ULP Bima Kota'
];

function getSS_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function setupPro() {
  const ss = getSS_();

  const defs = {
    [SHEETS.inspections]: [
      'ID','Timestamp','ULP','Petugas','Tim','Tanggal','Kode PJU','Lokasi','Latitude','Longitude',
      'Jenis Tiang','Kondisi Tiang','Armatur','Lampu','Kabel','Panel','Grounding',
      'Kondisi Umum','Status','Temuan','Tindak Lanjut','Prioritas','Foto URL','Foto ID',
      'Catatan','UpdatedAt'
    ],
    [SHEETS.assets]: [
      'Kode PJU','Nama/Jalan','Kelurahan','Kecamatan','ULP','Latitude','Longitude',
      'Jenis Tiang','Daya Lampu','Jenis Lampu','Status Aktif','Catatan'
    ],
    [SHEETS.users]: ['Email','Nama','ULP','Tim','Role','Aktif'],
    [SHEETS.lists]: ['Jenis Tiang','Kondisi','Status','Prioritas','Role'],
    [SHEETS.tasks]: [
      'Task ID','CreatedAt','Kode PJU','Judul','Temuan','Prioritas','PIC','Status',
      'Target Selesai','Foto Before','Foto After','Catatan','UpdatedAt'
    ]
  };

  Object.keys(defs).forEach(name => ensureSheet_(ss, name, defs[name]));
  seedListsPro_();
  seedUlpList_();

  const root = getRootFolder_();
  PropertiesService.getScriptProperties().setProperty('PJU_ROOT_FOLDER_ID', root.getId());

  formatSheets_();

  return {
    ok: true,
    message: 'PJU Inspection PRO initialized',
    spreadsheetId: ss.getId(),
    folderId: root.getId()
  };
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrap() {
  const email = Session.getActiveUser().getEmail() || '';
  return {
    appName: CONFIG.APP_NAME,
    email,
    stats: getDashboardStats('month'),
    assets: getAssets(''),
    lists: getLists(),
    ulps: getUlps(),
    users: getSheetObjects_(SHEETS.users),
    user: getUser_(email)
  };
}


function getUlps() {
  const userRows = getSheetObjects_(SHEETS.users);
  const assetRows = getSheetObjects_(SHEETS.assets);

  const set = new Set(DEFAULT_ULPS);
  userRows.forEach(r => { if (r.ULP) set.add(String(r.ULP).trim()); });
  assetRows.forEach(r => { if (r.ULP) set.add(String(r.ULP).trim()); });

  return Array.from(set).filter(Boolean).sort();
}

function getPetugasByULP(ulp) {
  const target = String(ulp || '').trim().toLowerCase();
  const rows = getSheetObjects_(SHEETS.users);

  const names = rows
    .filter(r => String(r.Aktif || '').toLowerCase() !== 'false')
    .filter(r => !target || String(r.ULP || '').trim().toLowerCase() === target)
    .map(r => String(r.Nama || '').trim())
    .filter(Boolean);

  return Array.from(new Set(names)).sort();
}

function getUser_(email) {
  const users = getSheetObjects_(SHEETS.users);
  const u = users.find(x => String(x.Email || '').toLowerCase() === String(email || '').toLowerCase());
  return u || {
    Email: email,
    Nama: email,
    ULP: '',
    Tim: '',
    Role: 'Petugas',
    Aktif: true
  };
}

function getLists() {
  const rows = getSheetObjects_(SHEETS.lists);
  const headers = getHeaders_(SHEETS.lists);
  const out = {};
  headers.forEach(h => out[h] = rows.map(r => r[h]).filter(v => String(v || '').trim() !== ''));
  return out;
}

function getAssets(keyword) {
  const rows = getSheetObjects_(SHEETS.assets);
  const q = String(keyword || '').toLowerCase().trim();

  return rows.filter(r => {
    if (!q) return true;
    return [
      r['Kode PJU'], r['Nama/Jalan'], r['Kelurahan'], r['Kecamatan'],
      r['Jenis Tiang'], r['Jenis Lampu']
    ].join(' ').toLowerCase().includes(q);
  }).slice(0, 2000);
}

function getAssetDetail(kode) {
  const code = String(kode || '').trim().toLowerCase();
  const asset = getAssets('').find(x => String(x['Kode PJU'] || '').toLowerCase() === code);

  const inspections = getInspections({kodePJU: kode});
  const tasks = getTasks({kodePJU: kode});

  return {
    asset: asset || null,
    inspections: inspections.slice(0, 30),
    tasks: tasks.slice(0, 30)
  };
}

function getDashboardStats(period) {
  const assets = getAssets('');
  const inspections = getSheetObjects_(SHEETS.inspections);
  const tasks = getSheetObjects_(SHEETS.tasks);

  const now = new Date();
  const monthKey = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM');
  const todayKey = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  let scopeRows = inspections;
  if (period === 'month' || !period) {
    // dateKey_ returns yyyy-MM-dd, so compare the yyyy-MM prefix.
    scopeRows = inspections.filter(r => dateKey_(r.Tanggal).slice(0,7) === monthKey);
  }

  const inspectedCodes = new Set(scopeRows.map(r => String(r['Kode PJU'] || '').trim()).filter(Boolean));
  const lastByCode = {};
  inspections.forEach(r => {
    const code = String(r['Kode PJU'] || '').trim();
    if (code) {
      const t = new Date(r.Timestamp || r.UpdatedAt || 0).getTime();
      if (!lastByCode[code] || t > lastByCode[code]._time) {
        lastByCode[code] = Object.assign({}, r, {_time: t});
      }
    }
  });

  let baik = 0, rusak = 0, kritis = 0, tidakDitemukan = 0;
  Object.keys(lastByCode).forEach(code => {
    const s = String(lastByCode[code].Status || '').toLowerCase();
    if (s === 'baik') baik++;
    else if (s === 'rusak') rusak++;
    else if (s === 'kritis') kritis++;
    else if (s.includes('tidak')) tidakDitemukan++;
  });

  const taskOpen = tasks.filter(t => !['Selesai','Closed'].includes(String(t.Status || ''))).length;
  const taskHigh = tasks.filter(t => ['Tinggi','Kritis'].includes(String(t.Prioritas || '')) &&
    !['Selesai','Closed'].includes(String(t.Status || ''))).length;

  const daily = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    daily[k] = 0;
  }
  scopeRows.forEach(r => {
    const k = dateKey_(r.Tanggal);
    if (daily[k] != null) daily[k]++;
  });


  return {
    totalAssets: assets.length,
    pemeriksaanBulanIni: scopeRows.length,
    diperiksaBulanIni: inspectedCodes.size,
    belumDiperiksaBulanIni: Math.max(assets.length - inspectedCodes.size, 0),
    baik, rusak, kritis, tidakDitemukan,
    taskOpen, taskHigh,
    hariIni: inspections.filter(r => dateKey_(r.Tanggal) === todayKey).length,
    daily: Object.keys(daily).sort().map(k => ({date:k, count:daily[k]})),
    kecamatan: getProgressByKecamatan()
  };
}

function getInspections(filters) {
  const rows = getSheetObjects_(SHEETS.inspections).reverse();
  const f = filters || {};

  return rows.filter(r => {
    if (f.status && String(r.Status) !== String(f.status)) return false;
    if (f.prioritas && String(r.Prioritas) !== String(f.prioritas)) return false;
    if (f.kodePJU && !String(r['Kode PJU'] || '').toLowerCase().includes(String(f.kodePJU).toLowerCase())) return false;
    if (f.fromDate && dateKey_(r.Tanggal) < f.fromDate) return false;
    if (f.toDate && dateKey_(r.Tanggal) > f.toDate) return false;
    return true;
  }).slice(0, CONFIG.MAX_HISTORY);
}

function getTasks(filters) {
  const rows = getSheetObjects_(SHEETS.tasks).reverse();
  const f = filters || {};
  return rows.filter(r => {
    if (f.status && String(r.Status) !== String(f.status)) return false;
    if (f.kodePJU && String(r['Kode PJU']).toLowerCase() !== String(f.kodePJU).toLowerCase()) return false;
    return true;
  }).slice(0, 1000);
}

function saveInspection(data) {
  validateInspectionPro_(data);

  const id = String(data.id || Utilities.getUuid());
  const now = new Date();

  let photo = {url:'', id:''};
  if (data.photo && data.photo.dataUrl) {
    photo = savePhoto_(data.photo, data.kodePJU, data.tanggal, id, 'before');
  }

  const record = {
    ID: id,
    Timestamp: now,
    ULP: data.ulp || '',
    Petugas: data.petugas || Session.getActiveUser().getEmail(),
    Tim: data.tim || '',
    Tanggal: data.tanggal || '',
    'Kode PJU': data.kodePJU || '',
    Lokasi: data.lokasi || '',
    Latitude: normalizeCoord_(data.latitude),
    Longitude: normalizeCoord_(data.longitude),
    'Jenis Tiang': data.jenisTiang || '',
    'Kondisi Tiang': data.kondisiTiang || '',
    Armatur: data.armatur || '',
    Lampu: data.lampu || '',
    Kabel: data.kabel || '',
    Panel: data.panel || '',
    Grounding: data.grounding || '',
    'Kondisi Umum': data.kondisiUmum || '',
    Status: data.status || '',
    Temuan: data.temuan || '',
    'Tindak Lanjut': data.tindakLanjut || '',
    Prioritas: data.prioritas || 'Rendah',
    'Foto URL': photo.url || data.fotoUrl || '',
    'Foto ID': photo.id || data.fotoId || '',
    Catatan: data.catatan || '',
    UpdatedAt: now
  };

  upsertById_(SHEETS.inspections, 'ID', id, record);
  updateAssetCoordinates_(data.kodePJU, data.latitude, data.longitude);

  if (['Rusak','Kritis','Tidak Ditemukan'].includes(data.status) ||
      ['Tinggi','Kritis'].includes(data.prioritas)) {
    createTaskFromInspection_(record);
  }

  return {ok:true, id, photoUrl:photo.url};
}

function saveTask(data) {
  if (!data || !data.kodePJU) throw new Error('Kode PJU wajib diisi.');
  const id = data.taskId || Utilities.getUuid();
  const now = new Date();
  const record = {
    'Task ID': id,
    CreatedAt: data.createdAt || now,
    'Kode PJU': data.kodePJU,
    Judul: data.judul || 'Tindak lanjut PJU',
    Temuan: data.temuan || '',
    Prioritas: data.prioritas || 'Sedang',
    PIC: data.pic || '',
    Status: data.status || 'Open',
    'Target Selesai': data.targetSelesai || '',
    'Foto Before': data.fotoBefore || '',
    'Foto After': data.fotoAfter || '',
    Catatan: data.catatan || '',
    UpdatedAt: now
  };
  upsertById_(SHEETS.tasks, 'Task ID', id, record);
  return {ok:true,id};
}

function completeTask(data) {
  if (!data || !data.taskId) throw new Error('Task ID wajib.');
  const rows = getSheetObjects_(SHEETS.tasks);
  const rowIndex = rows.findIndex(r => String(r['Task ID']) === String(data.taskId));
  if (rowIndex < 0) throw new Error('Task tidak ditemukan.');

  const sh = getSS_().getSheetByName(SHEETS.tasks);
  const rowNumber = rowIndex + 2;
  const headers = getHeaders_(SHEETS.tasks);
  const current = rows[rowIndex];

  current.Status = data.status || 'Selesai';
  current['Foto After'] = data.fotoAfter || current['Foto After'] || '';
  current.Catatan = data.catatan || current.Catatan || '';
  current.UpdatedAt = new Date();

  sh.getRange(rowNumber,1,1,headers.length).setValues([headers.map(h => current[h] ?? '')]);
  return {ok:true};
}

function getMapData() {
  const assets = getAssets('');
  const inspections = getSheetObjects_(SHEETS.inspections);

  const lastByCode = {};
  inspections.forEach(r => {
    const code = String(r['Kode PJU'] || '').trim();
    if (!code) return;
    const t = new Date(r.Timestamp || r.UpdatedAt || 0).getTime();
    if (!lastByCode[code] || t > lastByCode[code]._time) {
      lastByCode[code] = Object.assign({}, r, {_time:t});
    }
  });

  return assets.map(a => {
    const code = String(a['Kode PJU'] || '');
    const last = lastByCode[code] || null;
    const lat = normalizeCoord_(last?.Latitude || a.Latitude);
    const lng = normalizeCoord_(last?.Longitude || a.Longitude);

    return {
      kode: code,
      lokasi: a['Nama/Jalan'] || '',
      kecamatan: a.Kecamatan || '',
      lat: lat === '' ? null : Number(lat),
      lng: lng === '' ? null : Number(lng),
      status: last?.Status || 'Belum Diperiksa',
      prioritas: last?.Prioritas || '',
      foto: last?.['Foto URL'] || '',
      updated: last?.Tanggal || ''
    };
  }).filter(x => x.lat != null && x.lng != null && isFinite(x.lat) && isFinite(x.lng));
}

function getProgressByKecamatan() {
  const assets = getAssets('');
  const inspections = getSheetObjects_(SHEETS.inspections);
  const now = new Date();
  const monthKey = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM');

  const inspected = new Set(
    inspections.filter(r => dateKey_(r.Tanggal) === monthKey)
      .map(r => String(r['Kode PJU'] || '').trim()).filter(Boolean)
  );

  const grouped = {};
  assets.forEach(a => {
    const k = String(a.Kecamatan || 'Lainnya');
    if (!grouped[k]) grouped[k] = {name:k,total:0,checked:0};
    grouped[k].total++;
    if (inspected.has(String(a['Kode PJU'] || '').trim())) grouped[k].checked++;
  });

  return Object.keys(grouped).sort().map(k => {
    const x = grouped[k];
    x.percent = x.total ? Math.round(x.checked * 1000 / x.total) / 10 : 0;
    return x;
  });
}

function exportCsv() {
  const rows = getInspections({});
  if (!rows.length) return '';
  const headers = getHeaders_(SHEETS.inspections);
  const out = [headers.map(csvEscape_).join(',')];
  rows.forEach(r => out.push(headers.map(h => csvEscape_(r[h])).join(',')));
  return out.join('\n');
}

/* -------------------- Helpers -------------------- */

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    const currentLastCol = Math.max(sh.getLastColumn(), 1);
    const existing = sh.getRange(1,1,1,currentLastCol).getValues()[0].map(String);
    if (!existing[0]) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    } else {
      // Migration-safe: append any newly introduced headers without deleting old data.
      const missing = headers.filter(h => !existing.includes(h));
      if (missing.length) {
        sh.getRange(1, currentLastCol + 1, 1, missing.length).setValues([missing]);
      }
    }
  }
  sh.setFrozenRows(1);
}

function getHeaders_(sheetName) {
  const sh = getSS_().getSheetByName(sheetName);
  if (!sh || sh.getLastColumn() === 0) return [];
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
}

function getSheetObjects_(sheetName) {
  const sh = getSS_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.map(row => rowToObj_(headers,row));
}

function rowToObj_(headers,row) {
  const o = {};
  headers.forEach((h,i) => o[h] = row[i]);
  return o;
}

function upsertById_(sheetName, idHeader, id, record) {
  const sh = getSS_().getSheetByName(sheetName);
  const headers = getHeaders_(sheetName);
  const rows = getSheetObjects_(sheetName);
  const idx = rows.findIndex(r => String(r[idHeader]) === String(id));
  const rowValues = headers.map(h => record[h] ?? '');

  if (idx >= 0) {
    sh.getRange(idx + 2,1,1,headers.length).setValues([rowValues]);
  } else {
    sh.appendRow(rowValues);
  }

  formatSheets_();
}

function validateInspectionPro_(d) {
  if (!d) throw new Error('Data pemeriksaan kosong.');
  if (!String(d.ulp || '').trim()) throw new Error('ULP wajib dipilih.');
  if (!String(d.kodePJU || '').trim()) throw new Error('Kode PJU wajib diisi.');
  if (!String(d.tanggal || '').trim()) throw new Error('Tanggal wajib diisi.');
  if (!String(d.status || '').trim()) throw new Error('Status pemeriksaan wajib dipilih.');
}

function normalizeCoord_(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(String(v).replace(',', '.'));
  return isFinite(n) ? n.toFixed(6) : '';
}

function dateKey_(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return '';
}

function updateAssetCoordinates_(kode, lat, lng) {
  const code = String(kode || '').trim().toLowerCase();
  const rows = getSheetObjects_(SHEETS.assets);
  const idx = rows.findIndex(r => String(r['Kode PJU'] || '').trim().toLowerCase() === code);
  if (idx < 0) return;

  const sh = getSS_().getSheetByName(SHEETS.assets);
  const headers = getHeaders_(SHEETS.assets);
  const r = rows[idx];
  if (lat) r.Latitude = normalizeCoord_(lat);
  if (lng) r.Longitude = normalizeCoord_(lng);
  sh.getRange(idx + 2,1,1,headers.length).setValues([headers.map(h => r[h] ?? '')]);
}

function createTaskFromInspection_(record) {
  const tasks = getTasks({kodePJU:record['Kode PJU']});
  const openSame = tasks.find(t =>
    !['Selesai','Closed'].includes(String(t.Status || '')) &&
    String(t.Temuan || '').trim() === String(record.Temuan || '').trim()
  );
  if (openSame) return;

  saveTask({
    kodePJU:record['Kode PJU'],
    judul:`Tindak lanjut ${record.Status || 'temuan'} - ${record['Kode PJU']}`,
    temuan:record.Temuan || '',
    prioritas:record.Prioritas || 'Sedang',
    pic:'',
    status:'Open',
    targetSelesai:'',
    fotoBefore:record['Foto URL'] || '',
    catatan:record['Tindak Lanjut'] || ''
  });
}

function getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PJU_ROOT_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  const it = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
}

function getOrCreateFolder_(parent,name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function savePhoto_(photo,kode,tanggal,inspectionId,prefix) {
  const dataUrl = String(photo.dataUrl || '');
  const comma = dataUrl.indexOf(',');
  const raw = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
  const bytes = Utilities.base64Decode(raw);

  if (bytes.length > CONFIG.MAX_PHOTO_BYTES) {
    throw new Error('Foto terlalu besar. Maksimum 8 MB.');
  }

  const root = getRootFolder_();
  const year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');
  const month = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'MM');
  const yearFolder = getOrCreateFolder_(root, year);
  const monthFolder = getOrCreateFolder_(yearFolder, month);
  const ext = String(photo.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
  const safe = String(kode || 'PJU').replace(/[^\w\-]+/g,'_');
  const name = `${tanggal || 'tanggal'}_${safe}_${prefix || 'foto'}_${inspectionId}.${ext}`;

  const file = monthFolder.createFile(
    Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', name)
  );
  file.setDescription(`PJU Inspection PRO | ${inspectionId}`);
  return {id:file.getId(), url:file.getUrl()};
}

function formatSheets_() {
  const ss = getSS_();

  const ins = ss.getSheetByName(SHEETS.inspections);
  if (ins && ins.getLastRow() >= 2) {
    const headers = getHeaders_(SHEETS.inspections);
    const latCol = headers.indexOf('Latitude') + 1;
    const lngCol = headers.indexOf('Longitude') + 1;
    const tsCol = headers.indexOf('Timestamp') + 1;
    const dateCol = headers.indexOf('Tanggal') + 1;
    if (latCol > 0) ins.getRange(2,latCol,Math.max(1,ins.getMaxRows()-1),1).setNumberFormat('0.000000');
    if (lngCol > 0) ins.getRange(2,lngCol,Math.max(1,ins.getMaxRows()-1),1).setNumberFormat('0.000000');
    if (tsCol > 0) ins.getRange(2,tsCol,Math.max(1,ins.getMaxRows()-1),1).setNumberFormat('dd/mm/yyyy hh:mm');
    if (dateCol > 0) ins.getRange(2,dateCol,Math.max(1,ins.getMaxRows()-1),1).setNumberFormat('@');
  }

  const assets = ss.getSheetByName(SHEETS.assets);
  if (assets && assets.getLastRow() >= 2) {
    const h = getHeaders_(SHEETS.assets);
    ['Latitude','Longitude'].forEach(name => {
      const c = h.indexOf(name) + 1;
      if (c > 0) assets.getRange(2,c,Math.max(1,assets.getMaxRows()-1),1).setNumberFormat('0.000000');
    });
  }

  [SHEETS.inspections,SHEETS.assets,SHEETS.users,SHEETS.lists,SHEETS.tasks].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    sh.setFrozenRows(1);
    if (sh.getLastColumn() > 0) sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold');
  });
}


function seedUlpList_() {
  const sh = getSS_().getSheetByName(SHEETS.lists);
  if (!sh) return;

  let headers = getHeaders_(SHEETS.lists);
  let col = headers.indexOf('ULP') + 1;

  if (col === 0) {
    col = headers.length + 1;
    sh.getRange(1, col).setValue('ULP');
    headers.push('ULP');
  }

  const existing = sh.getRange(2, col, Math.max(1, sh.getLastRow() - 1), 1)
    .getValues().flat().map(v => String(v || '').trim()).filter(Boolean);

  const missing = DEFAULT_ULPS.filter(x => !existing.includes(x));
  if (missing.length) {
    const start = sh.getLastRow() + 1;
    sh.getRange(start, col, missing.length, 1).setValues(missing.map(x => [x]));
  }
}

function seedListsPro_() {
  const sh = getSS_().getSheetByName(SHEETS.lists);
  if (!sh || sh.getLastRow() > 1) return;

  const rows = [
    ['Tiang Beton','Baik','Baik','Rendah','Petugas'],
    ['Tiang Besi','Rusak Ringan','Rusak','Sedang','Supervisor'],
    ['Tiang PJU','Rusak Berat','Kritis','Tinggi','Admin'],
    ['Tiang PLN','Tidak Ditemukan','Tidak Ditemukan','Kritis','Viewer'],
    ['','Perlu Perbaikan','','',''],
    ['','Nyala','','',''],
    ['','Mati','','',''],
    ['','Berkedip','','',''],
    ['','Rusak','','','']
  ];
  sh.getRange(2,1,rows.length,5).setValues(rows);
}

function csvEscape_(v) {
  const s = v instanceof Date ? v.toISOString() : String(v ?? '');
  return `"${s.replace(/"/g,'""')}"`;
}
