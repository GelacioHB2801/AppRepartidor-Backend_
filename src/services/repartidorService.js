const db = require('../config/db');
const { Readable } = require('node:stream');
const { cloudinary, validarConfiguracionCloudinary } = require('../config/cloudinary');
const HttpError = require('../utils/HttpError');

const obtenerPedidosAsignados = async (id_repartidor) => {
    const [pedidos] = await db.query(`
        SELECT p.*, 
               u.Nombre as nombre_cliente, 
               u.Telefono as telefono_cliente,
               u.Correo as correo_cliente
        FROM pedidos p
        LEFT JOIN usuarios1 u ON p.id_usuario = u.id_usuarios
        WHERE p.id_repartidor = ? AND p.estado != 'Entregado' AND p.estado != 'Cancelado'
        ORDER BY p.fecha_pedido DESC
    `, [id_repartidor]);

    for (let p of pedidos) {
        const [detalles] = await db.query(`
            SELECT dp.*, pr.nombre as producto_nombre
            FROM detallepedidos dp
            JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = ?
        `, [p.id_pedido]);
        p.detalles = detalles;
    }

    return pedidos;
};

const iniciarEntregaPedido = async (id_pedido, id_repartidor) => {
    const [pedido] = await db.query(
        "SELECT id_pedido FROM pedidos WHERE id_pedido = ? AND id_repartidor = ?",
        [id_pedido, id_repartidor]
    );

    if (pedido.length === 0) {
        throw new HttpError(403, 'No autorizado');
    }

    await db.query(
        "UPDATE pedidos SET estado = 'En camino', fecha_envio = NOW() WHERE id_pedido = ?",
        [id_pedido]
    );
};

const obtenerDashboard = async (id_repartidor) => {
    // 1. Obtener Estadísticas Rápidas
    const [stats] = await db.query(`
        SELECT 
            SUM(CASE WHEN estado != 'Entregado' AND estado != 'Cancelado' AND estado != 'En camino' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'En camino' THEN 1 ELSE 0 END) as en_camino,
            SUM(CASE WHEN estado = 'Entregado' AND DATE(fecha_entrega) = CURDATE() THEN 1 ELSE 0 END) as entregados,
            SUM(CASE WHEN estado != 'Cancelado' AND estado != 'Entregado' THEN 1 ELSE 0 END) as total_activos
        FROM pedidos 
        WHERE id_repartidor = ?
    `, [id_repartidor]);

    // Calcular el "Total Hoy" según requerimiento (Pendientes + En camino + Entregados hoy)
    const pendientes = Number(stats[0].pendientes) || 0;
    const enCamino = Number(stats[0].en_camino) || 0;
    const entregados = Number(stats[0].entregados) || 0;
    const totalHoy = pendientes + enCamino + entregados;

    // 2. Obtener los próximos pedidos (En Camino tiene prioridad, luego los asignados por fecha más antigua)
    const [proximos] = await db.query(`
        SELECT p.*, u.Nombre as nombre_cliente 
        FROM pedidos p
        LEFT JOIN usuarios1 u ON p.id_usuario = u.id_usuarios
        WHERE p.id_repartidor = ? AND p.estado != 'Entregado' AND p.estado != 'Cancelado'
        ORDER BY 
            CASE WHEN p.estado = 'En camino' THEN 1 ELSE 2 END ASC,
            p.fecha_pedido ASC
        LIMIT 4
    `, [id_repartidor]);

    const proxima_entrega = proximos.length > 0 ? proximos[0] : null;
    const pedidos_pendientes = proximos.length > 1 ? proximos.slice(1) : [];

    // Obtener nombre del repartidor
    const [repartidor] = await db.query('SELECT Nombre FROM usuarios1 WHERE id_usuarios = ?', [id_repartidor]);

    return {
        stats: {
            pendientes,
            en_camino: enCamino,
            entregados,
            total_hoy: totalHoy
        },
        proxima_entrega,
        pedidos_pendientes,
        repartidor_nombre: repartidor.length > 0 ? repartidor[0].Nombre : 'Repartidor'
    };
};

const subirEvidenciaACloudinary = (foto, id_pedido) => {
    validarConfiguracionCloudinary();

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'dulceria_angelitos/evidencias_entrega',
                public_id: `pedido_${id_pedido}_${Date.now()}`,
                resource_type: 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto:good' }]
            },
            (error, resultado) => error ? reject(error) : resolve(resultado)
        );
        Readable.from(foto.buffer).pipe(uploadStream);
    });
};

const confirmarEntregaPedido = async (id_pedido, id_repartidor, evidencia) => {
    const [pedido] = await db.query(
        "SELECT id_pedido FROM pedidos WHERE id_pedido = ? AND id_repartidor = ? AND estado = 'En camino'",
        [id_pedido, id_repartidor]
    );

    if (pedido.length === 0) {
        throw new HttpError(403, 'No tienes permiso para entregar este pedido');
    }

    const fotoCloudinary = await subirEvidenciaACloudinary(evidencia.foto, id_pedido);
    const conexion = await db.getConnection();

    try {
        await conexion.beginTransaction();
        const [evidenciaExistente] = await conexion.query(
            'SELECT id_evidencia FROM evidencia_entrega WHERE id_pedido = ? FOR UPDATE',
            [id_pedido]
        );
        if (evidenciaExistente.length > 0) {
            throw new HttpError(409, 'Este pedido ya tiene una evidencia de entrega.');
        }

        await conexion.query(
            `INSERT INTO evidencia_entrega
             (id_pedido, url_foto, nombre_receptor, latitud, longitud, fecha_entrega)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [id_pedido, fotoCloudinary.secure_url, evidencia.nombreReceptor, evidencia.latitud, evidencia.longitud]
        );
        await conexion.query(
            "UPDATE pedidos SET estado = 'Entregado', fecha_entrega = NOW() WHERE id_pedido = ? AND estado = 'En camino'",
            [id_pedido]
        );
        await conexion.commit();
        return { url_foto: fotoCloudinary.secure_url, nombre_receptor: evidencia.nombreReceptor };
    } catch (error) {
        await conexion.rollback();
        if (fotoCloudinary.public_id) {
            await cloudinary.uploader.destroy(fotoCloudinary.public_id).catch(() => {});
        }
        throw error;
    } finally {
        conexion.release();
    }
};

const obtenerEvidenciaEntrega = async (id_pedido, id_repartidor) => {
    const [evidencias] = await db.query(
        `SELECT e.*
         FROM evidencia_entrega e
         JOIN pedidos p ON p.id_pedido = e.id_pedido
         WHERE e.id_pedido = ? AND p.id_repartidor = ?`,
        [id_pedido, id_repartidor]
    );
    if (evidencias.length === 0) {
        throw new HttpError(404, 'No se encontro evidencia para este pedido.');
    }
    return evidencias[0];
};

const registrarIncidenciaPedido = async (id_pedido, id_repartidor, descripcion) => {
    await db.query(
        "INSERT INTO incidencias (id_pedido, id_repartidor, descripcion) VALUES (?, ?, ?)",
        [id_pedido, id_repartidor, descripcion]
    );
};

const obtenerHistorialEntregas = async (id_repartidor, fecha_inicio, fecha_fin) => {
    let dateFilter = '';
    const params = [id_repartidor];

    if (fecha_inicio && fecha_fin) {
        dateFilter = 'AND p.fecha_entrega BETWEEN ? AND ?';
        // Agregamos "23:59:59" al final para asegurarnos que toma todo el día final
        params.push(`${fecha_inicio} 00:00:00`, `${fecha_fin} 23:59:59`);
    }

    const [historial] = await db.query(`
        SELECT p.*, u.Nombre as nombre_cliente, u.Telefono as telefono_cliente
        FROM pedidos p
        LEFT JOIN usuarios1 u ON p.id_usuario = u.id_usuarios
        WHERE p.id_repartidor = ? AND p.estado = 'Entregado'
        ${dateFilter}
        ORDER BY p.fecha_entrega DESC
    `, params);

    return historial;
};

const obtenerResumenCarga = async (id_repartidor) => {
    const [resumen] = await db.query(`
        SELECT pr.nombre, SUM(dp.cantidad) as total_cantidad
        FROM pedidos p
        JOIN detallepedidos dp ON p.id_pedido = dp.id_pedido
        JOIN productos pr ON dp.id_producto = pr.id_producto
        WHERE p.id_repartidor = ? 
        AND p.estado IN ('Confirmado', 'En camino')
        GROUP BY pr.id_producto
    `, [id_repartidor]);

    return resumen;
};

module.exports = {
    obtenerPedidosAsignados,
    iniciarEntregaPedido,
    obtenerDashboard,
    confirmarEntregaPedido,
    obtenerEvidenciaEntrega,
    registrarIncidenciaPedido,
    obtenerHistorialEntregas,
    obtenerResumenCarga
};
