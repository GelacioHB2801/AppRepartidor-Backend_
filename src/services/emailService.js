const SibApiV3Sdk = require('sib-api-v3-sdk');

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.SIB_API_KEY;

const SENDER = { email: "20230118@uthh.edu.mx", name: "Dulcería Angelitos" };

const enviarCodigoVerificacion = async (correo, nombre, codigo) => {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
        sender: SENDER,
        to: [{ email: correo.trim().toLowerCase() }],
        subject: "Verificación de Correo Electrónico — App Repartidor",
        htmlContent: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #f43f5e; text-align: center;">🍬 Dulcería Angelitos — Repartidores</h2>
                <p style="font-size: 16px; text-align: center;">
                    Hola <strong>${nombre.trim()}</strong>, gracias por registrarte.
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 18px; color: #333; margin: 0;">Tu código de verificación es:</p>
                    <p style="font-size: 36px; font-weight: bold; color: #f43f5e; margin: 10px 0; letter-spacing: 8px;">${codigo}</p>
                    <p style="font-size: 16px; margin: 0;">Válido por <strong>15 minutos</strong>.</p>
                </div>
                <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">
                    Si no solicitaste esto, ignora este correo.
                </p>
            </div>
        `
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const enviarCodigoRecuperacion = async (correo, nombre, codigo) => {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
        sender: SENDER,
        to: [{ email: correo.trim().toLowerCase() }],
        subject: "Recuperación de Contraseña — App Repartidor",
        htmlContent: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #FF6B9D; margin: 0;">🍬 Dulcería Angelitos</h1>
                </div>
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #8B4513; text-align: center; margin-top: 0;">Recuperación de Contraseña</h2>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Hola <strong>${nombre}</strong>,
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Recibimos una solicitud para restablecer tu contraseña de la App de Repartidores. Usa el siguiente código:
                    </p>
                    <div style="background: linear-gradient(135deg, #f43f5e 0%, #f97316 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                        <p style="color: white; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Tu código es:</p>
                        <p style="font-size: 36px; font-weight: bold; color: white; margin: 0; letter-spacing: 8px;">
                            ${codigo}
                        </p>
                    </div>
                    <div style="background-color: #fff3cd; border-left: 4px solid #FFD700; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #856404;">
                            ⏰ <strong>Este código es válido por 15 minutos.</strong>
                        </p>
                    </div>
                    <p style="font-size: 14px; line-height: 1.6; color: #666;">
                        Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
                    </p>
                </div>
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p style="font-size: 12px; color: #999;">© 2025 Dulcería Angelitos</p>
                </div>
            </div>
        `
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = { enviarCodigoVerificacion, enviarCodigoRecuperacion };


