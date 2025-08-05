export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  console.log("📸 Image upload received");
  return res.status(200).json({ message: "Image received (placeholder)" });
}
