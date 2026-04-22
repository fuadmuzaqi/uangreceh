export default function handler(req, res) {
  res.status(200).json({
    ACCESS_CODE: process.env.ACCESS_CODE,
    GS_API: process.env.GS_API
  });
}
