const cron = require('node-cron');
const { pool } = require('../config/db');
const { executeCheck } = require('./monitorService');

let cronJob = null;
let isCheckRunning = false;

/**
 * Iterates through all active monitors and triggers checks if due
 */
async function processDueMonitors() {
  if (isCheckRunning) {
    return; // Prevent overlapping runs if previous cycle took longer
  }

  isCheckRunning = true;
  try {
    // Select monitors that are active AND due for check based on check_interval
    const [monitors] = await pool.query(
      `SELECT * FROM monitors 
       WHERE is_active = TRUE 
         AND (last_checked_at IS NULL 
              OR TIMESTAMPDIFF(MINUTE, last_checked_at, NOW()) >= check_interval)`
    );

    if (monitors.length > 0) {
      console.log(`[PulseAPI Cron] Checking ${monitors.length} due monitor(s)...`);

      // Execute in parallel batches with promise.allSettled
      await Promise.allSettled(
        monitors.map(monitor => 
          executeCheck(monitor).catch(err => 
            console.error(`[Monitor Check Failed] #${monitor.id}:`, err.message)
          )
        )
      );
    }
  } catch (err) {
    console.error('[PulseAPI Cron Error]:', err.message);
  } finally {
    isCheckRunning = false;
  }
}

/**
 * Initializes the background scheduler
 */
function initScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '* * * * *'; // Default every minute

  console.log(`[PulseAPI Scheduler] Initialized with schedule pattern: "${schedule}"`);

  // Run an initial sweep 2 seconds after startup
  setTimeout(() => {
    processDueMonitors().catch(e => console.error('[Initial Check Sweep Error]', e.message));
  }, 2000);

  cronJob = cron.schedule(schedule, () => {
    processDueMonitors();
  });
}

function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    console.log('[PulseAPI Scheduler] Stopped.');
  }
}

module.exports = {
  initScheduler,
  stopScheduler,
  processDueMonitors
};
