import fs from 'fs';
import path from 'path';
import { getGoogleAccessToken, getServiceAccountCredentials } from './googleAuth.js';

/**
 * Test Google Drive API access and verify parent folder ID.
 */
export async function testDriveConnection(customParentId = null) {
  try {
    const creds = getServiceAccountCredentials();
    if (!creds) {
      return {
        success: false,
        configured: false,
        message: 'ยังไม่ได้ตั้งค่า Google Service Account Credentials'
      };
    }

    const token = await getGoogleAccessToken();
    const parentId = customParentId || process.env.GOOGLE_DRIVE_PARENT_ID || process.env.PARENT_FOLDER_ID;

    if (!parentId) {
      return {
        success: true,
        configured: true,
        authenticated: true,
        hasParentFolder: false,
        clientEmail: creds.client_email,
        message: 'เชื่อมต่อ Google Service Account สำเร็จ (ยังไม่ได้ระบุ GOOGLE_DRIVE_PARENT_ID)'
      };
    }

    // Verify parent folder metadata
    const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name,mimeType,webViewLink`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!folderRes.ok) {
      const errText = await folderRes.text();
      return {
        success: false,
        configured: true,
        authenticated: true,
        hasParentFolder: false,
        parentId,
        clientEmail: creds.client_email,
        message: `เข้าถึงโฟลเดอร์ Google Drive ไม่ได้ (${folderRes.status}): กรุณาแชร์สิทธิ์โฟลเดอร์ให้ ${creds.client_email}`
      };
    }

    const folderData = await folderRes.json();
    return {
      success: true,
      configured: true,
      authenticated: true,
      hasParentFolder: true,
      folderId: folderData.id,
      folderName: folderData.name,
      folderUrl: folderData.webViewLink || `https://drive.google.com/drive/folders/${folderData.id}`,
      clientEmail: creds.client_email,
      message: `เชื่อมต่อโฟลเดอร์ "${folderData.name}" บน Google Drive เรียบร้อยแล้ว`
    };
  } catch (error) {
    return {
      success: false,
      configured: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive: ${error.message}`
    };
  }
}

/**
 * Finds or creates a subfolder (e.g. "2026-08" or workspace name) inside parentFolderId
 */
export async function ensureFolder(folderName, parentFolderId) {
  if (!parentFolderId) return null;

  const token = await getGoogleAccessToken();

  // 1. Search for existing folder
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // 2. Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  if (createRes.ok) {
    return await createRes.json();
  }

  console.warn('⚠️ Could not create Google Drive subfolder, fallback to parent folder.');
  return { id: parentFolderId };
}

/**
 * Uploads a bank slip or receipt image to Google Drive
 */
export async function uploadSlipToDrive({
  imageInput,
  filename,
  mimeType = 'image/jpeg',
  dateStr = null,
  workspaceName = 'ร้านขายของฝากไร่ธนโชติ',
  customParentId = null
}) {
  try {
    const parentFolderId = customParentId || process.env.GOOGLE_DRIVE_PARENT_ID || process.env.PARENT_FOLDER_ID;
    const scriptUrl = process.env.GOOGLE_DRIVE_UPLOAD_SCRIPT_URL;

    // Prepare image buffer and Base64
    let imageBuffer = null;
    let base64Data = '';
    if (Buffer.isBuffer(imageInput)) {
      imageBuffer = imageInput;
      base64Data = imageInput.toString('base64');
    } else if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:image')) {
        base64Data = imageInput.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (fs.existsSync(imageInput)) {
        imageBuffer = fs.readFileSync(imageInput);
        base64Data = imageBuffer.toString('base64');
      } else {
        const resolved = path.resolve(imageInput);
        if (fs.existsSync(resolved)) {
          imageBuffer = fs.readFileSync(resolved);
          base64Data = imageBuffer.toString('base64');
        } else {
          return { success: false, message: 'Image file does not exist on disk' };
        }
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return { success: false, message: 'Invalid or empty image buffer' };
    }

    const safeFilename = filename || `slip_${Date.now()}.jpg`;

    // 1. Upload via Google Apps Script Web App (Uses user's own Drive storage quota)
    if (scriptUrl && base64Data) {
      try {
        const yearMonth = (dateStr ? dateStr.slice(0, 7) : new Date().toISOString().slice(0, 7));
        const subfolderName = `สลิปและใบเสร็จ_${yearMonth}`;

        console.log(`☁️ [Google Drive] Uploading slip to subfolder "${subfolderName}" via Google Apps Script...`);
        const scriptRes = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            folderId: parentFolderId,
            subfolder: subfolderName,
            base64: base64Data,
            filename: safeFilename,
            mimeType: mimeType
          })
        });

        if (scriptRes.ok) {
          const result = await scriptRes.json();
          if (result.success) {
            console.log(`   [Google Drive ✅] Uploaded slip successfully: ${result.url}`);
            return {
              success: true,
              fileId: result.fileId,
              webViewLink: result.url,
              name: safeFilename
            };
          } else {
            console.warn('⚠️ Google Apps Script error:', result.error);
          }
        }
      } catch (scriptErr) {
        console.warn('⚠️ Google Apps Script upload warning:', scriptErr.message);
      }
    }

    const creds = getServiceAccountCredentials();
    if (!creds) {
      return { success: false, message: 'Google Service Account credentials missing' };
    }

    const token = await getGoogleAccessToken();

    let targetFolderId = parentFolderId;
    if (parentFolderId) {
      const yearMonth = (dateStr ? dateStr.slice(0, 7) : new Date().toISOString().slice(0, 7));
      const monthlyFolder = await ensureFolder(`สลิปและใบเสร็จ_${yearMonth}`, parentFolderId);
      if (monthlyFolder && monthlyFolder.id) {
        targetFolderId = monthlyFolder.id;
      }
    }

    // Metadata payload
    const metadata = {
      name: safeFilename,
      mimeType: mimeType
    };
    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaHeaderPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

    const payload = Buffer.concat([
      Buffer.from(metadataPart, 'utf8'),
      Buffer.from(mediaHeaderPart, 'utf8'),
      imageBuffer,
      Buffer.from(closeDelimiter, 'utf8')
    ]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(payload.length)
      },
      body: payload
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      if (errText.includes('storageQuotaExceeded')) {
        console.warn('   [ℹ️ Google Drive] บัญชี Service Account ทั่วไปมีข้อจำกัดโควต้าไฟล์ของ Google (จัดเก็บสำรองในระบบโลคอล /uploads เรียบร้อย 100%)');
      } else {
        console.warn(`   [⚠️ Google Drive] Upload warning (${uploadRes.status}):`, errText);
      }
      return { success: false, error: errText };
    }

    const fileData = await uploadRes.json();

    // Make viewable
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (permErr) {
      // Non-blocking if organization policy forbids public sharing
    }

    const webViewLink = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;

    console.log(`☁️ [Google Drive ✅] Uploaded slip to Drive: "${safeFilename}" (ID: ${fileData.id})`);
    console.log(`   ↳ Link: ${webViewLink}`);

    return {
      success: true,
      fileId: fileData.id,
      fileName: fileData.name,
      webViewLink,
      webContentLink: fileData.webContentLink,
      thumbnailLink: fileData.thumbnailLink,
      folderId: targetFolderId
    };
  } catch (error) {
    console.error('❌ uploadSlipToDrive Exception:', error);
    return { success: false, error: error.message };
  }
}
