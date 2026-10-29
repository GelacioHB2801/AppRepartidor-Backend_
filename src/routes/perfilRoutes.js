const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, perfilController.getPerfil);
router.put('/', authenticateToken, perfilController.updatePerfil);

module.exports = router;


