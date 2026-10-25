require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const repartidorRoutes = require('./src/routes/repartidorRoutes');
const perfilRoutes = require('./src/routes/perfilRoutes');
const legalRoutes = require('./src/routes/legalRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/repartidor', repartidorRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/empresa', empresaRoutes);

app.get('/', (req, res) => {
    res.json({
        mensaje: 'Backend de Repartidores (App Móvil) funcionando correctamente'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
