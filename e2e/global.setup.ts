import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authDir = path.join(__dirname, '../.auth');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Helper to generate a valid mock token structure for offline testing
function generateMockToken(role: string, email: string, id: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id,
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64url');
  const signature = Buffer.from('mock_signature_teh_baling_2026').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

setup('global auth setup', async ({ request }) => {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 1. Authenticate Admin
  let adminToken = generateMockToken('ADMIN', 'admin@tehbaling.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  try {
    const adminRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@tehbaling.com', password: 'password123' },
    });
    const adminBody = await adminRes.json();
    if (adminBody.success && adminBody.data?.accessToken) {
      adminToken = adminBody.data.accessToken;
    }
  } catch {
    console.log('Using valid mock admin token');
  }

  const adminState = {
    cookies: [
      {
        name: 'access_token',
        value: adminToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          { name: 'access_token', value: adminToken },
          {
            name: 'auth_user',
            value: JSON.stringify({
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              name: 'Pak Budi (Owner)',
              email: 'admin@tehbaling.com',
              role: 'ADMIN',
            }),
          },
        ],
      },
    ],
  };
  fs.writeFileSync(path.join(authDir, 'admin.json'), JSON.stringify(adminState, null, 2));

  // 2. Authenticate Attendant
  let attendantToken = generateMockToken('BOOTH_ATTENDANT', 'rina@tehbaling.com', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
  try {
    const attendantRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'rina@tehbaling.com', password: 'password123' },
    });
    const attendantBody = await attendantRes.json();
    if (attendantBody.success && attendantBody.data?.accessToken) {
      attendantToken = attendantBody.data.accessToken;
    }
  } catch {
    console.log('Using valid mock attendant token');
  }

  const attendantState = {
    cookies: [
      {
        name: 'access_token',
        value: attendantToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          { name: 'access_token', value: attendantToken },
          {
            name: 'auth_user',
            value: JSON.stringify({
              id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
              name: 'Rina (Penjaga Booth 1)',
              email: 'rina@tehbaling.com',
              role: 'BOOTH_ATTENDANT',
            }),
          },
        ],
      },
    ],
  };
  fs.writeFileSync(path.join(authDir, 'attendant.json'), JSON.stringify(attendantState, null, 2));

  // 3. Authenticate Production
  let prodToken = generateMockToken('PRODUCTION', 'joko@tehbaling.com', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44');
  try {
    const prodRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'joko@tehbaling.com', password: 'password123' },
    });
    const prodBody = await prodRes.json();
    if (prodBody.success && prodBody.data?.accessToken) {
      prodToken = prodBody.data.accessToken;
    }
  } catch {
    console.log('Using valid mock production token');
  }

  const prodState = {
    cookies: [
      {
        name: 'access_token',
        value: prodToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          { name: 'access_token', value: prodToken },
          {
            name: 'auth_user',
            value: JSON.stringify({
              id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
              name: 'Mas Joko (Staf Produksi)',
              email: 'joko@tehbaling.com',
              role: 'PRODUCTION',
            }),
          },
        ],
      },
    ],
  };
  fs.writeFileSync(path.join(authDir, 'production.json'), JSON.stringify(prodState, null, 2));
});
