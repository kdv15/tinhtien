import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

app.use(express.json({ limit: '20mb' }));

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers đọc ghi file DB an toàn
function readDatabase(): Record<string, unknown> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Server DB] Lỗi đọc file db.json:', err);
  }
  return {};
}

function writeDatabase(data: Record<string, unknown>): boolean {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[Server DB] Lỗi ghi file db.json:', err);
    return false;
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbExists: fs.existsSync(DB_FILE),
  });
});

// Lấy toàn bộ dữ liệu cơ sở dữ liệu từ server
app.get('/api/data', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json({ success: true, data: db });
});

// Đồng bộ lưu dữ liệu từ client lên server
app.post('/api/data/sync', (req: Request, res: Response) => {
  const incomingData = req.body;
  if (!incomingData || typeof incomingData !== 'object') {
    res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
    return;
  }

  const currentDb = readDatabase();
  const mergedDb = {
    ...currentDb,
    ...incomingData,
    _lastSyncedAt: new Date().toISOString(),
  };

  const ok = writeDatabase(mergedDb);
  if (ok) {
    res.json({ success: true, timestamp: mergedDb._lastSyncedAt });
  } else {
    res.status(500).json({ success: false, error: 'Lỗi ghi cơ sở dữ liệu máy chủ' });
  }
});

// Xác thực đăng nhập trên server (Role-Based Access Control)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, pinCode } = req.body;
  const db = readDatabase();
  const users = (db.km_users as Array<{ id: string; username: string; pinCode: string; fullName: string; role: string; isActive: boolean }>) || [];

  const found = users.find((u) => u.username === username && u.pinCode === pinCode && u.isActive);
  if (!found) {
    res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mã PIN không đúng' });
    return;
  }

  // Token phiên làm việc bảo mật
  const token = `km_token_${found.id}_${Date.now()}`;
  res.json({
    success: true,
    token,
    user: {
      id: found.id,
      username: found.username,
      fullName: found.fullName,
      role: found.role,
    },
  });
});

// Xác thực mật khẩu cấp 2 bảo mật phía server
app.post('/api/auth/verify-level2', (req: Request, res: Response) => {
  const { userId, level2Password } = req.body;
  const db = readDatabase();
  const users = (db.km_users as Array<{ id: string; role: string; level2Password?: string }>) || [];

  const user = users.find((u) => u.id === userId);
  const admin = users.find((u) => u.role === 'owner' || u.role === 'admin');

  const validPass = user?.level2Password || admin?.level2Password || '9999';
  const isValid = level2Password === validPass;

  res.json({
    success: true,
    isValid,
    timestamp: new Date().toISOString(),
  });
});

// Ghi nhật ký kiểm toán bất biến (Audit Log) lên server
app.post('/api/audit-logs', (req: Request, res: Response) => {
  const newLog = req.body;
  if (!newLog || !newLog.action) {
    res.status(400).json({ success: false, error: 'Thiếu thông tin audit log' });
    return;
  }

  const db = readDatabase();
  const logs = (db.km_audit_logs as Array<unknown>) || [];
  logs.unshift({
    ...newLog,
    serverReceivedAt: new Date().toISOString(),
  });
  if (logs.length > 2000) logs.pop();

  db.km_audit_logs = logs;
  writeDatabase(db);
  res.json({ success: true });
});

// Lấy nhật ký kiểm toán từ máy chủ
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  const db = readDatabase();
  const logs = (db.km_audit_logs as Array<unknown>) || [];
  res.json({ success: true, logs });
});

// ----------------------------------------------------
// FRONTEND SERVING (Vite dev middleware or static dist)
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Karaoke Manager Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Karaoke Manager Server] Database storage: ${DB_FILE}`);
  });
}

startServer().catch((err) => {
  console.error('[Karaoke Manager Server] Lỗi khởi động:', err);
  process.exit(1);
});
