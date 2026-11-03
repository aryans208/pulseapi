const axios = require('axios');
const { pool } = require('../config/db');
const { validateUrlForSSRF } = require('../utils/ssrfValidator');
const { handleMonitorDown, handleMonitorUp, calculateUptimePercentage } = require('./incidentService');

/**
 * Executes a single ping check for a given monitor
 * @param {Object} monitor - Monitor record from DB
 * @returns {Promise<Object>} check result
 */
async function executeCheck(monitor) {
  const { id, url, method = 'GET', timeout_ms = 5000, expected_status = 200 } = monitor;
  
  let statusCode = null;
  let responseTimeMs = 0;
  let isUp = false;
  let errorMessage = null;

  // 1. Strict SSRF check before performing request
  const ssrfCheck = await validateUrlForSSRF(url);
  if (!ssrfCheck.safe) {
    isUp = false;
    errorMessage = `Security Alert: ${ssrfCheck.reason}`;
    responseTimeMs = 0;
  } else {
    // 2. Perform safe HTTP request
    const startTime = Date.now();
    try {
      const response = await axios({
        url,
        method: method.toUpperCase(),
        timeout: Math.min(timeout_ms, 30000), // Max timeout cap 30s
        maxRedirects: 3, // Prevent deep redirect loops
        validateStatus: () => true, // Don't throw on 4xx/5xx so we record accurate status code
        headers: {
          'User-Agent': 'PulseAPI-Monitor/1.0 (+https://pulseapi.dev)',
          'Accept': '*/*'
        }
      });

      responseTimeMs = Date.now() - startTime;
      statusCode = response.status;

      if (statusCode === expected_status) {
        isUp = true;
      } else {
        isUp = false;
        errorMessage = `HTTP Status mismatch: Expected ${expected_status}, received ${statusCode}`;
      }
    } catch (err) {
      responseTimeMs = Date.now() - startTime;
      isUp = false;

      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = `Request timed out after ${timeout_ms}ms`;
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = 'DNS lookup failed: Hostname cannot be resolved';
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused by destination host';
      } else {
        errorMessage = err.message || 'Unknown network error';
      }
    }
  }

  // 3. Store check in monitor_checks
  await pool.query(
    `INSERT INTO monitor_checks (monitor_id, status_code, response_time_ms, is_up, error_message, checked_at) 
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, statusCode, responseTimeMs, isUp, errorMessage]
  );

  // 4. Update monitor state and incident handling
  if (isUp) {
    await handleMonitorUp(id);
  } else {
    await handleMonitorDown(id, errorMessage || `Expected status ${expected_status}, got ${statusCode}`);
  }

  // 5. Recalculate 24-hour uptime percentage
  const uptime = await calculateUptimePercentage(id, 24);

  // 6. Update monitor record
  await pool.query(
    `UPDATE monitors 
     SET status = ?, 
         uptime_percentage = ?, 
         last_checked_at = NOW() 
     WHERE id = ?`,
    [isUp ? 'up' : 'down', uptime, id]
  );

  return {
    monitorId: id,
    statusCode,
    responseTimeMs,
    isUp,
    errorMessage,
    uptimePercentage: uptime
  };
}

module.exports = {
  executeCheck
};
