import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { method } = req;
  const accessCode = req.headers['x-access-code'];

  // Proteksi sederhana
  if (accessCode !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Akses ditolak' });
  }

  try {
    if (method === 'GET') {
      const result = await client.execute("SELECT * FROM transactions ORDER BY timestamp DESC");
      return res.status(200).json(result.rows);
    } 

    if (method === 'POST') {
      const { type, amount, person, note, month } = req.body;
      await client.execute({
        sql: "INSERT INTO transactions (type, amount, person, note, month) VALUES (?, ?, ?, ?, ?)",
        args: [type, amount, person, note, month]
      });
      return res.status(201).json({ message: 'Berhasil disimpan' });
    }

    if (method === 'DELETE') {
      const { id } = req.body;
      await client.execute({
        sql: "DELETE FROM transactions WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ message: 'Berhasil dihapus' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
