const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', incidentController.getAll);
router.get('/:id', incidentController.getById);
router.patch('/:id/status', incidentController.updateStatus);

module.exports = router;
