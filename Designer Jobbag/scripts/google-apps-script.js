// ================================================================
// Designer Jobbag System — Google Apps Script v2 (CLEAN)
// Deploy: Web App → Execute as ME → Access: ANYONE (even anonymous)
// ================================================================
//
// SCHEMA KOLOM (30 kolom, A–AD):
//  A  = ticketNumber       B  = submittedAt        C  = fullName
//  D  = email              E  = emailOptional1     F  = emailOptional2
//  G  = initials           H  = department         I  = title
//  J  = description        K  = requestType        L  = category
//  M  = linkReference      N  = file1DriveUrl      O  = file2DriveUrl
//  P  = file3DriveUrl      Q  = deadline           R  = prepDate
//  S  = assignedDesigner   T  = assignedDesigners  U  = status
//  V  = designerStatus     W  = feedback           X  = designerNotes
//  Y  = timestampSubmit    Z  = timestampAssign    AA = timestampReview
//  AB = timestampApproved  AC = timestampShared    AD = lastUpdated
// ================================================================

var SPREADSHEET_ID  = '1_OJDjptbuP_7v7_-bSYW0KfAPeKDPeHWoZHhAQiTv78';
var DRIVE_FOLDER_ID = '126lg-HSRV2K2r7VVs7MzTLpOWoEInszp';
var SHEET_NAME      = 'Jobbag';
var THREAD_SHEET    = 'EmailThreads';
var SENDER_NAME     = 'Designer Jobbag System';

// ── GET ─────────────────────────────────────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  if (action === 'getTickets') return getTicketsJson();
  return jsonOut({ status: 'ok', message: 'Designer Jobbag System API v2' });
}

function getTicketsJson() {
  try {
    var sheet = getOrCreateSheet();
    var rows  = sheet.getDataRange().getValues();

    if (rows.length <= 1) {
      return jsonOut({ success: true, tickets: [], total: 0 });
    }

    var tickets = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0] || String(r[0]).trim() === '') continue;

      tickets.push({
        ticketNumber:       str(r[0]),
        submittedAt:        str(r[1]),
        fullName:           str(r[2]),
        email:              str(r[3]),
        emailOptional1:     str(r[4]),
        emailOptional2:     str(r[5]),
        initials:           str(r[6]),
        department:         str(r[7]),
        title:              str(r[8]),
        description:        str(r[9]),
        requestType:        str(r[10]),
        category:           str(r[11]),
        linkReference:      str(r[12]),
        file1DriveUrl:      str(r[13]),
        file2DriveUrl:      str(r[14]),
        file3DriveUrl:      str(r[15]),
        deadline:           str(r[16]),
        prepDate:           str(r[17]),
        assignedDesigner:   str(r[18]),
        assignedDesigners:  str(r[19]),
        status:             str(r[20]) || 'New',
        designerStatus:     str(r[21]) || 'Not Review',
        feedback:           str(r[22]),
        designerNotes:      str(r[23]),
        timestampSubmit:    str(r[24]),
        timestampAssign:    str(r[25]),
        timestampReview:    str(r[26]),
        timestampApproved:  str(r[27]),
        timestampShared:    str(r[28]),
        lastUpdated:        str(r[29]),
      });
    }

    return jsonOut({ success: true, tickets: tickets, total: tickets.length });
  } catch (err) {
    return jsonOut({ success: false, error: String(err) });
  }
}

// ── POST ────────────────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ success: false, error: 'No postData received' });
    }
    var payload = JSON.parse(e.postData.contents);
    if (!payload || typeof payload !== 'object') {
      return jsonOut({ success: false, error: 'Invalid JSON payload' });
    }
    var action = payload.action;
    var result;

    if      (action === 'submitTicket') result = submitTicket(payload);
    else if (action === 'updateTicket') result = updateTicket(payload);
    else if (action === 'deleteTicket') result = deleteTicket(payload);
    else if (action === 'uploadFile')   result = uploadFile(payload);
    else if (action === 'sendEmail')    result = sendEmailNotification(payload);
    else result = { success: false, error: 'Unknown action: ' + action };

    return jsonOut(result);
  } catch (err) {
    return jsonOut({ success: false, error: 'doPost error: ' + String(err) });
  }
}

// ── SUBMIT TICKET ───────────────────────────────────────────────
function submitTicket(d) {
  var sheet = getOrCreateSheet();
  var now   = nowStr();

  sheet.appendRow([
    d.ticketNumber       || '',           // A  ticketNumber
    d.submittedAt        || now,          // B  submittedAt
    d.fullName           || '',           // C  fullName
    d.email              || '',           // D  email
    d.emailOptional1     || '',           // E  emailOptional1
    d.emailOptional2     || '',           // F  emailOptional2
    d.initials           || '',           // G  initials
    d.department         || '',           // H  department
    d.title              || '',           // I  title
    d.description        || '',           // J  description
    d.requestType        || '',           // K  requestType
    d.category           || '',           // L  category
    d.linkReference      || '',           // M  linkReference
    d.file1DriveUrl      || '',           // N  file1DriveUrl
    d.file2DriveUrl      || '',           // O  file2DriveUrl
    d.file3DriveUrl      || '',           // P  file3DriveUrl
    d.deadline           || '',           // Q  deadline
    d.prepDate           || '',           // R  prepDate
    d.assignedDesigner   || '',           // S  assignedDesigner
    d.assignedDesigners  || '',           // T  assignedDesigners
    d.status             || 'New',        // U  status
    d.designerStatus     || 'Not Review', // V  designerStatus
    d.feedback           || '',           // W  feedback
    d.designerNotes      || '',           // X  designerNotes
    now,                                  // Y  timestampSubmit
    '',                                   // Z  timestampAssign
    '',                                   // AA timestampReview
    '',                                   // AB timestampApproved
    '',                                   // AC timestampShared
    now,                                  // AD lastUpdated
  ]);

  return { success: true, ticketNumber: d.ticketNumber };
}

// ── DELETE TICKET ───────────────────────────────────────────────
function deleteTicket(d) {
  var sheet  = getOrCreateSheet();
  var rows   = sheet.getDataRange().getValues();
  var target = String(d.ticketNumber || '').trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== target) continue;
    sheet.deleteRow(i + 1);
    return { success: true, ticketNumber: target };
  }
  return { success: false, error: 'Ticket not found: ' + target };
}

// ── UPDATE TICKET ───────────────────────────────────────────────
function updateTicket(d) {
  var sheet  = getOrCreateSheet();
  var rows   = sheet.getDataRange().getValues();
  var now    = nowStr();
  var target = String(d.ticketNumber || '').trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() !== target) continue;
    var row = i + 1;

    if (d.title             !== undefined) sheet.getRange(row,  9).setValue(d.title);
    if (d.assignedDesigner  !== undefined) sheet.getRange(row, 19).setValue(d.assignedDesigner);
    if (d.assignedDesigners !== undefined) {
      var ads = Array.isArray(d.assignedDesigners) ? d.assignedDesigners.join(', ') : String(d.assignedDesigners || '');
      sheet.getRange(row, 20).setValue(ads);
    }
    if (d.status         !== undefined) sheet.getRange(row, 21).setValue(d.status);
    if (d.designerStatus !== undefined) sheet.getRange(row, 22).setValue(d.designerStatus);
    if (d.feedback       !== undefined) sheet.getRange(row, 23).setValue(d.feedback);
    if (d.designerNotes  !== undefined) sheet.getRange(row, 24).setValue(d.designerNotes);
    if (d.deadline       !== undefined) sheet.getRange(row, 17).setValue(d.deadline);
    if (d.prepDate       !== undefined) sheet.getRange(row, 18).setValue(d.prepDate);
    if (d.file1DriveUrl  !== undefined) sheet.getRange(row, 14).setValue(d.file1DriveUrl);
    if (d.file2DriveUrl  !== undefined) sheet.getRange(row, 15).setValue(d.file2DriveUrl);
    if (d.file3DriveUrl  !== undefined) sheet.getRange(row, 16).setValue(d.file3DriveUrl);

    // Timestamps otomatis berdasarkan status ticket
    if (d.status === 'In Progress' && !rows[i][25]) sheet.getRange(row, 26).setValue(now); // Z timestampAssign
    if (d.status === 'Review'      && !rows[i][26]) sheet.getRange(row, 27).setValue(now); // AA timestampReview
    // timestampApproved: saat designerStatus = 'Approved By Manager' ATAU status = 'Done' pertama kali
    if ((d.designerStatus === 'Approved By Manager') && !rows[i][27]) sheet.getRange(row, 28).setValue(now); // AB
    // timestampShared: saat status berubah jadi Done (dari share action)
    if (d.status === 'Done' && !rows[i][28]) sheet.getRange(row, 29).setValue(now); // AC timestampShared

    sheet.getRange(row, 30).setValue(now); // lastUpdated
    return { success: true, ticketNumber: target };
  }

  return { success: false, error: 'Ticket not found: ' + target };
}

// ── UPLOAD FILE ─────────────────────────────────────────────────
function uploadFile(d) {
  if (!d.fileData || !d.fileName) {
    return { success: false, error: 'fileData dan fileName wajib diisi' };
  }
  try {
    var parts    = d.fileData.split(',');
    var mimeType = parts[0].split(':')[1].split(';')[0];
    var bytes    = Utilities.base64Decode(parts[1]);
    var blob     = Utilities.newBlob(bytes, mimeType, d.fileName);

    var root       = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var folderName = '[' + (d.ticketNumber || 'TEMP') + '] ' +
                     (d.jobTitle ? d.jobTitle + ' — ' : '') +
                     (d.requesterName || 'Unknown');

    var iter   = root.getFoldersByName(folderName);
    var folder = iter.hasNext() ? iter.next() : root.createFolder(folderName);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success:   true,
      fileId:    file.getId(),
      fileName:  file.getName(),
      driveUrl:  'https://drive.google.com/file/d/' + file.getId() + '/view',
      folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId(),
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── SEND EMAIL ──────────────────────────────────────────────────
function sendEmailNotification(d) {
  if (!d || typeof d !== 'object') {
    return { success: false, error: 'sendEmailNotification: parameter d is undefined or invalid' };
  }

  var toList = filterEmails(d.to);
  var ccList = filterEmails(d.cc);
  if (toList.length === 0) {
    return { success: false, error: 'Tidak ada email valid. to=' + JSON.stringify(d.to) };
  }

  var subject     = d.subject     || 'Notifikasi Designer Jobbag System';
  var headline    = d.headline    || 'Designer Jobbag System';
  var message     = d.message     || '';
  var status      = d.status      || '';
  var statusColor = d.statusColor || '#0055A9';
  var details     = d.details     || [];

  var rows = '';
  for (var i = 0; i < details.length; i++) {
    var item = details[i];
    // Skip hanya jika value benar-benar kosong string atau null/undefined
    if (item.value === null || item.value === undefined || item.value === '') continue;
    var val = isUrl(item.value)
      ? '<a href="' + item.value + '" style="color:#0055A9;" target="_blank">' + esc(item.value) + '</a>'
      : esc(String(item.value));
    rows += '<tr style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:8px 12px;color:#6b7280;font-size:13px;width:160px;white-space:nowrap;">' + esc(item.label) + '</td>' +
            '<td style="padding:8px 12px;font-size:13px;color:#111827;">' + val + '</td></tr>';
  }

  var html =
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">' +
    '<div style="background:#0055A9;padding:28px 32px;">' +
    '<p style="color:#cce0ff;margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Asuransi Astra — Brand Communication</p>' +
    '<h1 style="color:#fff;margin:8px 0 0;font-size:22px;">' + esc(headline) + '</h1></div>' +
    '<div style="padding:28px 32px;">' +
    '<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">' + esc(message) + '</p>' +
    '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">' + rows + '</table>' +
    '<div style="margin-top:20px;"><span style="background:' + statusColor + ';color:#fff;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:bold;">Status: ' + esc(status) + '</span></div></div>' +
    '<div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">' +
    '<p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">Email ini dikirim otomatis oleh Designer Jobbag System.</p>' +
    '</div></div></body>';

  var toStr     = toList.join(',');
  var ccStr     = ccList.length > 0 ? ccList.join(',') : '';
  var opts      = { htmlBody: html, name: SENDER_NAME };
  if (ccStr) opts.cc = ccStr;

  var ticketNum = d.ticketNumber || '';
  var emailType = d.type || '';

  try {
    if (emailType === 'submitted' || !ticketNum) {
      // ── Email pertama: kirim baru, simpan Thread ID ──────────────
      GmailApp.sendEmail(toStr, subject, '', opts);
      if (ticketNum) {
        Utilities.sleep(2000);
        var sentThreads = GmailApp.search('in:sent "' + ticketNum + '"', 0, 3);
        if (sentThreads.length > 0) {
          saveThreadId(ticketNum, sentThreads[0].getId());
        }
      }
    } else {
      // ── Email follow-up: kirim email baru dengan subject yang sama ──
      // Tidak menggunakan reply thread karena reply() sering gagal
      // di Apps Script jika penerima berbeda atau thread sudah lama.
      // Kirim sebagai email baru dengan subject yang sama agar Gmail
      // otomatis mengelompokkan ke thread yang sama di inbox penerima.
      GmailApp.sendEmail(toStr, subject, '', opts);
    }
  } catch (err) {
    // Last resort fallback
    try { GmailApp.sendEmail(toStr, subject, '', opts); } catch(e2) {}
    return { success: false, error: String(err) };
  }

  return { success: true, type: emailType, to: toStr };
}

// ── THREAD STORE ────────────────────────────────────────────────
function saveThreadId(ticketNumber, threadId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(THREAD_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(THREAD_SHEET);
    sheet.getRange(1,1,1,2).setValues([['TicketNumber','ThreadId']]);
    sheet.getRange(1,1,1,2).setBackground('#0055A9').setFontColor('#fff').setFontWeight('bold');
  }
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(ticketNumber)) {
      sheet.getRange(i+1, 2).setValue(threadId);
      return;
    }
  }
  sheet.appendRow([ticketNumber, threadId]);
}

function getThreadId(ticketNumber) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(THREAD_SHEET);
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(ticketNumber)) return String(rows[i][1]) || null;
  }
  return null;
}

// ── SHEET SETUP ─────────────────────────────────────────────────
function getOrCreateSheet() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      'Ticket ID','Tanggal Submit','Nama Lengkap','Email',
      'Email Optional 1','Email Optional 2','Inisial','Department',
      'Judul Permintaan','Deskripsi','Request Type','Kategori',
      'Link Referensi','File 1 (Drive URL)','File 2 (Drive URL)','File 3 (Drive URL)',
      'Deadline','Prep Date','Assigned Designer','All Designers',
      'Status Ticket','Status Designer','Feedback Manager','Designer Notes',
      'Timestamp Submit','Timestamp Assign','Timestamp Review',
      'Timestamp Approved','Timestamp Shared','Last Updated',
    ];
    var h = sheet.getRange(1, 1, 1, headers.length);
    h.setValues([headers]);
    h.setBackground('#0055A9').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(9, 220);
    sheet.setColumnWidth(10, 300);
  }
  return sheet;
}

// ── UTILITIES ────────────────────────────────────────────────────
function str(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  return String(v).trim();
}
function nowStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function filterEmails(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(function(e) { return typeof e === 'string' && e.indexOf('@') > 0; });
}
function isUrl(s) {
  return typeof s === 'string' && (s.indexOf('http://') === 0 || s.indexOf('https://') === 0);
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
