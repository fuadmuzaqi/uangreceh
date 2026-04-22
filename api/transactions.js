import { createClient } from '@libsql/client';

// Inisialisasi client di luar handler agar bisa digunakan kembali (warm start)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { method } = req;
  const accessCode = req.headers['x-access-code'];

  if (accessCode !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Akses ditolak' });
  }

  try {
    if (method === 'GET') {
      const result = await client.execute("SELECT * FROM transactions ORDER BY id DESC");
      return res.status(200).json(result.rows);
    } 

    if (method === 'POST') {
      const { type, amount, person, note, month } = req.body;
      
      // Gunakan execute biasa tanpa 'args' jika masih ada kendala, 
      // tapi format ini adalah yang paling standar & aman:
      await client.execute({
        sql: "INSERT INTO transactions (type, amount, person, note, month) VALUES (?, ?, ?, ?, ?)",
        args: [type, parseInt(amount), person, note, month]
      });
      
      return res.status(201).json({ success: true });
    }

    if (method === 'DELETE') {
      const { id } = req.body;
      await client.execute({
        sql: "DELETE FROM transactions WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    // Log error lengkap di Vercel untuk debugging
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
