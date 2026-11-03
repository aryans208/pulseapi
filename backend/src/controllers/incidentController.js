const { pool } = require('../config/db');

/**
 * Get all incidents for user's monitors
 */
async function getAll(req, res, next) {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT 
        i.*,
        m.name AS monitor_name,
        m.url AS monitor_url,
        m.method AS monitor_method
      FROM incidents i
      JOIN monitors m ON i.monitor_id = m.id
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all') {
      if (status === 'active') {
        query += ` AND i.status != 'resolved'`;
      } else {
        query += ` AND i.status = ?`;
        params.push(status);
      }
    }

    query += ` ORDER BY i.started_at DESC`;

    const [incidents] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        incidents
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get specific incident
 */
async function getById(req, res, next) {
  try {
    const userId = req.user.id;
    const incidentId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `SELECT 
         i.*,
         m.name AS monitor_name,
         m.url AS monitor_url,
         m.method AS monitor_method
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE i.id = ? AND m.user_id = ?`,
      [incidentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    res.status(200).json({
      success: true,
      data: {
        incident: rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update incident status manually
 */
async function updateStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const incidentId = parseInt(req.params.id, 10);
    const { status, cause } = req.body;

    const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify ownership
    const [rows] = await pool.query(
      `SELECT i.id, i.started_at FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE i.id = ? AND m.user_id = ?`,
      [incidentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    if (status === 'resolved') {
      await pool.query(
        `UPDATE incidents 
         SET status = 'resolved', 
             resolved_at = COALESCE(resolved_at, NOW()), 
             duration_seconds = TIMESTAMPDIFF(SECOND, started_at, COALESCE(resolved_at, NOW())),
             cause = COALESCE(?, cause)
         WHERE id = ?`,
        [cause || null, incidentId]
      );
    } else {
      await pool.query(
        `UPDATE incidents 
         SET status = ?, 
             cause = COALESCE(?, cause)
         WHERE id = ?`,
        [status, cause || null, incidentId]
      );
    }

    const [updated] = await pool.query('SELECT * FROM incidents WHERE id = ?', [incidentId]);

    res.status(200).json({
      success: true,
      message: 'Incident status updated successfully.',
      data: {
        incident: updated[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  updateStatus
};
