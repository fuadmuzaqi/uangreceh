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
    if (method === 'GET') {
      const result = await client.execute("SELECT * FROM transactions ORDER BY id DESC");
      return res.status(200).json(result.rows);
    } 

    if (method === 'POST') {
      const { type, amount, person, note, month } = req.body;
      
      // Menggunakan query string langsung untuk meminimalisir overhead protokol
      const query = {
        sql: "INSERT INTO transactions (type, amount, person, note, month) VALUES (?, ?, ?, ?, ?)",
        args: [type, parseInt(amount), person, note, month]
      };
      
      await client.execute(query);
      return res.status(201).json({ success: true });
    }
// ... (Bagian atas tetap sama seperti sebelumnya)

    if (method === 'PUT') {
      const { id, type, amount, person, note, month } = req.body;
      await queryTurso([
        { 
          type: "execute", 
          stmt: { 
            sql: "UPDATE transactions SET type = ?, amount = ?, person = ?, note = ?, month = ? WHERE id = ?",
            args: [
              { type: "text", value: type },
              { type: "integer", value: String(amount) },
              { type: "text", value: person },
              { type: "text", value: note },
              { type: "text", value: month },
              { type: "integer", value: String(id) }
            ]
          } 
        },
        { type: "close" }
      ]);
      return res.status(200).json({ success: true });
    }

// ... (Bagian DELETE dan error handling tetap sama)
    if (method === 'DELETE') {
      const { id } = req.body;
      await client.execute({
        sql: "DELETE FROM transactions WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error("Database Error Detail:", error);
    return res.status(500).json({ error: error.message });
  }
}
