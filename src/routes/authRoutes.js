const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Auth
router.post('/login', authController.login);
router.post('/logout', authenticateToken, authController.logout);

// Registro de repartidor
router.post('/register', authController.register);
router.post('/verify-account', authController.verifyAccount);
router.post('/resend-verification', authController.resendVerification);

// Recuperación de contraseña
router.post('/request-recovery', authController.requestRecovery);
router.post('/verify-recovery', authController.verifyRecovery);
router.post('/reset-password', authController.resetPassword);

module.exports = router;


