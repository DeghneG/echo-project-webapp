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
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are an expert in Philippine currency. Analyze this image of a Philippine Peso bill (New Generation Currency). 
                Provide:
                - Denomination (20, 50, 100, 200, 500, 1000)
                - Explanation of colors/portraits seen.
                
                Respond ONLY as JSON: {"denomination": number, "explanation": "string"}.
                If unsure, set denomination to 0.`
              },
              {
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
              }
            ]
          }],
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok || data.error) {
      return res.status(502).json({ error: data?.error?.message || 'Gemini API Error' });
    }

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      return res.status(200).json({ result: { denomination: 0, explanation: "AI blocked image for safety. Try better lighting." } });
    }

    let text = candidate?.content?.parts?.[0]?.text || '{}';
    
    // Robust JSON Extraction (in case AI adds text around it or markdown tags)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse failure:", text);
      return res.status(502).json({ error: "AI response format error. Please try again." });
    }
    
    return res.status(200).json({ result: parsed });
  } catch (err) {
    console.error("DEBUG api/scan error:", err.message);
    return res.status(500).json({ error: `Connection failed: ${err.message}` });
  }
}
