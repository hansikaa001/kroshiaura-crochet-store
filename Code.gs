/**
 * kroshiaura backend: saves orders and reviews into this Google Sheet.
 * Paste into Extensions > Apps Script, then Deploy > New deployment > Web app.
 */

// Optional: put your email here to get a message for every new order.
var OWNER_EMAIL = '';

// Only fill this in if the script was NOT opened from your sheet (Extensions > Apps Script).
// It is the long ID in your sheet's address: docs.google.com/spreadsheets/d/<THIS PART>/edit
var SHEET_ID = '';

function ss_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  // Script is not linked to a sheet: use (or create once) a sheet in your Google Drive.
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('AUTO_SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var created = SpreadsheetApp.create('kroshiaura orders (auto-created)');
  props.setProperty('AUTO_SHEET_ID', created.getId());
  Logger.log('Created sheet: ' + created.getUrl());
  return created;
}

// Run from the editor to see which sheet the script writes to (View > Logs).
function whereAmI() { Logger.log(ss_().getUrl()); }

// Run this once from the editor (select testOrder, tap Run) to check saving works.
function testOrder() {
  doPost({ postData: { contents: JSON.stringify({
    type: 'order', orderId: 'TEST1', name: 'Test', phone: '9999999999', email: '',
    address: 'Test address', items: '1 x Test item', total: 319, notes: 'test' }) } });
}

var ORDER_HEADERS = ['Time', 'Order ID', 'Name', 'Phone', 'Email', 'Address',
                     'Items', 'Total (Rs)', 'Notes', 'Payment verified?', 'Status'];
var CUSTOM_HEADERS = ['Time', 'Name', 'Phone', 'Product', 'Idea', 'Reference image (Drive link)', 'Status'];
var REVIEW_HEADERS = ['Time', 'Name', 'Rating', 'Piece', 'Review', 'Approved? (type yes)'];

function getSheet_(name, headers) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ffd9e1');
  }
  return sh;
}

// Trim length and stop text from being treated as a spreadsheet formula.
function clean_(v, max) {
  var s = String(v == null ? '' : v).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var d = JSON.parse(e.postData.contents);

    if (d.type === 'order') {
      getSheet_('Orders', ORDER_HEADERS).appendRow([
        new Date(), clean_(d.orderId, 20), clean_(d.name, 100), clean_(d.phone, 20),
        clean_(d.email, 100), clean_(d.address, 400), clean_(d.items, 800),
        Number(d.total) || 0, clean_(d.notes, 500), 'No', 'New'
      ]);
      if (OWNER_EMAIL) {
        MailApp.sendEmail(OWNER_EMAIL, 'New kroshiaura order ' + clean_(d.orderId, 20),
          'Name: ' + d.name + '\nPhone: ' + d.phone + '\nTotal: Rs.' + d.total +
          '\n\nItems:\n' + d.items + '\n\nAddress: ' + d.address +
          '\n\nSee the Orders sheet for details.');
      }
    } else if (d.type === 'custom') {
      var link = '';
      if (d.image && String(d.image).length < 4500000) {
        try {
          var folders = DriveApp.getFoldersByName('kroshiaura custom orders');
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('kroshiaura custom orders');
          var blob = Utilities.newBlob(Utilities.base64Decode(String(d.image)), 'image/jpeg', 'custom-' + Date.now() + '.jpg');
          link = folder.createFile(blob).getUrl();
        } catch (imgErr) {
          link = 'image could not be saved';
        }
      }
      getSheet_('Custom requests', CUSTOM_HEADERS).appendRow([
        new Date(), clean_(d.name, 100), clean_(d.phone, 20), clean_(d.product, 60),
        clean_(d.idea, 800), link, 'New'
      ]);
      if (OWNER_EMAIL) {
        MailApp.sendEmail(OWNER_EMAIL, 'New custom order request from ' + clean_(d.name, 100),
          'Phone: ' + d.phone + '\nProduct: ' + d.product + '\nIdea: ' + d.idea +
          (link ? '\nImage: ' + link : '') + '\n\nSee the Custom requests sheet.');
      }
    } else if (d.type === 'review') {
      var rating = Math.max(1, Math.min(5, Number(d.rating) || 5));
      getSheet_('Reviews', REVIEW_HEADERS).appendRow([
        new Date(), clean_(d.name, 60), rating, clean_(d.piece, 80), clean_(d.text, 600), 'no'
      ]);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    try { PropertiesService.getScriptProperties().setProperty('LAST_ERROR', new Date() + ' ' + err); } catch (e2) {}
    console.error('doPost error: ' + err);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// Returns only reviews you approved (type "yes" in the last column).
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'status') {
    var info = { ok: true, version: 'v3', sheet: false, sheetName: '', error: '' };
    try { var s = ss_(); info.sheet = !!s; info.sheetName = s.getName(); } catch (err) { info.error = String(err); }
    info.lastError = PropertiesService.getScriptProperties().getProperty('LAST_ERROR') || '';
    return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'reviews') {
    var sh = ss_().getSheetByName('Reviews');
    var out = [];
    if (sh && sh.getLastRow() > 1) {
      var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
      for (var i = rows.length - 1; i >= 0; i--) {
        if (String(rows[i][5]).toLowerCase().trim() === 'yes') {
          out.push({ name: rows[i][1], rating: rows[i][2], piece: rows[i][3], text: rows[i][4] });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput('kroshiaura API is running');
}
