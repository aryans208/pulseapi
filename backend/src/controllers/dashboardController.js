const { pool } = require('../config/db');

/**
 * Get aggregated dashboard metrics and summary for authenticated user
 */
async function getSummary(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Monitor counts by status
    const [statusCounts] = await pool.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS online_count,
         SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS offline_count,
         SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) AS paused_count,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         AVG(CASE WHEN is_active = TRUE THEN uptime_percentage ELSE NULL END) AS avg_uptime
       FROM monitors 
       WHERE user_id = ?`,
      [userId]
    );

    const counts = statusCounts[0] || {};
    const totalMonitors = parseInt(counts.total, 10) || 0;
    const onlineMonitors = parseInt(counts.online_count, 10) || 0;
    const offlineMonitors = parseInt(counts.offline_count, 10) || 0;
    const pausedMonitors = parseInt(counts.paused_count, 10) || 0;
    const pendingMonitors = parseInt(counts.pending_count, 10) || 0;
    const overallUptime = counts.avg_uptime !== null ? parseFloat(Number(counts.avg_uptime).toFixed(2)) : 100.00;

    // 2. Average response time across all checks in the past 24 hours
    const [latencyRow] = await pool.query(
      `SELECT AVG(mc.response_time_ms) AS avg_latency 
       FROM monitor_checks mc
       JOIN monitors m ON mc.monitor_id = m.id
       WHERE m.user_id = ? AND mc.checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [userId]
    );

    const avgResponseTime = latencyRow[0]?.avg_latency 
      ? Math.round(parseFloat(latencyRow[0].avg_latency)) 
      : 0;

    // 3. Active incidents count
    const [activeIncidentsRow] = await pool.query(
      `SELECT COUNT(*) AS active_count 
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = ? AND i.status != 'resolved' AND i.resolved_at IS NULL`,
      [userId]
    );
    const activeIncidents = parseInt(activeIncidentsRow[0]?.active_count, 10) || 0;

    // 4. Latest 5 incidents
    const [recentIncidents] = await pool.query(
      `SELECT 
         i.*,
         m.name AS monitor_name,
         m.url AS monitor_url
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = ?
       ORDER BY i.started_at DESC
       LIMIT 5`,
      [userId]
    );

    // 5. Recent response time checks trend (latest 30 successful checks across monitors)
    const [recentChecks] = await pool.query(
      `SELECT 
         mc.id,
         mc.monitor_id,
         m.name AS monitor_name,
         mc.response_time_ms,
         mc.status_code,
         mc.is_up,
         mc.checked_at
       FROM monitor_checks mc
       JOIN monitors m ON mc.monitor_id = m.id
       WHERE m.user_id = ?
       ORDER BY mc.checked_at DESC
       LIMIT 30`,
      [userId]
    );

    // 6. Monitor list overview
    const [monitorsOverview] = await pool.query(
      `SELECT 
         m.id,
         m.name,
         m.url,
         m.method,
         m.status,
         m.uptime_percentage,
         m.last_checked_at,
         m.check_interval,
         (SELECT response_time_ms FROM monitor_checks mc WHERE mc.monitor_id = m.id ORDER BY mc.checked_at DESC LIMIT 1) AS last_latency
       FROM monitors m
       WHERE m.user_id = ?
       ORDER BY m.status = 'down' DESC, m.created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMonitors,
          onlineMonitors,
          offlineMonitors,
          pausedMonitors,
          pendingMonitors,
          overallUptime,
          avgResponseTime,
          activeIncidents
        },
        recentIncidents,
        recentChecks: recentChecks.reverse(),
        monitorsOverview
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary
};
