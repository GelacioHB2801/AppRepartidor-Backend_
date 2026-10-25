require('dotenv').config();

const crypto = require('node:crypto');

const codigoIngresado = process.argv[2];
const fechaExpiracion = process.argv[3];
const codigo = (codigoIngresado || `REP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`).trim().toUpperCase();
const secreto = process.env.REGISTRATION_CODE_SECRET || process.env.JWT_SECRET;

if (!secreto) {
    console.error('Configura REGISTRATION_CODE_SECRET o JWT_SECRET en el archivo .env antes de generar códigos.');
    process.exit(1);
}

if (!fechaExpiracion) {
    console.error('Uso: node scripts/generarCodigoRepartidor.js [CODIGO] "YYYY-MM-DD HH:MM:SS"');
    process.exit(1);
}

const codigoHash = crypto
    .createHmac('sha256', secreto)
    .update(codigo)
    .digest('hex');

console.log(`Código para entregar al repartidor: ${codigo}`);
console.log(`Hash para la base de datos: ${codigoHash}`);
console.log('Ejecuta esta sentencia en MySQL para registrarlo:');
console.log(
    `INSERT INTO codigo_repartidores (codigo_hash, estado, fecha_creacion, fecha_expiracion) VALUES ('${codigoHash}', 'Disponible', NOW(), '${fechaExpiracion}');`
);
