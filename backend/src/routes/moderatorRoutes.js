const express = require('express');
const router = express.Router();
const moderatorController = require('../controllers/moderatorController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, moderatorController.getDashboardData);
router.get('/users', auth, moderatorController.getUsers);
router.patch('/users/:id/role', auth, moderatorController.updateUserRole);

module.exports = router;
