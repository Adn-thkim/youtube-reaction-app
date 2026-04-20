import http from 'node:http';
import { URL } from 'node:url';
import { loadLocalEnv } from './loadEnv.js';
import { runSearchPipeline } from './services/searchPipeline.js';

loadLocalEnv();

const PORT = Number(process.env.SERVER_PORT || 4000);
const HOST = process.env.SERVER_HOST || '127.0.0.1';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    const error = new Error('요청 본문이 유효한 JSON 형식이 아닙니다.');
    error.statusCode = 400;
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, port: PORT });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/search') {
      const body = await readJsonBody(req);
      const result = await runSearchPipeline(body);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { message: '요청한 경로를 찾을 수 없습니다.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      message: error.message || '서버 오류가 발생했습니다.',
      code: error.code || 'SERVER_ERROR',
      details: error.details || null,
    });
  }
});

server.on('error', (error) => {
  console.error('[server] failed to start', {
    message: error.message,
    code: error.code,
    port: PORT,
    host: HOST,
  });
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.info(`[server] http://${HOST}:${PORT}`);
});
