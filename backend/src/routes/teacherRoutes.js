const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, teacherController.getDashboardData);
router.post('/announcements/:id/read', auth, teacherController.markAsRead);
router.patch('/settings', auth, teacherController.updateSettings);

module.exports = router;