# kroshiaura: setup and troubleshooting

Files:
- `index.html` is your website. **This is the only file you upload to Netlify.**
- `Code.gs` is the backend that saves orders, custom requests and reviews into a Google Sheet.
- `SETUP.md` is this guide. Do not upload it to Netlify.

## 1. Backend (Google Sheet)

1. Create a Google Sheet called **kroshiaura orders**.
2. In that sheet, tap **Extensions > Apps Script**.
3. Delete the sample code, paste all of `Code.gs`, and tap **Save**.
4. Pick **testOrder** in the function dropdown and tap **Run**. Allow access when asked.
   An **Orders** tab with a TEST1 row should appear in the sheet. Delete that row afterwards.
   - If you see an error like "getSheetByName of null", the script is not linked to your sheet.
     Copy the sheet ID (the long text between `/d/` and `/edit` in the sheet's address)
     into `var SHEET_ID = '';` at the top of `Code.gs`, save, and run **testOrder** again.
5. Tap **Deploy > New deployment > Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Tap **Deploy** and copy the link ending in `/exec`.
6. Open the link in a browser. It should say "kroshiaura API is running".

## 2. Website

1. Open `index.html` in a text editor and check that `var SCRIPT_URL="...";` holds your `/exec` link.
2. Put `index.html` alone in a folder.
3. On Netlify, open your project, tap **Deploys**, and drag the folder onto the upload box.
4. Open the site in a private tab (or press Ctrl+F5) so you see the newest version.

## 3. Test everything

- Place a test order and tap **Share order on WhatsApp**. A row should appear in **Orders**.
- Send a test custom request with a photo. It should appear in **Custom requests**.
- Send a test review. It appears in **Reviews**. Type **yes** in its last column to show it on the site.
- Delete the test rows afterwards.

## 4. If the sheet is not updating

0. **Quick check:** open your `/exec` link with `?action=status` added at the end.
   You should see `"ok":true` and `"sheet":true`. If it only says "kroshiaura API is running", the new code is not deployed yet (see step 3 below). If `sheet` is false, copy the `error` text to Claude.

1. **Executions:** place a test order, then open **Executions** in the Apps Script sidebar.
   - Nothing listed: the live site is the old file, or `SCRIPT_URL` is wrong. Upload the latest `index.html`.
   - A failed entry: open it and read the error.
2. **Access:** the deployment must be set to **Who has access: Anyone**.
3. **Old version:** after any change to `Code.gs`, tap **Deploy > Manage deployments**, the pencil icon,
   set **Version** to **New version**, and **Deploy**. The link stays the same.

## 5. Everyday use

- **Orders tab:** check the payment in your UPI app, then type **Yes** under *Payment verified?* and update *Status*.
- **Product, price, photo or text changes:** get a new `index.html` and upload it to Netlify. No Apps Script change needed.
- Keep the Google Sheet **private**. It holds customer names, phones and addresses.

## Payments (current setup)

- Customers choose PhonePe, Google Pay, Paytm or another UPI app, or pay by QR.
- Some apps block payment links to personal UPI IDs. The QR option is the backup.
- Preset amounts and automatic payment confirmation need a merchant UPI account or a gateway such as Razorpay.
- Your UPI ID is built into `index.html` but never shown as text on the page.
