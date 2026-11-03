const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const demoEmail = 'demo@pulseapi.dev';
const demoPassword = 'PulsePassword123!';
const demoUserName = 'Demo Engineer';
const demoStatusPageSlug = 'pulse-cloud-status';

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

async function ensureDemoUser() {
  const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (existingUsers.length > 0) {
    console.log(`[Seed] Existing demo user retained (ID: ${existingUsers[0].id}).`);
    return existingUsers[0].id;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(demoPassword, salt);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [demoUserName, demoEmail, passwordHash, 'admin']
  );
  console.log(`[Seed] Demo user created (ID: ${result.insertId}).`);
  return result.insertId;
}

async function ensureDemoMonitor(userId, monitor) {
  const [existingMonitors] = await pool.query(
    'SELECT id FROM monitors WHERE user_id = ? AND name = ? LIMIT 1',
    [userId, monitor.name]
  );
  if (existingMonitors.length > 0) {
    return existingMonitors[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO monitors
     (user_id, name, url, method, check_interval, timeout_ms, expected_status, is_active, status, uptime_percentage, last_checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, NOW())`,
    [
      userId,
      monitor.name,
      monitor.url,
      monitor.method,
      monitor.check_interval,
      monitor.timeout_ms,
      monitor.expected_status,
      monitor.status,
      monitor.uptime_percentage
    ]
  );
  return result.insertId;
}

async function ensureMonitorHistory(monitorId, monitor) {
  const [[{ checkCount }]] = await pool.query(
    'SELECT COUNT(*) AS checkCount FROM monitor_checks WHERE monitor_id = ?',
    [monitorId]
  );
  if (checkCount > 0) {
    return;
  }

  for (let i = 24; i >= 0; i--) {
    const isUp = monitor.status === 'down' ? i > 5 : true;
    const statusCode = isUp ? 200 : 500;
    const latency = isUp ? Math.floor(Math.random() * 80) + 70 : Math.floor(Math.random() * 150) + 200;
    const errorMessage = isUp ? null : 'HTTP Status mismatch: Expected 200, received 500';
    await pool.query(
      `INSERT INTO monitor_checks
       (monitor_id, status_code, response_time_ms, is_up, error_message, checked_at)
       VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [monitorId, statusCode, latency, isUp, errorMessage, i * 15]
    );
  }
}

async function ensureDemoIncident(monitorId, monitorName) {
  const cause = 'HTTP Status mismatch: Expected 200, received 500 from upstream payment gateway';
  const [existingIncidents] = await pool.query(
    `SELECT id FROM incidents
     WHERE monitor_id = ? AND cause = ?
     LIMIT 1`,
    [monitorId, cause]
  );
  if (existingIncidents.length > 0) {
    return;
  }

  await pool.query(
    `INSERT INTO incidents (monitor_id, cause, status, started_at)
     VALUES (?, ?, 'investigating', DATE_SUB(NOW(), INTERVAL 45 MINUTE))`,
    [monitorId, cause]
  );
  console.log(`[Seed] Created active incident for "${monitorName}".`);
}

async function ensureDemoStatusPage(userId, monitorIds) {
  const [existingPages] = await pool.query(
    'SELECT id, user_id FROM status_pages WHERE slug = ? LIMIT 1',
    [demoStatusPageSlug]
  );
  let statusPageId;
  if (existingPages.length > 0) {
    if (existingPages[0].user_id !== userId) {
      throw new Error(`Status page slug "${demoStatusPageSlug}" belongs to a different user; refusing to modify it.`);
    }
    statusPageId = existingPages[0].id;
  } else {
    const [result] = await pool.query(
      `INSERT INTO status_pages (user_id, name, slug, description, is_public)
       VALUES (?, ?, ?, ?, TRUE)`,
      [
        userId,
        'Pulse Cloud Infrastructure',
        demoStatusPageSlug,
        'Real-time service health, uptime statistics, and incident reporting for PulseAPI.'
      ]
    );
    statusPageId = result.insertId;
  }

  for (let i = 0; i < monitorIds.length; i++) {
    await pool.query(
      `INSERT IGNORE INTO status_page_monitors (status_page_id, monitor_id, display_order)
       VALUES (?, ?, ?)`,
      [statusPageId, monitorIds[i], i]
    );
  }
  console.log(`[Seed] Status page "/status/${demoStatusPageSlug}" is ready.`);
}

async function ensureColumn(tableName, columnName, definition, columns) {
  if (columns.has(columnName)) {
    return false;
  }

  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  columns.add(columnName);
  return true;
}

async function ensureSchemaCompatibility() {
  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('monitors', 'incidents')`
  );
  const columnsByTable = new Map([
    ['monitors', new Set()],
    ['incidents', new Set()]
  ]);
  const dataTypes = new Map();
  for (const row of columnRows) {
    columnsByTable.get(row.tableName).add(row.columnName);
    dataTypes.set(`${row.tableName}.${row.columnName}`, row.dataType);
  }

  const monitorColumns = columnsByTable.get('monitors');
  await ensureColumn(
    'monitors',
    'method',
    "ENUM('GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH') NOT NULL DEFAULT 'GET'",
    monitorColumns
  );
  await ensureColumn('monitors', 'timeout_ms', 'INT NOT NULL DEFAULT 5000', monitorColumns);
  await ensureColumn('monitors', 'uptime_percentage', 'DECIMAL(5, 2) NOT NULL DEFAULT 100.00', monitorColumns);

  const incidentColumns = columnsByTable.get('incidents');
  const addedIncidentStatus = await ensureColumn(
    'incidents',
    'status',
    "ENUM('investigating', 'identified', 'monitoring', 'resolved') NULL",
    incidentColumns
  );
  if (addedIncidentStatus) {
    const resolvedConditions = [];
    if (incidentColumns.has('is_resolved')) {
      resolvedConditions.push('COALESCE(`is_resolved`, 0) = 1');
    }
    if (incidentColumns.has('resolved_at')) {
      resolvedConditions.push('`resolved_at` IS NOT NULL');
    }
    const resolvedExpression = resolvedConditions.length > 0
      ? resolvedConditions.join(' OR ')
      : 'FALSE';
    await pool.query(
      `UPDATE \`incidents\`
       SET \`status\` = CASE WHEN ${resolvedExpression} THEN 'resolved' ELSE 'investigating' END
       WHERE \`status\` IS NULL`
    );
    await pool.query(
      `ALTER TABLE \`incidents\`
       MODIFY COLUMN \`status\` ENUM('investigating', 'identified', 'monitoring', 'resolved')
       NOT NULL DEFAULT 'investigating'`
    );
  }

  await ensureColumn('incidents', 'duration_seconds', 'INT NULL', incidentColumns);
  await ensureColumn(
    'incidents',
    'created_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    incidentColumns
  );
  await ensureColumn(
    'incidents',
    'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    incidentColumns
  );

  if (dataTypes.get('incidents.cause') === 'varchar') {
    await pool.query('ALTER TABLE `incidents` MODIFY COLUMN `cause` TEXT NOT NULL');
  }

  const foreignKeys = [
    { table: 'monitors', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', name: 'fk_pulseapi_monitors_user' },
    { table: 'monitor_checks', column: 'monitor_id', referencedTable: 'monitors', referencedColumn: 'id', name: 'fk_pulseapi_checks_monitor' },
    { table: 'incidents', column: 'monitor_id', referencedTable: 'monitors', referencedColumn: 'id', name: 'fk_pulseapi_incidents_monitor' },
    { table: 'status_pages', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', name: 'fk_pulseapi_status_pages_user' },
    { table: 'status_page_monitors', column: 'status_page_id', referencedTable: 'status_pages', referencedColumn: 'id', name: 'fk_pulseapi_status_page_monitors_page' },
    { table: 'status_page_monitors', column: 'monitor_id', referencedTable: 'monitors', referencedColumn: 'id', name: 'fk_pulseapi_status_page_monitors_monitor' }
  ];

  for (const foreignKey of foreignKeys) {
    const [existing] = await pool.query(
      `SELECT REFERENCED_TABLE_NAME AS referencedTable
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [foreignKey.table, foreignKey.column]
    );
    if (existing.some(row => row.referencedTable === foreignKey.referencedTable)) {
      continue;
    }
    if (existing.length > 0) {
      throw new Error(
        `Cannot add expected foreign key for ${foreignKey.table}.${foreignKey.column}; that column already references a different table.`
      );
    }

    const [[{ orphanCount }]] = await pool.query(
      `SELECT COUNT(*) AS orphanCount
       FROM \`${foreignKey.table}\` AS child
       LEFT JOIN \`${foreignKey.referencedTable}\` AS parent
         ON parent.\`${foreignKey.referencedColumn}\` = child.\`${foreignKey.column}\`
       WHERE child.\`${foreignKey.column}\` IS NOT NULL
         AND parent.\`${foreignKey.referencedColumn}\` IS NULL`
    );
    if (orphanCount > 0) {
      throw new Error(
        `Cannot add expected foreign key for ${foreignKey.table}.${foreignKey.column}; ${orphanCount} existing row(s) have no matching parent. No rows were removed.`
      );
    }

    await pool.query(
      `ALTER TABLE \`${foreignKey.table}\`
       ADD CONSTRAINT \`${foreignKey.name}\`
       FOREIGN KEY (\`${foreignKey.column}\`)
       REFERENCES \`${foreignKey.referencedTable}\` (\`${foreignKey.referencedColumn}\`)
       ON DELETE CASCADE`
    );
  }
}

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
    await ensureSchemaCompatibility();
    console.log(`[Seed] Schema in configured database "${process.env.DB_NAME}" verified.`);

    const userId = await ensureDemoUser();
    const seededMonitors = [];
    for (const monitor of monitorsToCreate) {
      const monitorId = await ensureDemoMonitor(userId, monitor);
      await ensureMonitorHistory(monitorId, monitor);
      seededMonitors.push({ id: monitorId, ...monitor });
    }

    const downMonitor = seededMonitors.find(monitor => monitor.status === 'down');
    await ensureDemoIncident(downMonitor.id, downMonitor.name);
    await ensureDemoStatusPage(userId, seededMonitors.map(monitor => monitor.id));

    console.log('====================================================');
    console.log(' Database Seed Finished Successfully!');
    console.log(` Demo user: ${demoEmail}`);
    console.log(`   Status:   /status/${demoStatusPageSlug}`);
    console.log('====================================================');
  } catch (err) {
    console.error('[Seed Error] Database seeding failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seedDatabase };
