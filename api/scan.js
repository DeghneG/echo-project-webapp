export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'No image data provided.' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are an expert in Philippine currency. Analyze this image of a Philippine Peso bill (New Generation Currency series). 
                Identify the denomination based on color, portraits, and security features:
                - 20: Orange, Manuel L. Quezon
                - 50: Red, Sergio Osmeña
                - 100: Violet/Mauve, Manuel Roxas
                - 200: Green, Diosdado Macapagal
                - 500: Yellow, Corazon & Benigno Aquino
                - 1000: Blue, Jose Abad Santos, Vicente Lim, Josefa Llanes Escoda
                
                Respond ONLY with a JSON object in this format: 
                {"denomination": number, "confidence": "high"|"low", "explanation": "brief reason"}
                If no bill is found or identification is impossible, set denomination to 0.`
              },
              {
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
              }
            ]
          }]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok || data.error) {
      return res.status(502).json({ error: data?.error?.message || 'Gemini API error' });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    // Clean JSON if AI added markdown backticks
    text = text.replace(/```json|```/g, '').trim();
    
    return res.status(200).json({ result: JSON.parse(text) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
