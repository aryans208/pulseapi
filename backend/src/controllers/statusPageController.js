const { pool } = require('../config/db');
const { isValidSlug, sanitizeString } = require('../utils/validator');

/**
 * Get all status pages for authenticated user
 */
async function getUserStatusPages(req, res, next) {
  try {
    const userId = req.user.id;

    const [pages] = await pool.query(
      `SELECT 
         sp.*,
         (SELECT COUNT(*) FROM status_page_monitors spm WHERE spm.status_page_id = sp.id) AS monitor_count
       FROM status_pages sp
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        statusPages: pages
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new status page
 */
async function createStatusPage(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { name, slug, description, is_public = true, monitor_ids = [] } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both status page name and a unique slug.'
      });
    }

    const cleanName = sanitizeString(name, 150);
    const cleanSlug = slug.trim().toLowerCase();
    const cleanDesc = sanitizeString(description, 500);

    if (!isValidSlug(cleanSlug)) {
      return res.status(400).json({
        success: false,
        error: 'Slug must be 3-100 characters long and contain only lowercase letters, numbers, and hyphens (e.g. acme-api-status).'
      });
    }

    // Check slug uniqueness
    const [existing] = await connection.query('SELECT id FROM status_pages WHERE slug = ?', [cleanSlug]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A status page with this slug already exists. Please pick a unique slug.'
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO status_pages (user_id, name, slug, description, is_public) VALUES (?, ?, ?, ?, ?)',
      [userId, cleanName, cleanSlug, cleanDesc, is_public ? 1 : 0]
    );

    const statusPageId = result.insertId;

    // Associate monitors if provided
    if (Array.isArray(monitor_ids) && monitor_ids.length > 0) {
      // Filter out invalid/unowned monitor IDs
      const [userMonitors] = await connection.query(
        'SELECT id FROM monitors WHERE user_id = ? AND id IN (?)',
        [userId, monitor_ids]
      );

      for (let i = 0; i < userMonitors.length; i++) {
        await connection.query(
          'INSERT INTO status_page_monitors (status_page_id, monitor_id, display_order) VALUES (?, ?, ?)',
          [statusPageId, userMonitors[i].id, i]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Status page created successfully.',
      data: {
        id: statusPageId,
        name: cleanName,
        slug: cleanSlug,
        description: cleanDesc,
        is_public
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

/**
 * Delete a status page
 */
async function deleteStatusPage(req, res, next) {
  try {
    const userId = req.user.id;
    const pageId = parseInt(req.params.id, 10);

    const [result] = await pool.query(
      'DELETE FROM status_pages WHERE id = ? AND user_id = ?',
      [pageId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Status page not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Status page deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Unauthenticated public endpoint to view status page
 * GET /api/status-pages/public/:slug
 */
async function getPublicStatusPage(req, res, next) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ success: false, error: 'Slug parameter is required.' });
    }

    // 1. Fetch public status page metadata
    const [pageRows] = await pool.query(
      `SELECT id, name, slug, description, created_at 
       FROM status_pages 
       WHERE slug = ? AND is_public = TRUE`,
      [slug.toLowerCase()]
    );

    if (pageRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Status page not found or is currently private.'
      });
    }

    const statusPage = pageRows[0];

    // 2. Fetch associated monitors (safe public view - no internal secrets)
    const [monitors] = await pool.query(
      `SELECT 
         m.id,
         m.name,
         m.method,
         m.status,
         m.uptime_percentage,
         m.last_checked_at,
         spm.display_order
       FROM status_page_monitors spm
       JOIN monitors m ON spm.monitor_id = m.id
       WHERE spm.status_page_id = ? AND m.is_active = TRUE
       ORDER BY spm.display_order ASC, m.name ASC`,
      [statusPage.id]
    );

    // 3. Compute overall system state
    let systemStatus = 'operational'; // 'operational' | 'degraded' | 'partial_outage' | 'major_outage'
    const totalCount = monitors.length;
    const downCount = monitors.filter(m => m.status === 'down').length;

    if (totalCount > 0) {
      if (downCount === 0) {
        systemStatus = 'operational';
      } else if (downCount === totalCount || downCount > totalCount / 2) {
        systemStatus = 'major_outage';
      } else {
        systemStatus = 'partial_outage';
      }
    }

    // 4. Fetch recent incidents (active + resolved in last 7 days)
    let recentIncidents = [];
    if (monitors.length > 0) {
      const monitorIds = monitors.map(m => m.id);
      const [incidentRows] = await pool.query(
        `SELECT 
           i.id,
           i.monitor_id,
           m.name AS monitor_name,
           i.cause,
           i.status,
           i.started_at,
           i.resolved_at,
           i.duration_seconds
         FROM incidents i
         JOIN monitors m ON i.monitor_id = m.id
         WHERE i.monitor_id IN (?) 
           AND (i.status != 'resolved' OR i.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
         ORDER BY i.started_at DESC
         LIMIT 20`,
        [monitorIds]
      );
      recentIncidents = incidentRows;
    }

    res.status(200).json({
      success: true,
      data: {
        statusPage,
        systemStatus,
        monitors,
        recentIncidents
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserStatusPages,
  createStatusPage,
  deleteStatusPage,
  getPublicStatusPage
};
