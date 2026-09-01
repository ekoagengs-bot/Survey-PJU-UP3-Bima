/**
 * Native Android authentication endpoint for PJU Inspection PRO.
 *
 * USERS sheet columns used:
 * Email | Nama | ULP | Tim | Role | Aktif | PasswordHash
 * Passwords are stored as SHA-256 hashes, never plain text.
 */

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    if (body.action === 'login') {
      return jsonResponse_(loginMobile_(body.email, body.password));
    }

    return jsonResponse_({ok:false, message:'Aksi tidak dikenal.'});
  } catch (err) {
    return jsonResponse_({ok:false, message:String(err && err.message || err)});
  }
}

function loginMobile_(email, password) {
  ensureMobileAuthColumn_();

  const targetEmail = String(email || '').trim().toLowerCase();
  const targetPassword = String(password || '');
  if (!targetEmail || !targetPassword) {
    return {ok:false, message:'Email dan password wajib diisi.'};
  }

  const users = getSheetObjects_(SHEETS.users);
  const user = users.find(u => String(u.Email || '').trim().toLowerCase() === targetEmail);

  if (!user) return {ok:false, message:'Akun tidak terdaftar.'};
  if (String(user.Aktif || '').toLowerCase() === 'false') {
    return {ok:false, message:'Akun tidak aktif.'};
  }
  if (!String(user.PasswordHash || '').trim()) {
    return {ok:false, message:'Password akun belum dibuat. Hubungi Admin.'};
  }

  const hash = hashMobilePassword_(targetPassword);
  if (hash !== String(user.PasswordHash).trim()) {
    return {ok:false, message:'Email atau password salah.'};
  }

  return {
    ok:true,
    email:String(user.Email || ''),
    nama:String(user.Nama || user.Email || ''),
    ulp:String(user.ULP || ''),
    tim:String(user.Tim || ''),
    role:String(user.Role || 'Petugas')
  };
}

function setupMobileAuth() {
  const sh = getSS_().getSheetByName(SHEETS.users);
  if (!sh) throw new Error('Sheet USERS belum ada. Jalankan setupPro() terlebih dahulu.');

  ensureMobileAuthColumn_();
  SpreadsheetApp.getUi().alert(
    'PJU Inspection PRO',
    'Kolom PasswordHash sudah disiapkan.\n\nSelanjutnya jalankan setMobilePasswordForEmail() untuk membuat password setiap akun.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return {ok:true};
}

function setMobilePasswordForEmail() {
  const ui = SpreadsheetApp.getUi();
  const emailPrompt = ui.prompt(
    'PJU Inspection PRO',
    'Masukkan email akun pada sheet USERS:',
    ui.ButtonSet.OK_CANCEL
  );
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;

  const email = emailPrompt.getResponseText().trim();
  if (!email) throw new Error('Email kosong.');

  const passPrompt = ui.prompt(
    'Password Android',
    'Masukkan password minimal 6 karakter:',
    ui.ButtonSet.OK_CANCEL
  );
  if (passPrompt.getSelectedButton() !== ui.Button.OK) return;

  const password = passPrompt.getResponseText();
  if (password.length < 6) throw new Error('Password minimal 6 karakter.');

  ensureMobileAuthColumn_();
  const sh = getSS_().getSheetByName(SHEETS.users);
  const headers = getHeaders_(SHEETS.users);
  const emailCol = headers.indexOf('Email') + 1;
  const hashCol = headers.indexOf('PasswordHash') + 1;

  if (emailCol < 1 || hashCol < 1) throw new Error('Kolom USERS belum lengkap.');
  const values = sh.getRange(2, emailCol, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  const idx = values.findIndex(r => String(r[0] || '').trim().toLowerCase() === email.toLowerCase());
  if (idx < 0) throw new Error('Email tidak ditemukan di sheet USERS.');

  sh.getRange(idx + 2, hashCol).setValue(hashMobilePassword_(password));
  ui.alert('Berhasil', 'Password Android untuk ' + email + ' sudah dibuat.', ui.ButtonSet.OK);
}

function clearMobilePasswordForEmail() {
  const ui = SpreadsheetApp.getUi();
  const p = ui.prompt('Reset Password', 'Masukkan email akun yang akan di-reset:', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  const email = p.getResponseText().trim().toLowerCase();
  if (!email) return;

  ensureMobileAuthColumn_();
  const sh = getSS_().getSheetByName(SHEETS.users);
  const headers = getHeaders_(SHEETS.users);
  const emailCol = headers.indexOf('Email') + 1;
  const hashCol = headers.indexOf('PasswordHash') + 1;
  const values = sh.getRange(2, emailCol, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  const idx = values.findIndex(r => String(r[0] || '').trim().toLowerCase() === email);
  if (idx < 0) throw new Error('Email tidak ditemukan.');
  sh.getRange(idx + 2, hashCol).clearContent();
  ui.alert('Selesai', 'Password dihapus. Akun tidak dapat login sampai password baru dibuat.', ui.ButtonSet.OK);
}

function ensureMobileAuthColumn_() {
  const sh = getSS_().getSheetByName(SHEETS.users);
  if (!sh) throw new Error('Sheet USERS tidak ditemukan.');

  const headers = getHeaders_(SHEETS.users);
  if (headers.indexOf('PasswordHash') >= 0) return;

  const col = Math.max(1, sh.getLastColumn()) + 1;
  sh.getRange(1, col).setValue('PasswordHash');
  sh.setFrozenRows(1);
}

function hashMobilePassword_(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
