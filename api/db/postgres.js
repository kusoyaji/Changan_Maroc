const { neon } = require('@neondatabase/serverless');

// Initialize Neon client with connection string from environment
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

/**
 * Calculate satisfaction score from survey responses
 * Returns 0.00 to 1.00 based on star ratings
 */
function calculateSatisfactionScore(data) {
  const ratings = [];
  
  // Map star ratings to scores
  const ratingMap = {
    '5_etoiles': 1.0,
    '4_etoiles': 0.75,
    '3_etoiles': 0.5,
    '2_etoiles': 0.25,
    '1_etoile': 0.0
  };
  
  if (data.q1_rating) ratings.push(ratingMap[data.q1_rating] || 0.5);
  if (data.q2_rating) ratings.push(ratingMap[data.q2_rating] || 0.5);
  if (data.q4_rating) ratings.push(ratingMap[data.q4_rating] || 0.5);
  if (data.q5_rating) ratings.push(ratingMap[data.q5_rating] || 0.5);
  
  if (ratings.length === 0) return 0.5;
  
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Determine if customer needs follow-up
 */
function needsFollowup(data) {
  // Any comments indicate need for followup
  if (data.q1_comment) return true;
  if (data.q2_comment) return true;
  if (data.q4_comment) return true;
  if (data.q5_comment) return true;
  if (data.final_comments) return true;
  
  // No 48h followup received
  if (data.q3_followup === 'non') return true;
  
  // Low ratings (1-2 stars)
  if (data.q1_rating === '1_etoile' || data.q1_rating === '2_etoiles') return true;
  if (data.q2_rating === '1_etoile' || data.q2_rating === '2_etoiles') return true;
  if (data.q4_rating === '1_etoile' || data.q4_rating === '2_etoiles') return true;
  if (data.q5_rating === '1_etoile' || data.q5_rating === '2_etoiles') return true;
  
  return false;
}

/**
 * Calculate sentiment from responses
 */
function calculateSentiment(data) {
  const score = calculateSatisfactionScore(data);
  
  if (score >= 0.75) return 'positive';
  if (score >= 0.40) return 'neutral';
  return 'negative';
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Store flow_token to phone_number mapping BEFORE sending Flow
 * This is how we link phone numbers to Flow responses
 */
async function storeFlowToken(flowToken, phoneNumber, customerName = null) {
  if (!sql) {
    console.log('⚠️  Database not configured');
    return { stored: false };
  }
  
  try {
    const result = await sql`
      INSERT INTO flow_token_mapping (flow_token, phone_number, customer_name)
      VALUES (${flowToken}, ${phoneNumber}, ${customerName})
      ON CONFLICT (flow_token) DO UPDATE
      SET phone_number = ${phoneNumber}, customer_name = ${customerName}
      RETURNING flow_token, phone_number, customer_name
    `;
    
    console.log(`✅ Stored flow token mapping in database`);
    return { stored: true, ...result[0] };
  } catch (error) {
    console.error('❌ Error storing flow token:', error);
    throw error;
  }
}

/**
 * Get phone number and customer name from flow_token mapping
 */
async function getPhoneFromToken(flowToken) {
  if (!sql) {
    return null;
  }
  
  try {
    const result = await sql`
      SELECT phone_number, customer_name, created_at
      FROM flow_token_mapping
      WHERE flow_token = ${flowToken}
      LIMIT 1
    `;
    
    if (result.length > 0) {
      // Mark as used
      await sql`
        UPDATE flow_token_mapping
        SET used = TRUE
        WHERE flow_token = ${flowToken}
      `;
      
      return {
        phone_number: result[0].phone_number,
        customer_name: result[0].customer_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting phone from token:', error);
    return null;
  }
}

async function initializeDatabase() {
  if (!sql) {
    console.log('⚠️  Database not configured - set DATABASE_URL environment variable');
    return false;
  }
  
  const sqlClient = neon(process.env.DATABASE_URL);
  
  try {
    // Create flow_token_mapping table
    await sqlClient`
      CREATE TABLE IF NOT EXISTS flow_token_mapping (
        flow_token VARCHAR(255) PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `;
    
    await sqlClient`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id SERIAL PRIMARY KEY,
        submission_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        flow_token VARCHAR(255),
        phone_number VARCHAR(50),
        customer_name VARCHAR(255),
        
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
      );
    `;
    
    // Try to add submission_timestamp column if it doesn't exist (allow NULL initially)
    try {
      await sqlClient`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='survey_responses' AND column_name='submission_timestamp'
          ) THEN
            ALTER TABLE survey_responses 
            ADD COLUMN submission_timestamp TIMESTAMP WITH TIME ZONE;
            
            -- Backfill with created_at
            UPDATE survey_responses 
            SET submission_timestamp = created_at 
            WHERE submission_timestamp IS NULL;
            
            -- Make it NOT NULL with default
            ALTER TABLE survey_responses 
            ALTER COLUMN submission_timestamp SET NOT NULL;
            
            ALTER TABLE survey_responses 
            ALTER COLUMN submission_timestamp SET DEFAULT NOW();
          END IF;
          
          -- Add customer_name column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='survey_responses' AND column_name='customer_name'
          ) THEN
            ALTER TABLE survey_responses 
            ADD COLUMN customer_name VARCHAR(255);
          END IF;
        END $$;
      `;
      console.log('✅ Added and configured submission_timestamp column');
    } catch (alterError) {
      console.log('ℹ️  submission_timestamp column configuration:', alterError.message);
    }
    
    // Add customer_name to flow_token_mapping if it doesn't exist
    try {
      await sqlClient`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='flow_token_mapping' AND column_name='customer_name'
          ) THEN
            ALTER TABLE flow_token_mapping 
            ADD COLUMN customer_name VARCHAR(255);
          END IF;
        END $$;
      `;
      console.log('✅ Added customer_name column to flow_token_mapping');
    } catch (alterError) {
      console.log('ℹ️  flow_token_mapping customer_name:', alterError.message);
    }
    
    console.log('✅ Database table initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

async function saveSurveyResponse(flowToken, data, providedPhoneNumber = null, providedCustomerName = null) {
  if (!sql) {
    console.log('⚠️  Database not configured');
    return { id: null };
  }
  
  try {
    const now = new Date();
    const satisfaction_score = calculateSatisfactionScore(data);
    const sentiment = calculateSentiment(data);
    const needs_followup_flag = needsFollowup(data);
    
    // Try to get phone number and customer name from multiple sources:
    // 1. Provided directly (from Chatwoot)
    // 2. From flow_token mapping (if sent via /api/send-flow)
    let phoneNumber = providedPhoneNumber;
    let customerName = providedCustomerName;
    
    if (!phoneNumber) {
      const tokenData = await getPhoneFromToken(flowToken);
      if (tokenData) {
        phoneNumber = tokenData.phone_number;
        customerName = customerName || tokenData.customer_name;
        console.log(`📞 Retrieved from flow_token mapping: ${phoneNumber} (${customerName || 'No name'})`);
      } else {
        console.log(`📞 NOT FOUND in flow_token mapping`);
      }
    } else {
      console.log(`📞 Using from Chatwoot: ${phoneNumber} (${customerName || 'No name'})`);
    }
    
    // NPS based on q5 (brand recommendation)
    const brandRating = data.q5_rating;
    const is_promoter = !!(brandRating === '5_etoiles' || brandRating === '4_etoiles');
    const is_detractor = !!(brandRating === '2_etoiles' || brandRating === '1_etoile');
    
    const result = await sql`
      INSERT INTO survey_responses (
        submission_timestamp,
        created_at,
        flow_token,
        phone_number,
        customer_name,
        q1_rating,
        q1_comment,
        q2_rating,
        q2_comment,
        q3_followup,
        q4_rating,
        q4_comment,
        q5_rating,
        q5_comment,
        final_comments,
        satisfaction_score,
        is_promoter,
        is_detractor,
        needs_followup,
        sentiment,
        submission_date,
        submission_hour,
        day_of_week,
        week_number,
        month,
        year,
        raw_data
      ) VALUES (
        ${now.toISOString()},
        ${now.toISOString()},
        ${flowToken || 'unknown'},
        ${phoneNumber || null},
        ${customerName || null},
        ${data.q1_rating || null},
        ${data.q1_comment || null},
        ${data.q2_rating || null},
        ${data.q2_comment || null},
        ${data.q3_followup || null},
        ${data.q4_rating || null},
        ${data.q4_comment || null},
        ${data.q5_rating || null},
        ${data.q5_comment || null},
        ${data.final_comments || null},
        ${satisfaction_score},
        ${is_promoter},
        ${is_detractor},
        ${needs_followup_flag},
        ${sentiment},
        ${now.toISOString().split('T')[0]},
        ${now.getHours()},
        ${now.getDay()},
        ${getWeekNumber(now)},
        ${now.getMonth() + 1},
        ${now.getFullYear()},
        ${JSON.stringify(data)}
      )
      RETURNING id, phone_number, satisfaction_score, sentiment, is_promoter, is_detractor, needs_followup
    `;
    
    console.log('✅ Saved to database:', result[0]);
    return result[0];
  } catch (error) {
    console.error('❌ Database save error:', error);
    return { id: null, phone_number: null };
  }
}

async function getAllResponses() {
  const sql = neon(process.env.DATABASE_URL);
  const responses = await sql`
    SELECT * FROM survey_responses 
    ORDER BY created_at DESC
  `;
  return responses;
}

async function getRecentResponses(limit = 50) {
  if (!sql) {
    console.log('⚠️  Database not configured');
    return [];
  }
  
  try {
    const responses = await sql`
      SELECT 
        id,
        submission_timestamp as timestamp,
        phone_number,
        customer_name,
        q1_rating,
        q1_comment,
        q2_rating,
        q2_comment,
        q3_followup,
        q4_rating,
        q4_comment,
        q5_rating,
        q5_comment,
        final_comments,
        satisfaction_score,
        is_promoter,
        is_detractor,
        needs_followup,
        sentiment
      FROM survey_responses
      ORDER BY submission_timestamp DESC
      LIMIT ${limit}
    `;
    
    return responses.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      phone_number: r.phone_number,
      customer_name: r.customer_name,
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
    }));
  } catch (error) {
    console.error('❌ Error fetching recent responses:', error);
    return [];
  }
}

async function getStats() {
  if (!sql) {
    return {
      total: 0,
      today: 0,
      avgSatisfaction: 0,
      nps: 0,
      needsFollowup: 0
    };
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(submission_timestamp) = ${today}) as today,
        AVG(satisfaction_score) as avg_satisfaction,
        COUNT(*) FILTER (WHERE is_promoter = true) as promoters,
        COUNT(*) FILTER (WHERE is_detractor = true) as detractors,
        COUNT(*) FILTER (WHERE needs_followup = true) as needs_followup
      FROM survey_responses
    `;
    
    const row = stats[0];
    const total = parseInt(row.total) || 0;
    const promoters = parseInt(row.promoters) || 0;
    const detractors = parseInt(row.detractors) || 0;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    
    return {
      total,
      today: parseInt(row.today) || 0,
      avgSatisfaction: parseFloat(row.avg_satisfaction) || 0,
      nps,
      needsFollowup: parseInt(row.needs_followup) || 0
    };
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return {
      total: 0,
      today: 0,
      avgSatisfaction: 0,
      nps: 0,
      needsFollowup: 0
    };
  }
}

/**
 * Update phone number for an existing survey response
 * Links phone number to Flow submission via flow_token
 */
async function updatePhoneNumber(flowToken, phoneNumber) {
  if (!sql) {
    console.log('⚠️  Database not configured');
    return { updated: false };
  }
  
  try {
    console.log(`Attempting to update flow_token: ${flowToken} with phone: ${phoneNumber}`);
    
    const result = await sql`
      UPDATE survey_responses
      SET phone_number = ${phoneNumber}
      WHERE flow_token = ${flowToken}
        AND phone_number IS NULL
      RETURNING id, created_at, phone_number
    `;
    
    if (result.length > 0) {
      console.log(`✅ Updated response ID ${result[0].id} with phone number`);
      return { updated: true, id: result[0].id };
    } else {
      console.log(`⚠️  No matching flow_token found or phone already set`);
      return { updated: false };
    }
  } catch (error) {
    console.error('❌ Error updating phone number:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  saveSurveyResponse,
  getAllResponses,
  getRecentResponses,
  getStats,
  updatePhoneNumber,
  storeFlowToken,
  getPhoneFromToken
};