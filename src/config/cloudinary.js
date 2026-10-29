const cloudinary = require('cloudinary').v2;
const HttpError = require('../utils/HttpError');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const validarConfiguracionCloudinary = () => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new HttpError(500, 'Faltan las credenciales de Cloudinary en el servidor.');
    }
};

module.exports = { cloudinary, validarConfiguracionCloudinary };

