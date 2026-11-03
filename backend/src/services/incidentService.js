const { pool } = require('../config/db');

/**
 * Incident Management Service
 * Handles state transition tracking, downtime calculation, and incident lifecycle
 */

/**
 * Triggered when a monitor check fails.
 * If the monitor is already marked DOWN and has an ongoing incident, keeps it open.
 * If the monitor was UP or PENDING, creates a new incident.
 */
async function handleMonitorDown(monitorId, cause) {
  try {
    // Check if there is already an ongoing/unresolved incident
    const [existing] = await pool.query(
      `SELECT id FROM incidents 
       WHERE monitor_id = ? AND status != 'resolved' AND resolved_at IS NULL 
       ORDER BY started_at DESC LIMIT 1`,
      [monitorId]
    );

    if (existing.length === 0) {
      // Create new incident
      const [insertResult] = await pool.query(
        `INSERT INTO incidents (monitor_id, cause, status, started_at) 
         VALUES (?, ?, 'investigating', NOW())`,
        [monitorId, cause || 'Endpoint failed health check']
      );
      console.log(`[Incident Opened] Monitor #${monitorId} is DOWN. Incident #${insertResult.insertId} created.`);
      return insertResult.insertId;
    }

    return existing[0].id;
  } catch (err) {
    console.error(`[Incident Error] Failed to handle down state for monitor #${monitorId}:`, err.message);
  }
}

/**
 * Triggered when a monitor check succeeds.
 * If there was an open incident, resolves it and computes downtime duration.
 */
async function handleMonitorUp(monitorId) {
  try {
    const [ongoing] = await pool.query(
      `SELECT id, started_at FROM incidents 
       WHERE monitor_id = ? AND status != 'resolved' AND resolved_at IS NULL 
       ORDER BY started_at DESC LIMIT 1`,
      [monitorId]
    );

    if (ongoing.length > 0) {
      const incidentId = ongoing[0].id;
      // Close incident and calculate duration in seconds
      await pool.query(
        `UPDATE incidents 
         SET status = 'resolved', 
             resolved_at = NOW(), 
             duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) 
         WHERE id = ?`,
        [incidentId]
      );
      console.log(`[Incident Resolved] Monitor #${monitorId} recovered. Incident #${incidentId} closed.`);
    }
  } catch (err) {
    console.error(`[Incident Error] Failed to handle up state for monitor #${monitorId}:`, err.message);
  }
}

/**
 * Calculate rolling uptime percentage over a window (e.g. 24 hours, 7 days, 30 days)
 * @param {number} monitorId
 * @param {number} hoursWindow - e.g., 24, 168 (7d), 720 (30d)
 * @returns {Promise<number>}
 */
async function calculateUptimePercentage(monitorId, hoursWindow = 24) {
  try {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(*) as total_checks,
         SUM(CASE WHEN is_up = TRUE THEN 1 ELSE 0 END) as successful_checks
       FROM monitor_checks 
       WHERE monitor_id = ? 
         AND checked_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [monitorId, hoursWindow]
    );

    const total = rows[0]?.total_checks || 0;
    const successful = rows[0]?.successful_checks || 0;

    if (total === 0) return 100.00;
    return parseFloat(((successful / total) * 100).toFixed(2));
  } catch (err) {
    console.error(`[Uptime Calc Error] Monitor #${monitorId}:`, err.message);
    return 100.00;
  }
}

module.exports = {
  handleMonitorDown,
  handleMonitorUp,
  calculateUptimePercentage
};
