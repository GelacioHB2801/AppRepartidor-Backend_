const db = require('../config/db');

const obtenerEmpresaActiva = async () => {
    const [empresas] = await db.query(
        `SELECT id_empresa
         FROM perfil_empresa
         WHERE estado = 'Activo'
         ORDER BY fechacreacion DESC
         LIMIT 1`
    );

    if (empresas.length === 0) {
        throw { status: 404, message: 'No hay una empresa activa configurada.' };
    }

    return empresas[0].id_empresa;
};

const obtenerTerminosActivos = async () => {
    const idEmpresa = await obtenerEmpresaActiva();
    const [rows] = await db.query(
        `SELECT titulo, contenido, version, fechapublicacion AS fechaPublicacion, ultima_actualizacion AS ultimaActualizacion
         FROM terminos
         WHERE id_empresa = ? AND estado = 'Activo'
         ORDER BY fechapublicacion DESC
         LIMIT 1`,
        [idEmpresa]
    );

    if (rows.length === 0) {
        throw { status: 404, message: 'No hay términos y condiciones activos.' };
    }

    return rows[0];
};

const obtenerPoliticasActivas = async () => {
    const idEmpresa = await obtenerEmpresaActiva();
    const [rows] = await db.query(
        `SELECT titulo, contenido, version, fecha_publicacion AS fechaPublicacion, ultima_actualizacion AS ultimaActualizacion
         FROM politicas
         WHERE id_empresa = ? AND estado = 'Activa'
         ORDER BY fecha_publicacion DESC
         LIMIT 1`,
        [idEmpresa]
    );

    if (rows.length === 0) {
        throw { status: 404, message: 'No hay políticas de privacidad activas.' };
    }

    return rows[0];
};

module.exports = {
    obtenerTerminosActivos,
    obtenerPoliticasActivas,
};
