const legalService = require('../services/legalService');

const responderError = (res, error, tipoDocumento) => {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(`Error al obtener ${tipoDocumento}:`, error);
    return res.status(500).json({ error: `No fue posible obtener ${tipoDocumento}.` });
};

const getTerminos = async (_req, res) => {
    try {
        const documento = await legalService.obtenerTerminosActivos();
        return res.json({ documento });
    } catch (error) {
        return responderError(res, error, 'los términos y condiciones');
    }
};

const getPoliticas = async (_req, res) => {
    try {
        const documento = await legalService.obtenerPoliticasActivas();
        return res.json({ documento });
    } catch (error) {
        return responderError(res, error, 'las políticas de privacidad');
    }
};

module.exports = { getTerminos, getPoliticas };
