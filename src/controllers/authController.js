const authService = require('../services/authService');

const login = async (req, res) => {
    const { correo, password } = req.body;
    try {
        const { token, user } = await authService.loginUser(correo, password);
        return res.status(200).json({ message: 'Login exitoso.', token, user });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error login:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
};

const logout = async (req, res) => {
    try {
        await authService.logoutUser(req.user.id_usuarios);
        res.json({ message: 'Sesión cerrada en el dispositivo.' });
    } catch (error) {
        console.warn('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión.' });
    }
};

const register = async (req, res) => {
    try {
        await authService.registrarRepartidor(req.body);
        res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Error register:', error);
        res.status(500).json({ error: 'Error al registrar. Intenta de nuevo.' });
    }
};

const verifyAccount = async (req, res) => {
    try {
        const { correo, codigo } = req.body;
        await authService.verificarCuentaRepartidor(correo, codigo);
        res.json({ message: 'Correo verificado. Tu solicitud está pendiente de aprobación por Dulcería Angelitos.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al verificar.' });
    }
};

const resendVerification = async (req, res) => {
    try {
        const { correo } = req.body;
        await authService.reenviarCodigoVerificacion(correo);
        res.json({ message: 'Se envió un nuevo código a tu correo.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al reenviar el código.' });
    }
};

const requestRecovery = async (req, res) => {
    try {
        const { correo } = req.body;
        await authService.solicitarRecuperacion(correo);
        res.json({ message: 'Se envió un código de recuperación a tu correo.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al solicitar recuperación.' });
    }
};

const verifyRecovery = async (req, res) => {
    try {
        const { correo, codigo } = req.body;
        await authService.verificarCodigoRecuperacion(correo, codigo);
        res.json({ message: 'Código verificado. Ahora puedes cambiar tu contraseña.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al verificar código.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { correo, nuevaPassword } = req.body;
        await authService.resetearPassword(correo, nuevaPassword);
        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Error al actualizar contraseña.' });
    }
};

module.exports = {
    login,
    logout,
    register,
    verifyAccount,
    resendVerification,
    requestRecovery,
    verifyRecovery,
    resetPassword
};
