const { getRecentResponses, getStats } = require('./db/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'GET') {
    try {
      const responses = await getRecentResponses(50);
      const stats = await getStats();
      
      console.log('📊 Sending response with', responses.length, 'items');
      if (responses.length > 0) {
        console.log('📋 Sample response structure:', JSON.stringify(responses[0], null, 2));
      }
      
      // getRecentResponses already returns the properly structured data
      return res.status(200).json({ 
        stats, 
        responses
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
