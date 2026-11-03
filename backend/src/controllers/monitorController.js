const { pool } = require('../config/db');
const { validateUrlForSSRF } = require('../utils/ssrfValidator');
const { sanitizeString } = require('../utils/validator');
const { executeCheck } = require('../services/monitorService');
const { calculateUptimePercentage } = require('../services/incidentService');

/**
 * Get all monitors for the authenticated user
 */
async function getAll(req, res, next) {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM monitor_checks mc WHERE mc.monitor_id = m.id) AS total_checks,
        (SELECT response_time_ms FROM monitor_checks mc WHERE mc.monitor_id = m.id ORDER BY mc.checked_at DESC LIMIT 1) AS last_latency
      FROM monitors m
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (status && ['up', 'down', 'paused', 'pending'].includes(status)) {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY m.created_at DESC`;

    const [monitors] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        monitors
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single monitor details, history, metrics, and incidents
 */
async function getById(req, res, next) {
  try {
    const userId = req.user.id;
    const monitorId = parseInt(req.params.id, 10);

    if (isNaN(monitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid monitor ID.' });
    }

    const [monitors] = await pool.query(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, userId]
    );

    if (monitors.length === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    const monitor = monitors[0];

    // Compute uptime across multiple time windows
    const [uptime24h, uptime7d, uptime30d] = await Promise.all([
      calculateUptimePercentage(monitorId, 24),
      calculateUptimePercentage(monitorId, 168),
      calculateUptimePercentage(monitorId, 720)
    ]);

    // Fetch latest 50 checks for latency chart and history log
    const [checks] = await pool.query(
      `SELECT id, status_code, response_time_ms, is_up, error_message, checked_at 
       FROM monitor_checks 
       WHERE monitor_id = ? 
       ORDER BY checked_at DESC 
       LIMIT 50`,
      [monitorId]
    );

    // Fetch incidents for this monitor
    const [incidents] = await pool.query(
      `SELECT * FROM incidents 
       WHERE monitor_id = ? 
       ORDER BY started_at DESC 
       LIMIT 20`,
      [monitorId]
    );

    res.status(200).json({
      success: true,
      data: {
        monitor,
        metrics: {
          uptime24h,
          uptime7d,
          uptime30d
        },
        checks: checks.reverse(), // chronologically ordered for charting
        recentChecksList: checks, // most recent first for table view
        incidents
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new monitor
 */
async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, url, method = 'GET', check_interval = 1, timeout_ms = 5000, expected_status = 200 } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Please provide monitor name and target URL.'
      });
    }

    const cleanName = sanitizeString(name, 150);
    const cleanUrl = url.trim();

    // Validate SSRF upfront
    const ssrfCheck = await validateUrlForSSRF(cleanUrl);
    if (!ssrfCheck.safe) {
      return res.status(400).json({
        success: false,
        error: `SSRF Protection: ${ssrfCheck.reason}`
      });
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'];
    const chosenMethod = validMethods.includes(method?.toUpperCase()) ? method.toUpperCase() : 'GET';
    const interval = Math.max(1, parseInt(check_interval, 10) || 1);
    const timeout = Math.min(30000, Math.max(500, parseInt(timeout_ms, 10) || 5000));
    const expected = parseInt(expected_status, 10) || 200;

    const [result] = await pool.query(
      `INSERT INTO monitors 
        (user_id, name, url, method, check_interval, timeout_ms, expected_status, is_active, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'pending')`,
      [userId, cleanName, cleanUrl, chosenMethod, interval, timeout, expected]
    );

    const newMonitorId = result.insertId;

    const [newMonitorRows] = await pool.query('SELECT * FROM monitors WHERE id = ?', [newMonitorId]);
    const createdMonitor = newMonitorRows[0];

    // Trigger an immediate check so the user doesn't have to wait for the cron schedule
    executeCheck(createdMonitor).catch(e => console.error('[Initial Check Error]', e.message));

    res.status(201).json({
      success: true,
      message: 'Monitor created successfully and queued for verification.',
      data: {
        monitor: createdMonitor
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update monitor configuration
 */
async function update(req, res, next) {
  try {
    const userId = req.user.id;
    const monitorId = parseInt(req.params.id, 10);
    const { name, url, method, check_interval, timeout_ms, expected_status } = req.body;

    const [existingRows] = await pool.query(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    const current = existingRows[0];
    const newName = name ? sanitizeString(name, 150) : current.name;
    let newUrl = current.url;

    if (url && url.trim() !== current.url) {
      const ssrfCheck = await validateUrlForSSRF(url.trim());
      if (!ssrfCheck.safe) {
        return res.status(400).json({
          success: false,
          error: `SSRF Protection: ${ssrfCheck.reason}`
        });
      }
      newUrl = url.trim();
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'];
    const newMethod = method && validMethods.includes(method.toUpperCase()) ? method.toUpperCase() : current.method;
    const newInterval = check_interval ? Math.max(1, parseInt(check_interval, 10)) : current.check_interval;
    const newTimeout = timeout_ms ? Math.min(30000, Math.max(500, parseInt(timeout_ms, 10))) : current.timeout_ms;
    const newExpected = expected_status ? parseInt(expected_status, 10) : current.expected_status;

    await pool.query(
      `UPDATE monitors 
       SET name = ?, url = ?, method = ?, check_interval = ?, timeout_ms = ?, expected_status = ? 
       WHERE id = ? AND user_id = ?`,
      [newName, newUrl, newMethod, newInterval, newTimeout, newExpected, monitorId, userId]
    );

    const [updatedRows] = await pool.query('SELECT * FROM monitors WHERE id = ?', [monitorId]);

    res.status(200).json({
      success: true,
      message: 'Monitor updated successfully.',
      data: {
        monitor: updatedRows[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle pause / resume monitor
 */
async function togglePause(req, res, next) {
  try {
    const userId = req.user.id;
    const monitorId = parseInt(req.params.id, 10);

    const [existing] = await pool.query(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    const monitor = existing[0];
    const newActiveState = !monitor.is_active;
    const newStatus = newActiveState ? 'pending' : 'paused';

    await pool.query(
      'UPDATE monitors SET is_active = ?, status = ? WHERE id = ?',
      [newActiveState, newStatus, monitorId]
    );

    if (newActiveState) {
      // Trigger check immediately upon resuming
      executeCheck({ ...monitor, is_active: true }).catch(e => console.error('[Resume Check Error]', e.message));
    }

    res.status(200).json({
      success: true,
      message: newActiveState ? 'Monitor resumed successfully.' : 'Monitor paused successfully.',
      data: {
        isActive: newActiveState,
        status: newStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete monitor
 */
async function deleteMonitor(req, res, next) {
  try {
    const userId = req.user.id;
    const monitorId = parseInt(req.params.id, 10);

    const [result] = await pool.query(
      'DELETE FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Monitor and its check history deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger an immediate manual check on demand
 */
async function triggerManualCheck(req, res, next) {
  try {
    const userId = req.user.id;
    const monitorId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found.' });
    }

    const monitor = rows[0];
    const checkResult = await executeCheck(monitor);

    // Fetch updated monitor record
    const [updatedRows] = await pool.query('SELECT * FROM monitors WHERE id = ?', [monitorId]);

    res.status(200).json({
      success: true,
      message: 'Health check completed.',
      data: {
        check: checkResult,
        monitor: updatedRows[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  togglePause,
  deleteMonitor,
  triggerManualCheck
};
