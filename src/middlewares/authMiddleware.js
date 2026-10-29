const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await db.query(
            `SELECT 
                id_usuarios,
                Correo AS correo,
                Estado,
                UltimaActividad,
                TipoUsuario
             FROM usuarios1
             WHERE id_usuarios = ?`,
            [decoded.id]
        );

        if (rows.length === 0 || rows[0].Estado !== 'Activo') {
            return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
        }

        let id_empresa = null;
        try {
            const [empresas] = await db.query(
                `SELECT id_empresa 
                 FROM perfil_empresa 
                 WHERE estado = 'Activo' 
                 ORDER BY fechacreacion DESC 
                 LIMIT 1`
            );
            if (empresas.length > 0) {
                id_empresa = empresas[0].id_empresa;
            }
        } catch (e) {
            // Ignore if the table does not exist or fails
        }

        await db.query(
            'UPDATE usuarios1 SET UltimaActividad = NOW() WHERE id_usuarios = ?',
            [decoded.id]
        );

        req.user = {
            id_usuarios: rows[0].id_usuarios,
            correo: rows[0].correo,
            TipoUsuario: rows[0].TipoUsuario,
            id_empresa
        };

        next();

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = { authenticateToken };



