export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Placeholder: handle image upload and OpenAI API call
  res.status(200).json({ message: 'Image received and processing started.' });
}
