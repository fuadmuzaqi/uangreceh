import { createClient } from '@libsql/client';

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
    // AMBIL DATA
    if (method === 'GET') {
      const result = await client.execute("SELECT * FROM transactions ORDER BY id DESC");
      return res.status(200).json(result.rows);
    } 

    // TAMBAH DATA
    if (method === 'POST') {
      const { type, amount, person, note, month } = req.body;
      await client.execute({
        sql: "INSERT INTO transactions (type, amount, person, note, month) VALUES (?, ?, ?, ?, ?)",
        args: [type, parseInt(amount), person, note, month]
      });
      return res.status(201).json({ success: true });
    }

    // UPDATE DATA (EDIT)
    if (method === 'PUT') {
      const { id, type, amount, person, note, month } = req.body;
      await client.execute({
        sql: "UPDATE transactions SET type = ?, amount = ?, person = ?, note = ?, month = ? WHERE id = ?",
        args: [type, parseInt(amount), person, note, month, parseInt(id)]
      });
      return res.status(200).json({ success: true });
    }

    // HAPUS DATA
    if (method === 'DELETE') {
      const { id } = req.body;
      await client.execute({
        sql: "DELETE FROM transactions WHERE id = ?",
        args: [parseInt(id)]
      });
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
