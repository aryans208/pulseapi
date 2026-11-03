const app = require('./app');
const { testConnection, pool } = require('./config/db');
const { initScheduler, stopScheduler } = require('./services/cronService');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  console.log('----------------------------------------------------');
  console.log(' Starting PulseAPI Server...');
  console.log('----------------------------------------------------');

  // Verify database connectivity before accepting HTTP requests
  const isDbConnected = await testConnection();
  if (!isDbConnected) {
    console.warn('[PulseAPI Warning] Database connection failed on startup. Please ensure MySQL 8 is running and credentials in .env are correct.');
  }

  // Initialize node-cron background monitoring engine
  initScheduler();

  const server = app.listen(PORT, () => {
    console.log(`[PulseAPI Server] Running on http://localhost:${PORT}`);
    console.log(`[PulseAPI API Base] http://localhost:${PORT}/api`);
    console.log(`[PulseAPI Health]   http://localhost:${PORT}/api/health`);
    console.log('----------------------------------------------------');
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[PulseAPI Shutdown] Received ${signal}. Closing gracefully...`);
    stopScheduler();
    server.close(async () => {
      console.log('[PulseAPI Server] HTTP server closed.');
      try {
        await pool.end();
        console.log('[PulseAPI Database] Connection pool drained.');
      } catch (err) {
        console.error('[PulseAPI Database] Error during pool close:', err.message);
      }
      process.exit(0);
    });

    // Force exit after 10 seconds if hanging
    setTimeout(() => {
      console.error('[PulseAPI Shutdown] Forced exit after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
