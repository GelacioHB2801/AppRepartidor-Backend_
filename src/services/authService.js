const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const emailService = require('./emailService');
const HttpError = require('../utils/HttpError');

const generarCodigo4Digitos = () => Math.floor(1000 + Math.random() * 9000).toString();

const obtenerHashCodigoRegistro = (codigoRegistro) => {
    const secreto = process.env.REGISTRATION_CODE_SECRET || process.env.JWT_SECRET;

    if (!secreto) {
        throw new HttpError(500, 'Falta configurar el secreto de códigos de registro.');
    }

    return crypto
        .createHmac('sha256', secreto)
        .update(codigoRegistro.trim().toUpperCase())
        .digest('hex');
};

// ==================== REGISTRO ====================
const registrarRepartidor = async (datos) => {
    const { nombre, apellidoP, apellidoM, correo, telefono, codigoRegistro, password } = datos;

    if (!codigoRegistro?.trim()) {
        throw new HttpError(400, 'El código de repartidor es obligatorio.');
    }

    const correoNormalizado = correo?.trim().toLowerCase();
    const codigoHash = obtenerHashCodigoRegistro(codigoRegistro);
    const codigoVerificacion = generarCodigo4Digitos();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 12);
    const connection = await db.getConnection();
    let transaccionIniciada = false;

    try {
        await connection.beginTransaction();
        transaccionIniciada = true;

        const [existe] = await connection.query(
            'SELECT id_usuarios FROM usuarios1 WHERE Correo = ? FOR UPDATE',
            [correoNormalizado]
        );
        if (existe.length > 0) {
            throw new HttpError(409, 'Ya existe una cuenta con ese correo electrónico.');
        }

        const [codigos] = await connection.query(
            `SELECT id_codigo
             FROM codigo_repartidores
             WHERE codigo_hash = ?
               AND estado = 'Disponible'
               AND fecha_expiracion > NOW()
               AND id_usuario_usado IS NULL
             FOR UPDATE`,
            [codigoHash]
        );

        if (codigos.length === 0) {
            throw new HttpError(400, 'El código de registro no es válido, ya fue usado o expiró.');
        }

        const [resultado] = await connection.query(`
            INSERT INTO usuarios1
            (Nombre, ApellidoP, ApellidoM, Correo, Telefono, Password, TipoUsuario, Estado, FechaRegistro, VerificacionCodigo, MFAExpiry, PreguntaSecreta, RespuestaSecreta)
            VALUES (?, ?, ?, ?, ?, ?, 'Repartidor', 'Pendiente', NOW(), ?, ?, '', '')
        `, [nombre, apellidoP, apellidoM || '', correoNormalizado, telefono, hashedPassword, codigoVerificacion, expiry]);

        const [actualizacionCodigo] = await connection.query(
            `UPDATE codigo_repartidores
             SET estado = 'Usado', fecha_uso = NOW(), id_usuario_usado = ?
             WHERE id_codigo = ? AND estado = 'Disponible' AND id_usuario_usado IS NULL`,
            [resultado.insertId, codigos[0].id_codigo]
        );

        if (actualizacionCodigo.affectedRows !== 1) {
            throw new HttpError(409, 'El código de registro ya fue utilizado. Solicita uno nuevo.');
        }

        await connection.commit();
        transaccionIniciada = false;
    } catch (error) {
        if (transaccionIniciada) {
            await connection.rollback();
        }
        throw error;
    } finally {
        connection.release();
    }

    await emailService.enviarCodigoVerificacion(correoNormalizado, nombre, codigoVerificacion);
};

// ==================== VERIFICAR CUENTA ====================
const verificarCuentaRepartidor = async (correo, codigo) => {
    const [usuarios] = await db.query(
        'SELECT id_usuarios, VerificacionCodigo, MFAExpiry, Estado FROM usuarios1 WHERE Correo = ?',
        [correo]
    );

    if (usuarios.length === 0) throw new HttpError(404, 'Correo no encontrado.');

    const user = usuarios[0];

    if (user.Estado !== 'Pendiente') {
        throw new HttpError(400, 'Esta cuenta no puede verificarse en su estado actual.');
    }

    if (!user.VerificacionCodigo || user.VerificacionCodigo !== codigo) {
        throw new HttpError(400, 'Código incorrecto.');
    }

    if (new Date() > new Date(user.MFAExpiry)) {
        throw new HttpError(400, 'El código ha expirado. Solicita uno nuevo.');
    }

    await db.query(
        'UPDATE usuarios1 SET VerificacionCodigo = NULL, MFAExpiry = NULL WHERE id_usuarios = ?',
        [user.id_usuarios]
    );
};

// ==================== REENVIAR CÓDIGO DE VERIFICACIÓN ====================
const reenviarCodigoVerificacion = async (correo) => {
    const [usuarios] = await db.query(
        'SELECT id_usuarios, Nombre, Estado, VerificacionCodigo, MFAExpiry FROM usuarios1 WHERE Correo = ?',
        [correo]
    );
    if (usuarios.length === 0) throw new HttpError(404, 'Correo no encontrado.');
    const user = usuarios[0];
    if (user.Estado !== 'Pendiente' || (!user.VerificacionCodigo && !user.MFAExpiry)) {
        throw new HttpError(400, 'El correo de esta cuenta ya fue verificado.');
    }

    const codigo = generarCodigo4Digitos();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
        'UPDATE usuarios1 SET VerificacionCodigo = ?, MFAExpiry = ? WHERE id_usuarios = ?',
        [codigo, expiry, user.id_usuarios]
    );
    await emailService.enviarCodigoVerificacion(correo, user.Nombre, codigo);
};

// ==================== SOLICITAR RECUPERACIÓN ====================
const solicitarRecuperacion = async (correo) => {
    const [usuarios] = await db.query('SELECT id_usuarios, Nombre FROM usuarios1 WHERE Correo = ? AND TipoUsuario = ?', [correo, 'Repartidor']);
    if (usuarios.length === 0) throw new HttpError(404, 'No existe una cuenta de repartidor con ese correo.');

    const user = usuarios[0];
    const codigo = generarCodigo4Digitos();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
        'UPDATE usuarios1 SET RecuperacionCodigo = ?, RecuperacionExpiry = ? WHERE id_usuarios = ?',
        [codigo, expiry, user.id_usuarios]
    );
    await emailService.enviarCodigoRecuperacion(correo, user.Nombre, codigo);
};

// ==================== VERIFICAR CÓDIGO DE RECUPERACIÓN ====================
const verificarCodigoRecuperacion = async (correo, codigo) => {
    const [usuarios] = await db.query(
        'SELECT id_usuarios, RecuperacionCodigo, RecuperacionExpiry FROM usuarios1 WHERE Correo = ? AND TipoUsuario = ?',
        [correo, 'Repartidor']
    );
    if (usuarios.length === 0) throw new HttpError(404, 'Correo no encontrado.');

    const user = usuarios[0];
    if (!user.RecuperacionCodigo || user.RecuperacionCodigo !== codigo) {
        throw new HttpError(400, 'Código incorrecto.');
    }
    if (new Date() > new Date(user.RecuperacionExpiry)) {
        throw new HttpError(400, 'El código ha expirado. Solicita uno nuevo.');
    }

    // Marcar como verificado (limpiar código) para que el siguiente paso sepa que puede cambiar
    await db.query(
        'UPDATE usuarios1 SET RecuperacionCodigo = NULL WHERE id_usuarios = ?',
        [user.id_usuarios]
    );
};

// ==================== RESETEAR CONTRASEÑA ====================
const resetearPassword = async (correo, nuevaPassword) => {
    const [usuarios] = await db.query(
        'SELECT id_usuarios, Password FROM usuarios1 WHERE Correo = ? AND TipoUsuario = ?',
        [correo, 'Repartidor']
    );
    if (usuarios.length === 0) throw new HttpError(404, 'Correo no encontrado.');

    // Verificar que la nueva contraseña no sea igual a la actual
    const esMismaPassword = await bcrypt.compare(nuevaPassword, usuarios[0].Password);
    if (esMismaPassword) {
        throw new HttpError(400, 'La nueva contraseña no puede ser igual a la actual.');
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 12);
    await db.query(
        'UPDATE usuarios1 SET Password = ?, RecuperacionExpiry = NULL, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE id_usuarios = ?',
        [hashedPassword, usuarios[0].id_usuarios]
    );
};

const loginUser = async (correo, password) => {
    const [usuarios] = await db.query('SELECT * FROM usuarios1 WHERE Correo = ?', [correo]);

    // Anti-timing attack
    if (usuarios.length === 0) {
        await new Promise(r => setTimeout(r, 1200));
        throw new HttpError(400, 'Correo o contraseña incorrectos.');
    }

    const user = usuarios[0];

    // Ensure only Repartidor can log into the mobile app
    if (user.TipoUsuario !== 'Repartidor') {
        throw new HttpError(403, 'Acceso denegado. Solo para repartidores.');
    }

    // Bloqueo temporal por intentos fallidos
    if (user.BloqueadoHasta && new Date() < new Date(user.BloqueadoHasta)) {
        const minutos = Math.ceil((new Date(user.BloqueadoHasta) - new Date()) / 60000);
        throw new HttpError(429, `Cuenta bloqueada por seguridad. Intenta de nuevo en ${minutos} minuto${minutos > 1 ? 's' : ''}.`);
    }

    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
        const ahora = new Date();
        const intentos = (user.IntentosFallidos || 0) + 1;

        if (intentos >= 3) {
            const bloqueoHasta = new Date(ahora.getTime() + 15 * 60 * 1000); // +15 min
            await db.query(
                `UPDATE usuarios1 
                 SET IntentosFallidos = ?, UltimoIntentoFallido = ?, BloqueadoHasta = ?
                 WHERE id_usuarios = ?`,
                [intentos, ahora, bloqueoHasta, user.id_usuarios]
            );
            throw new HttpError(429, 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.');
        }

        // Solo incrementar intentos
        await db.query(
            `UPDATE usuarios1 
             SET IntentosFallidos = IntentosFallidos + 1, UltimoIntentoFallido = ?
             WHERE id_usuarios = ?`,
            [ahora, user.id_usuarios]
        );

        throw new HttpError(400, 'Correo o contraseña incorrectos.');
    }

    // Login correcto -> Resetear intentos
    await db.query(
        `UPDATE usuarios1 
         SET IntentosFallidos = 0, BloqueadoHasta = NULL, UltimoIntentoFallido = NULL, UltimaActividad = NOW()
         WHERE id_usuarios = ?`,
        [user.id_usuarios]
    );

    if (user.Estado === 'Pendiente') {
        if (user.VerificacionCodigo) {
            throw new HttpError(403, 'Primero verifica el código enviado a tu correo electrónico.');
        }
        throw new HttpError(403, 'Tu registro fue completado y está pendiente de aprobación por Dulcería Angelitos.');
    }

    if (user.Estado === 'Rechazado') {
        throw new HttpError(403, 'Tu solicitud de registro fue rechazada. Comunícate con Dulcería Angelitos para más información.');
    }

    if (user.Estado === 'Inactivo') {
        throw new HttpError(403, 'Tu cuenta está inactiva. Comunícate con Dulcería Angelitos.');
    }

    if (user.Estado !== 'Activo') {
        throw new HttpError(403, 'Tu cuenta no tiene acceso a la aplicación.');
    }

    const token = jwt.sign(
        { id: user.id_usuarios, correo: user.Correo, tipo: user.TipoUsuario },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Guardar el token
    await db.query(
        'UPDATE usuarios1 SET token_version = ? WHERE id_usuarios = ?',
        [token, user.id_usuarios]
    );

    return { token, user: { ...user, Password: undefined } };
};

const logoutUser = async (userId) => {
    await db.query(
        'UPDATE usuarios1 SET token_version = NULL WHERE id_usuarios = ?',
        [userId]
    );
};

module.exports = {
    loginUser,
    logoutUser,
    registrarRepartidor,
    verificarCuentaRepartidor,
    reenviarCodigoVerificacion,
    solicitarRecuperacion,
    verificarCodigoRecuperacion,
    resetearPassword
};
