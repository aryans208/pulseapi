const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function seedDatabase() {
  console.log('====================================================');
  console.log(' PulseAPI Database Initializer & Seeder');
  console.log('====================================================');

  try {
    // 1. Run schema.sql to ensure all tables exist
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split statements by semicolon
    const statements = schemaSql
      .replace(/^\s*--.*$/gm, '')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log('[Seed] Schema verified and tables synchronized successfully.');

    // 2. Create or update Demo User
    const demoEmail = 'demo@pulseapi.dev';
    const demoPassword = 'PulsePassword123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(demoPassword, salt);

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [demoEmail]);

    let userId;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await pool.query(
        'UPDATE users SET password_hash = ?, name = ? WHERE id = ?',
        [passwordHash, 'Demo Engineer', userId]
      );
      console.log(`[Seed] Demo user updated (ID: ${userId}).`);
    } else {
      const [insertUser] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Demo Engineer', demoEmail, passwordHash, 'admin']
      );
      userId = insertUser.insertId;
      console.log(`[Seed] Demo user created (ID: ${userId}).`);
    }

    // 3. Clear existing monitors & data for clean reproducible state
    await pool.query('DELETE FROM monitors WHERE user_id = ?', [userId]);

    // 4. Create initial demo monitors
    const monitorsToCreate = [
      {
        name: 'GitHub Status API',
        url: 'https://api.github.com/zen',
        method: 'GET',
        check_interval: 1,
        timeout_ms: 5000,
        expected_status: 200,
        status: 'up',
        uptime_percentage: 99.85
      },
      {
        name: 'JSONPlaceholder Microservice',
        url: 'https://jsonplaceholder.typicode.com/users',
        method: 'GET',
        check_interval: 2,
        timeout_ms: 4000,
        expected_status: 200,
        status: 'up',
        uptime_percentage: 100.00
      },
      {
        name: 'Cloudflare Edge CDN',
        url: 'https://1.1.1.1',
        method: 'GET',
        check_interval: 5,
        timeout_ms: 3000,
        expected_status: 200,
        status: 'up',
        uptime_percentage: 99.95
      },
      {
        name: 'Simulated Billing Webhook (Outage Test)',
        url: 'https://httpbin.org/status/500',
        method: 'GET',
        check_interval: 1,
        timeout_ms: 5000,
        expected_status: 200,
        status: 'down',
        uptime_percentage: 76.50
      }
    ];

    const createdMonitorIds = [];

    for (const m of monitorsToCreate) {
      const [res] = await pool.query(
        `INSERT INTO monitors 
         (user_id, name, url, method, check_interval, timeout_ms, expected_status, is_active, status, uptime_percentage, last_checked_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, NOW())`,
        [userId, m.name, m.url, m.method, m.check_interval, m.timeout_ms, m.expected_status, m.status, m.uptime_percentage]
      );
      const mId = res.insertId;
      createdMonitorIds.push({ id: mId, name: m.name, status: m.status });

      // Seed 25 historical checks for each monitor spanning the last 12 hours
      for (let i = 24; i >= 0; i--) {
        const isUp = m.status === 'down' ? (i > 5) : true;
        const statusCode = isUp ? 200 : 500;
        const latency = isUp ? Math.floor(Math.random() * 80) + 70 : Math.floor(Math.random() * 150) + 200;
        const errorMsg = isUp ? null : 'HTTP Status mismatch: Expected 200, received 500';

        await pool.query(
          `INSERT INTO monitor_checks (monitor_id, status_code, response_time_ms, is_up, error_message, checked_at) 
           VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
          [mId, statusCode, latency, isUp, errorMsg, i * 15]
        );
      }
    }
    console.log(`[Seed] Created ${monitorsToCreate.length} monitors with historical time-series check points.`);

    // 5. Create demo incident for the failing monitor
    const downMonitor = createdMonitorIds.find(m => m.status === 'down');
    if (downMonitor) {
      await pool.query(
        `INSERT INTO incidents (monitor_id, cause, status, started_at) 
         VALUES (?, ?, 'investigating', DATE_SUB(NOW(), INTERVAL 45 MINUTE))`,
        [downMonitor.id, 'HTTP Status mismatch: Expected 200, received 500 from upstream payment gateway']
      );
      console.log(`[Seed] Created active incident for "${downMonitor.name}".`);
    }

    // 6. Create demo public status page
    const slug = 'pulse-cloud-status';
    await pool.query('DELETE FROM status_pages WHERE slug = ?', [slug]);

    const [pageRes] = await pool.query(
      `INSERT INTO status_pages (user_id, name, slug, description, is_public) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [userId, 'Pulse Cloud Infrastructure', slug, 'Real-time service health, uptime statistics, and incident reporting for PulseAPI.']
    );
    const statusPageId = pageRes.insertId;

    // Attach all demo monitors to this public status page
    for (let i = 0; i < createdMonitorIds.length; i++) {
      await pool.query(
        'INSERT INTO status_page_monitors (status_page_id, monitor_id, display_order) VALUES (?, ?, ?)',
        [statusPageId, createdMonitorIds[i].id, i]
      );
    }
    console.log(`[Seed] Created public status page "/status/${slug}" with linked monitors.`);

    console.log('====================================================');
    console.log(' Database Seed Finished Successfully!');
    console.log(' Demo Login Credentials:');
    console.log(`   Email:    ${demoEmail}`);
    console.log(`   Password: ${demoPassword}`);
    console.log(`   Status:   http://localhost:5173/status/${slug}`);
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Database seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
