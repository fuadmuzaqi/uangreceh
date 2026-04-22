export default function handler(req, res) {
  const { code } = req.body;

  // Bandingkan kode dari user dengan Environment Variable di Vercel
  if (code === process.env.ACCESS_CODE) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: 'Kode salah!' });
  }
}
