const db = require('../config/db');
const HttpError = require('../utils/HttpError');

const obtenerLogoEmpresaActiva = async () => {
    const [rows] = await db.query(
        `SELECT logo, nombreempresa
         FROM perfil_empresa
         WHERE estado = 'Activo'
         ORDER BY fechacreacion DESC
         LIMIT 1`
    );

    if (rows.length === 0) {
        throw new HttpError(404, 'No hay una empresa activa configurada.');
    }

    return {
        logo: rows[0].logo || null,
        nombreEmpresa: rows[0].nombreempresa || 'Dulcería Angelitos',
    };
};

module.exports = { obtenerLogoEmpresaActiva };


