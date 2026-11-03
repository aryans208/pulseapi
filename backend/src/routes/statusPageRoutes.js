const express = require('express');
const router = express.Router();
const statusPageController = require('../controllers/statusPageController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route - unauthenticated
router.get('/public/:slug', statusPageController.getPublicStatusPage);

// Protected routes - require valid JWT
router.get('/', authenticateToken, statusPageController.getUserStatusPages);
router.post('/', authenticateToken, statusPageController.createStatusPage);
router.delete('/:id', authenticateToken, statusPageController.deleteStatusPage);

module.exports = router;
