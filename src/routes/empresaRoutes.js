const express = require('express');
const empresaController = require('../controllers/empresaController');

const router = express.Router();

// Información pública necesaria antes de que el repartidor inicie sesión.
router.get('/logo', empresaController.getLogoEmpresa);

module.exports = router;


