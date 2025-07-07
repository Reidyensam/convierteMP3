const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Carpeta temporal
const TMP_DIR = path.join(__dirname, 'audios');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// Ruta al binario de yt-dlp incluido en el proyecto
const YTDLP_PATH = path.join(__dirname, 'tools', 'yt-dlp');

// 🔁 Limpieza automática
setInterval(() => {
  const ahora = Date.now();
  const archivos = fs.readdirSync(TMP_DIR);
  archivos.forEach((archivo) => {
    const ruta = path.join(TMP_DIR, archivo);
    const stats = fs.statSync(ruta);
    if (ahora - stats.mtimeMs > 1000 * 60 * 60) fs.unlinkSync(ruta);
  });
}, 1000 * 60 * 60);

// 🚀 Endpoint de conversión
app.post('/convertir', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ success: false, error: 'videoId inválido' });
    }

    const videoUrl = `https://www.dailymotion.com/video/${videoId}`;
    const idUnico = uuidv4().slice(0, 8);
    const destino = path.join(TMP_DIR, `${idUnico}.mp3`);

    const comando = `"${YTDLP_PATH}" -f bestaudio -x --audio-format mp3 -o "${destino}" "${videoUrl}"`;
    console.log(`🌀 Ejecutando: ${comando}`);
    execSync(comando, { stdio: 'inherit' });

    if (!fs.existsSync(destino)) {
      return res.status(500).json({ success: false, error: 'Archivo no generado' });
    }

    res.json({
      success: true,
      url: `/audios/${idUnico}.mp3`,
      nombre: `${idUnico}.mp3`,
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir archivos
app.use('/audios', express.static(TMP_DIR));

// Prueba básica
app.get('/', (req, res) => {
  res.send('🎧 Backend Dailymotion-MP3 activo desde Render con yt-dlp local');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});