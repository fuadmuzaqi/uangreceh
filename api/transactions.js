export default async function handler(req, res) {
  const { method } = req;
  const accessCode = req.headers['x-access-code'];

  // Validasi Kode Akses
  if (accessCode !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Akses ditolak' });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  async function queryTurso(statements) {
    const response = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: statements })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  try {
    // AMBIL DATA
    if (method === 'GET') {
      const result = await queryTurso([
        { type: "execute", stmt: { sql: "SELECT * FROM transactions ORDER BY id DESC" } },
        { type: "close" }
      ]);
      const rows = result.results[0].response.result.rows.map(row => {
        const cols = result.results[0].response.result.cols;
        let obj = {};
        row.forEach((val, i) => obj[cols[i].name] = val);
        return obj;
      });
      return res.status(200).json(rows);
    }

    // TAMBAH DATA
    if (method === 'POST') {
      const { type, amount, person, note, month } = req.body;
      await queryTurso([
        { 
          type: "execute", 
          stmt: { 
            sql: "INSERT INTO transactions (type, amount, person, note, month) VALUES (?, ?, ?, ?, ?)",
            args: [
              { type: "text", value: type },
              { type: "integer", value: String(amount) },
              { type: "text", value: person },
              { type: "text", value: note },
              { type: "text", value: month }
            ]
          } 
        },
        { type: "close" }
      ]);
      return res.status(201).json({ success: true });
    }

    // EDIT DATA
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

    // HAPUS DATA
    if (method === 'DELETE') {
      const { id } = req.body;
      await queryTurso([
        { 
          type: "execute", 
          stmt: { sql: "DELETE FROM transactions WHERE id = ?", args: [{ type: "integer", value: String(id) }] } 
        },
        { type: "close" }
      ]);
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database Error" });
  }
}
