const { getRecentResponses, getStats } = require('./db/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'GET') {
    try {
      const responses = await getRecentResponses(50);
      const stats = await getStats();
      
      return res.status(200).json({ 
        stats, 
        responses: responses.map(r => ({
          id: r.id,
          timestamp: r.submission_timestamp,
          phone: r.flow_token,
          responses: {
            q1_rating: r.q1_rating,
            q1_comment: r.q1_comment,
            q2_rating: r.q2_rating,
            q2_comment: r.q2_comment,
            q3_followup: r.q3_followup,
            q4_rating: r.q4_rating,
            q4_comment: r.q4_comment,
            q5_rating: r.q5_rating,
            q5_comment: r.q5_comment,
            final_comments: r.final_comments
          },
          analytics: {
            satisfaction_score: r.satisfaction_score,
            sentiment: r.sentiment,
            is_promoter: r.is_promoter,
            is_detractor: r.is_detractor,
            needs_followup: r.needs_followup
          }
        }))
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
