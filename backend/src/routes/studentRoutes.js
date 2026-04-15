const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, studentController.getDashboardData);
router.post('/announcements/:id/read', auth, studentController.markAsRead);
router.patch('/settings', auth, studentController.updateSettings);

module.exports = router;