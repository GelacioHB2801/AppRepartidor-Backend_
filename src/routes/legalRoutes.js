const express = require('express');
const legalController = require('../controllers/legalController');

const router = express.Router();

// Son documentos públicos de consulta; no modifican información.
router.get('/terminos', legalController.getTerminos);
router.get('/politicas', legalController.getPoliticas);

module.exports = router;


