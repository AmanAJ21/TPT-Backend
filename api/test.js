// Simple test endpoint for Vercel
module.exports = (req, res) => {
  res.json({
    message: 'Vercel deployment test successful!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    method: req.method,
    url: req.url
  });
};