const empresaService = require('../services/empresaService');

const getLogoEmpresa = async (_req, res) => {
    try {
        const empresa = await empresaService.obtenerLogoEmpresaActiva();
        return res.json({ empresa });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error al obtener el logo de la empresa:', error);
        return res.status(500).json({ error: 'No fue posible obtener el logo de la empresa.' });
    }
};

module.exports = { getLogoEmpresa };


