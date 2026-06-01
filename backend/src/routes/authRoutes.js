const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/verify', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

module.exports = router;