// api/jsonbin.js
// Sederhana: proxy serverless ke JSONBin.
// ENV yang dibutuhkan (set di Vercel): JSONBIN_API_KEY, JSONBIN_BIN_ID

export default async function handler(req, res) {
  const { method } = req;
  const API_KEY = process.env.JSONBIN_API_KEY;
  const BIN_ID  = process.env.JSONBIN_BIN_ID;

  if (!API_KEY || !BIN_ID) {
    return res.status(500).json({ error: 'Missing JSONBIN_API_KEY or JSONBIN_BIN_ID env.' });
  }

  const base = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Master-Key': API_KEY,
  };

  try {
    if (method === 'GET') {
      // Ambil dokumen terbaru
      const r = await fetch(`${base}/latest`, { headers });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

    if (method === 'POST') {
      // Tambah 1 item ke array items
      const body = await readJson(req);
      // format diharapkan: { item: {...} } atau { item: "teks" }
      const latest = await fetch(`${base}/latest`, { headers });
      const latestJson = await latest.json();

      // Struktur dokumen di JSONBin diasumsikan: { items: [] }
      const doc = latestJson.record || { items: [] };
      if (!Array.isArray(doc.items)) doc.items = [];

      const newItem = body?.item ?? { note: 'empty' };
      doc.items.push({ ...newItem, _ts: Date.now() });

      const put = await fetch(base, {
        method: 'PUT',
        headers,
        body: JSON.stringify(doc),
      });
      const result = await put.json();
      return res.status(put.status).json(result);
    }

    if (method === 'PUT') {
      // Replace seluruh dokumen (kamu kirim body final)
      const body = await readJson(req);
      const put = await fetch(base, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body || {}),
      });
      const result = await put.json();
      return res.status(put.status).json(result);
    }

    if (method === 'DELETE') {
      // Reset ke dokumen kosong standar
      const emptyDoc = { items: [] };
      const put = await fetch(base, {
        method: 'PUT',
        headers,
        body: JSON.stringify(emptyDoc),
      });
      const result = await put.json();
      return res.status(put.status).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
