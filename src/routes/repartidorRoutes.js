const express = require('express');
const router = express.Router();
const repartidorController = require('../controllers/repartidorController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (!formatosPermitidos.includes(file.mimetype)) {
            return callback(new Error('Formato no permitido. Usa una imagen JPG, PNG o WEBP.'));
        }
        callback(null, true);
    }
});

const subirFotoEvidencia = (req, res, next) => {
    upload.single('foto')(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'La foto no puede superar los 10 MB.' });
        }
        return res.status(400).json({ error: error.message || 'No fue posible procesar la foto.' });
    });
};

router.get('/pedidos', authenticateToken, repartidorController.getPedidosAsignados);
router.put('/iniciar-entrega/:id_pedido', authenticateToken, repartidorController.iniciarEntrega);
router.get('/dashboard', authenticateToken, repartidorController.getDashboard);
router.put('/entregar/:id_pedido', authenticateToken, subirFotoEvidencia, repartidorController.confirmarEntrega);
router.get('/entregar/:id_pedido/evidencia', authenticateToken, repartidorController.getEvidenciaEntrega);
router.post('/incidencia', authenticateToken, repartidorController.registrarIncidencia);
router.get('/historial', authenticateToken, repartidorController.getHistorialEntregas);
router.get('/resumen-carga', authenticateToken, repartidorController.getResumenCarga);

module.exports = router;
