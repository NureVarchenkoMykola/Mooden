const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

router.get('/sidebar', auth, userController.getSidebarData);
router.post('/change-password', auth, userController.changePassword);
router.get('/notifications', auth, userController.getNotifications);
router.post('/notifications/:id/read', auth, userController.markNotificationRead);
router.post('/notifications/read-all', auth, userController.markAllNotificationsRead);
router.get('/announcements', auth, userController.getAnnouncements);
router.post('/announcements/:id/read', auth, userController.markAnnouncementRead);
router.post('/announcements/read-all', auth, userController.markAllAnnouncementsRead);
router.patch('/settings', auth, userController.updateSettings);

module.exports = router;