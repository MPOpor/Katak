import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Current active session user (in-memory mock session for easy testing, defaults to Nicha)
let currentUserId = 'usr_nicha';

export function getCurrentUserId() {
  return currentUserId;
}

// Get all available users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    res.json({ success: true, data: users, currentUserId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user profile
router.get('/current', (req, res) => {
  try {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);
    if (!user) {
      user = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get()
        || db.prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 1').get();
      if (user) {
        currentUserId = user.id;
      }
    }
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Switch current user
router.post('/switch-user', (req, res) => {
  try {
    const { userId } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    currentUserId = userId;
    res.json({ success: true, message: `Switched user to ${user.display_name}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// GOOGLE OAUTH 2.0 LOGIN & AUTHENTICATION
// -----------------------------------------------------------------------------

// 1. Get Google OAuth Configuration & Client ID
router.get('/google/config', (req, res) => {
  const clientId = process.env.GOOGLE_OAUTH2_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  res.json({
    success: true,
    data: {
      isConfigured: !!clientId,
      clientId: clientId || null
    }
  });
});

// 2. Google OAuth Login Endpoint (ID Token or Auth Code or Profile)
router.post('/google/login', async (req, res) => {
  try {
    const { credential, idToken, code, mockProfile } = req.body;
    let googleUser = null;

    const targetToken = idToken || credential;

    // A. Verify Google ID Token via Google Tokeninfo API
    if (targetToken) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${targetToken}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          googleUser = {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };
        }
      } catch (err) {
        console.warn('⚠️ Google token verification failed:', err.message);
      }
    }

    // B. Exchange Authorization Code for Profile (if code provided)
    if (!googleUser && code) {
      const clientId = process.env.GOOGLE_OAUTH2_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
      const redirectUri = (process.env.PUBLIC_APP_URL || 'http://localhost:5000') + '/api/auth/google/callback';

      if (clientId && clientSecret) {
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
            })
          });

          if (tokenRes.ok) {
            const tokens = await tokenRes.json();
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            if (userinfoRes.ok) {
              googleUser = await userinfoRes.json();
            }
          }
        } catch (e) {
          console.warn('⚠️ Google code exchange failed:', e.message);
        }
      }
    }

    // C. Fallback: Mock / Simulated Google Profile (for local dev testing)
    if (!googleUser && mockProfile) {
      googleUser = {
        sub: mockProfile.sub || 'google_' + Date.now().toString(36),
        email: mockProfile.email || 'user@gmail.com',
        name: mockProfile.name || 'ผู้ใช้ Google',
        picture: mockProfile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };
    }

    if (!googleUser || (!googleUser.email && !googleUser.sub)) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถตรวจสอบข้อมูลบัญชี Google ได้ กรุณาลองใหม่อีกครั้ง'
      });
    }

    // Find existing user by Google ID or Email
    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR (email IS NOT NULL AND email = ?)').get(googleUser.sub, googleUser.email);

    if (!user) {
      const newId = 'usr_g_' + Date.now().toString(36);
      db.prepare(`
        INSERT INTO users (id, google_id, email, display_name, picture_url, role, status)
        VALUES (?, ?, ?, ?, ?, 'user', 'active')
      `).run(
        newId,
        googleUser.sub,
        googleUser.email || null,
        googleUser.name || 'ผู้ใช้ Google',
        googleUser.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      );

      // Add to default workspace
      db.prepare(`
        INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, can_add, can_edit, can_delete, can_view_reports)
        VALUES (?, 'ws_thanachote', ?, 'member', 1, 1, 0, 1)
      `).run('wm_' + Date.now().toString(36), newId);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    } else {
      // Update Google ID and picture if empty
      db.prepare(`
        UPDATE users SET google_id = COALESCE(google_id, ?), email = COALESCE(email, ?), picture_url = COALESCE(picture_url, ?), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(googleUser.sub, googleUser.email, googleUser.picture, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    currentUserId = user.id;

    // Log to Audit
    db.prepare(`
      INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_id, details)
      VALUES (?, 'ws_thanachote', ?, 'google_login', ?, ?)
    `).run('aud_' + Date.now(), user.id, user.id, `เข้าสู่ระบบด้วย Google Account (${googleUser.email || user.display_name}) สำเร็จ`);

    res.json({
      success: true,
      message: `เข้าสู่ระบบด้วย Google สำเร็จ: ${user.display_name}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// LINE Login callback
router.post('/line-login', (req, res) => {
  try {
    const { lineUserId, displayName, pictureUrl } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ success: false, error: 'lineUserId is required' });
    }

    let user = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(lineUserId);
    if (!user) {
      const newId = 'usr_' + Date.now().toString(36);
      db.prepare(`
        INSERT INTO users (id, line_user_id, display_name, picture_url, role, status)
        VALUES (?, ?, ?, ?, 'user', 'active')
      `).run(newId, lineUserId, displayName || 'ผู้ใช้ LINE', pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    }

    currentUserId = user.id;
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
