// Migration script to update database schema
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Starting database migration...');
  
  // Drop the old table
  console.log('Dropping old table...');
  await sql`DROP TABLE IF EXISTS survey_responses`;
  
  // Create new table with correct schema
  console.log('Creating new table with updated schema...');
  await sql`
    CREATE TABLE survey_responses (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      flow_token VARCHAR(255),
      phone_number VARCHAR(50),
      
      q1_rating VARCHAR(50),
      q1_comment TEXT,
      q2_rating VARCHAR(50),
      q2_comment TEXT,
      q3_followup VARCHAR(10),
      q4_rating VARCHAR(50),
      q4_comment TEXT,
      q5_rating VARCHAR(50),
      q5_comment TEXT,
      final_comments TEXT,
      
      satisfaction_score DECIMAL(3,2),
      is_promoter BOOLEAN,
      is_detractor BOOLEAN,
      needs_followup BOOLEAN,
      sentiment VARCHAR(20),
      
      submission_date DATE,
      submission_hour INTEGER,
      day_of_week INTEGER,
      week_number INTEGER,
      month INTEGER,
      year INTEGER,
      
      raw_data JSONB,
      response_time_seconds INTEGER
    )
  `;
  
  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
