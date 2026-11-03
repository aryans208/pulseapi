const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const databaseConfigKeys = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_CONNECTION_LIMIT'
];
const missingConfig = databaseConfigKeys.filter(key => !process.env[key]?.trim());

if (missingConfig.length > 0) {
  throw new Error(`Missing database configuration in backend/.env: ${missingConfig.join(', ')}`);
}

function positiveIntegerFromEnv(key) {
  const value = Number(process.env[key]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} in backend/.env must be a positive integer`);
  }
  return value;
}

// Create connection pool for high concurrency and resilient database interactions
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: positiveIntegerFromEnv('DB_PORT'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: positiveIntegerFromEnv('DB_CONNECTION_LIMIT'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
  dateStrings: true
});

/**
 * Verify database connection health
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[PulseAPI Database] Connected successfully to MySQL (${process.env.DB_NAME || 'pulseapi_db'})`);
    connection.release();
    return true;
  } catch (err) {
    console.error('[PulseAPI Database Error] Failed to connect to MySQL:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
