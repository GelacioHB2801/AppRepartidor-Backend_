const perfilService = require('../services/perfilService');

// ===============================
// OBTENER PERFIL DEL USUARIO
// ===============================
const getPerfil = async (req, res) => {
    try {
        const perfil = await perfilService.obtenerPerfil(req.user.id_usuarios);
        res.status(200).json({ perfil });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================
// ACTUALIZAR PERFIL DEL USUARIO
// ===============================
const updatePerfil = async (req, res) => {
    try {
        await perfilService.actualizarPerfil(req.user.id_usuarios, req.body);
        res.json({ message: 'Perfil actualizado correctamente.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = {
    getPerfil,
    updatePerfil
};


