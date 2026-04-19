export default function handler(req, res) {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const keyPreview = hasKey 
    ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' 
    : 'NOT SET';
  
  return res.status(200).json({ 
    status: 'Serverless function is working!',
    apiKeyConfigured: hasKey,
    keyPreview: keyPreview,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
}
