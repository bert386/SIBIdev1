
export default function handler(req, res) {
  console.log("✅ Ping route hit");
  res.status(200).json({ message: "pong" });
}
