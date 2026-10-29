const repartidorService = require('../services/repartidorService');

// === VER PEDIDOS ASIGNADOS (No entregados) ===
const getPedidosAsignados = async (req, res) => {
    try {
        const pedidos = await repartidorService.obtenerPedidosAsignados(req.user.id_usuarios);
        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos del repartidor:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// === INICIAR ENTREGA (Cambiar a En Camino) ===
const iniciarEntrega = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        await repartidorService.iniciarEntregaPedido(id_pedido, req.user.id_usuarios);
        res.json({ message: 'Pedido ahora está en camino' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al iniciar entrega' });
    }
};

// === OBTENER DASHBOARD INICIAL ===
const getDashboard = async (req, res) => {
    try {
        const dashboardData = await repartidorService.obtenerDashboard(req.user.id_usuarios);
        res.json(dashboardData);
    } catch (error) {
        console.error('Error al obtener dashboard:', error);
        res.status(500).json({ error: 'Error al obtener dashboard' });
    }
};

// === CONFIRMAR ENTREGA DE PEDIDO ===
const confirmarEntrega = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        const { nombre_receptor, latitud, longitud } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Debes tomar o seleccionar una foto como evidencia de entrega.' });
        }

        const nombreReceptor = String(nombre_receptor || '').trim();
        const latitudNumero = Number(latitud);
        const longitudNumero = Number(longitud);

        if (!nombreReceptor || nombreReceptor.length > 150) {
            return res.status(400).json({ error: 'Ingresa el nombre de quien recibio el pedido (maximo 150 caracteres).' });
        }
        if (!Number.isFinite(latitudNumero) || latitudNumero < -90 || latitudNumero > 90) {
            return res.status(400).json({ error: 'La latitud de entrega no es valida.' });
        }
        if (!Number.isFinite(longitudNumero) || longitudNumero < -180 || longitudNumero > 180) {
            return res.status(400).json({ error: 'La longitud de entrega no es valida.' });
        }

        await repartidorService.confirmarEntregaPedido(id_pedido, req.user.id_usuarios, {
            foto: req.file,
            nombreReceptor,
            latitud: latitudNumero,
            longitud: longitudNumero
        });
        res.json({ message: 'Pedido marcado como entregado con éxito' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error al confirmar entrega:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getEvidenciaEntrega = async (req, res) => {
    try {
        const evidencia = await repartidorService.obtenerEvidenciaEntrega(req.params.id_pedido, req.user.id_usuarios);
        res.json(evidencia);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error al obtener evidencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// === REGISTRAR INCIDENCIA ===
const registrarIncidencia = async (req, res) => {
    try {
        const { id_pedido, descripcion } = req.body;
        await repartidorService.registrarIncidenciaPedido(id_pedido, req.user.id_usuarios, descripcion);
        res.json({ message: 'Incidencia registrada correctamente' });
    } catch (error) {
        console.error('Error al registrar incidencia:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// === HISTORIAL DE ENTREGAS REALIZADAS ===
const getHistorialEntregas = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const historial = await repartidorService.obtenerHistorialEntregas(req.user.id_usuarios, fecha_inicio, fecha_fin);
        res.json(historial);
    } catch (error) {
        console.error('Error al obtener historial del repartidor:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// === RESUMEN DE CARGA (Total de productos a llevar en el día) ===
const getResumenCarga = async (req, res) => {
    try {
        const resumen = await repartidorService.obtenerResumenCarga(req.user.id_usuarios);
        res.json(resumen);
    } catch (error) {
        console.error('Error al obtener resumen de carga:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

module.exports = {
    getPedidosAsignados,
    iniciarEntrega,
    getDashboard,
    confirmarEntrega,
    getEvidenciaEntrega,
    registrarIncidencia,
    getHistorialEntregas,
    getResumenCarga
};


