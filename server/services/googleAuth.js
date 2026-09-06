import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Parses and returns Google Service Account Credentials from environment or file.
 */
export function getServiceAccountCredentials() {
  // 1. Check environment variable GOOGLE_SERVICE_ACCOUNT_JSON
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      const parsed = typeof envJson === 'object' ? envJson : JSON.parse(envJson);
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch (e) {
      console.warn('⚠️ Could not parse GOOGLE_SERVICE_ACCOUNT_JSON env variable:', e.message);
    }
  }

  // 2. Check service-account.json files in various paths
  const candidatePaths = [
    path.resolve(__dirname, '../../service-account.json'),
    path.resolve(__dirname, '../service-account.json'),
    path.resolve(__dirname, '../../credentials/service-account.json'),
    path.resolve(__dirname, '../../../service-account.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.client_email && parsed.private_key) {
          return parsed;
        }
      } catch (err) {
        console.warn(`⚠️ Error reading credentials from ${p}:`, err.message);
      }
    }
  }

  return null;
}

/**
 * Base64URL encoding helper
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates an OAuth 2.0 Access Token using the Service Account RSA-SHA256 JWT
 */
export async function getGoogleAccessToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid
  if (!forceRefresh && cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  const creds = getServiceAccountCredentials();
  if (!creds) {
    throw new Error('Google Service Account credentials not found in GOOGLE_SERVICE_ACCOUNT_JSON or service-account.json');
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' ');

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: creds.private_key_id
  };

  const claimSet = {
    iss: creds.client_email,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  // Sign with RSA private key
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(creds.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for OAuth2 Access Token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to obtain Google access token (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);

  return cachedAccessToken;
}
