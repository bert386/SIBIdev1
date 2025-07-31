export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    console.log("✅ API hit at", new Date().toISOString());
    res.status(200).json({ message: "API working. Ready for next steps." });
  } catch (err) {
    console.error("❌ Error in handler:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
