const express = require('express');
const router = express.Router();
const monitorController = require('../controllers/monitorController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { manualCheckLimiter } = require('../middleware/rateLimiter');

// All monitor management routes require authentication
router.use(authenticateToken);

router.get('/', monitorController.getAll);
router.post('/', monitorController.create);
router.get('/:id', monitorController.getById);
router.put('/:id', monitorController.update);
router.patch('/:id/toggle-pause', monitorController.togglePause);
router.delete('/:id', monitorController.deleteMonitor);
router.post('/:id/check-now', manualCheckLimiter, monitorController.triggerManualCheck);

module.exports = router;
