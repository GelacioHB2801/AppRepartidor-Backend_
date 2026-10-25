const db = require('../config/db');
const HttpError = require('../utils/HttpError');

const obtenerPerfil = async (userId) => {
    const [rows] = await db.query(
        `SELECT 
            id_usuarios,
            Nombre,
            ApellidoP,
            ApellidoM,
            Telefono,
            Correo,
            TipoUsuario,
            Estado,
            FechaRegistro,
            UltimaActividad
        FROM usuarios1
        WHERE id_usuarios = ?`,
        [userId]
    );

    if (rows.length === 0) {
        throw new HttpError(404, 'Usuario no encontrado.');
    }

    const usuario = rows[0];

    return {
        id: usuario.id_usuarios,
        nombreCompleto: `${usuario.Nombre} ${usuario.ApellidoP} ${usuario.ApellidoM}`,
        nombre: usuario.Nombre,
        apellidoP: usuario.ApellidoP,
        apellidoM: usuario.ApellidoM,
        telefono: usuario.Telefono,
        correo: usuario.Correo,
        tipoUsuario: usuario.TipoUsuario,
        estado: usuario.Estado,
        fechaRegistro: usuario.FechaRegistro,
        ultimaActividad: usuario.UltimaActividad
    };
};

const actualizarPerfil = async (userId, datos) => {
    const { nombre, apellidoP, apellidoM, telefono } = datos;

    if (!nombre || !apellidoP || !telefono) {
        throw new HttpError(400, 'Nombre, apellido paterno y teléfono son obligatorios.');
    }

    await db.query(
        `UPDATE usuarios1 
         SET Nombre = ?, ApellidoP = ?, ApellidoM = ?, Telefono = ?
         WHERE id_usuarios = ?`,
        [nombre, apellidoP, apellidoM, telefono, userId]
    );
};

module.exports = {
    obtenerPerfil,
    actualizarPerfil
};
