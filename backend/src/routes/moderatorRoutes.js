const express = require('express');
const router = express.Router();
const moderatorController = require('../controllers/moderatorController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, moderatorController.getDashboardData);
router.get('/users', auth, moderatorController.getUsers);
router.post('/users', auth, moderatorController.createUser);
router.patch('/users/:id', auth, moderatorController.updateUser);
router.patch('/users/:id/role', auth, moderatorController.updateUserRole);
router.patch('/users/:id/block', auth, moderatorController.updateUserBlockStatus);

module.exports = router;
