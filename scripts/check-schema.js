const { neon } = require('@neondatabase/serverless');

async function checkSchema() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'survey_responses' 
      ORDER BY ordinal_position
    `;
    
    console.log('Current database schema:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
