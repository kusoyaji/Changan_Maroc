const { getAllResponses } = require('./db/postgres');

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  
  const translations = {
    '5_etoiles': '⭐⭐⭐⭐⭐',
    '4_etoiles': '⭐⭐⭐⭐',
    '3_etoiles': '⭐⭐⭐',
    '2_etoiles': '⭐⭐',
    '1_etoile': '⭐',
    'oui': 'Oui',
    'non': 'Non',
    'positive': 'Positif',
    'negative': 'Negatif',
    'neutral': 'Neutre'
  };
  
  return translations[value] || value;
}

function convertToCSV(data) {
  const headers = [
    'ID', 'Date', 'Heure', 'Téléphone',
    'Q1 Accueil', 'Q1 Commentaire', 'Q2 Livraison', 'Q2 Commentaire',
    'Q3 Suivi 48h', 'Q4 Conseiller', 'Q4 Commentaire',
    'Q5 Marque Deepal', 'Q5 Commentaire', 'Remarques Finales',
    'Score Satisfaction (%)', 'Promoteur', 'Detracteur', 'Suivi Requis', 'Sentiment',
    'Jour Semaine', 'Semaine', 'Mois', 'Année', 'Heure du jour'
  ];

  const rows = data.map(row => [
    row.id,
    new Date(row.created_at).toLocaleDateString('fr-FR'),
    new Date(row.created_at).toLocaleTimeString('fr-FR'),
    row.phone_number || '',
    formatValue(row.q1_rating),
    row.q1_comment || '',
    formatValue(row.q2_rating),
    row.q2_comment || '',
    formatValue(row.q3_followup),
    formatValue(row.q4_rating),
    row.q4_comment || '',
    formatValue(row.q5_rating),
    row.q5_comment || '',
    row.final_comments || '',
    row.satisfaction_score ? Math.round(row.satisfaction_score * 100) : '',
    formatValue(row.is_promoter),
    formatValue(row.is_detractor),
    formatValue(row.needs_followup),
    formatValue(row.sentiment),
    row.day_of_week || '',
    row.week_number || '',
    row.month || '',
    row.year || '',
    row.hour_of_day || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(','))
  ].join('\n');

  return '\uFEFF' + csvContent; // UTF-8 BOM for Excel
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    try {
      const responses = await getAllResponses();
      const csv = convertToCSV(responses);
      const filename = `survey-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error('Error exporting data:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
