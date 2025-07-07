const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 📁 Rutas
const TMP_DIR = path.join(__dirname, 'audios');
const YTDLP_DIR = path.join(__dirname, 'tools');
const YTDLP_PATH = path.join(YTDLP_DIR, 'yt-dlp');

// ✅ Si yt-dlp no existe, lo descarga y le da permiso
function descargarYTDLP(destino, callback) {
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  const file = fs.createWriteStream(destino, { mode: 0o755 });

  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('✅ yt-dlp descargado y listo');
        if (callback) callback();
      });
    });
  }).on('error', (err) => {
    fs.unlink(destino, () => {});
    console.error('❌ Error al descargar yt-dlp:', err.message);
  });
}

// 📂 Crear carpetas necesarias
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
if (!fs.existsSync(YTDLP_DIR)) fs.mkdirSync(YTDLP_DIR);

// ⬇️ Descargar yt-dlp si no existe
if (!fs.existsSync(YTDLP_PATH)) {
  console.log('⬇️ yt-dlp no encontrado. Descargando...');
  descargarYTDLP(YTDLP_PATH);
}

app.use(cors());
app.use(express.json());
app.use('/audios', express.static(TMP_DIR));

// 🧹 Limpieza automática de audios cada hora
setInterval(() => {
  const ahora = Date.now();
  fs.readdirSync(TMP_DIR).forEach((archivo) => {
    const ruta = path.join(TMP_DIR, archivo);
    const stats = fs.statSync(ruta);
    if (ahora - stats.mtimeMs > 1000 * 60 * 60) {
      fs.unlinkSync(ruta);
      console.log(`🧹 Eliminado: ${archivo}`);
    }
  });
}, 1000 * 60 * 60);

// 🎧 Conversión Dailymotion → MP3
app.post('/convertir', async (req, res) => {
  try {
    const { videoId } = req.body;
    console.log('📩 Petición recibida:', req.body);

    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ success: false, error: 'videoId inválido' });
    }

    const videoURL = `https://www.dailymotion.com/video/${videoId}`;
    const archivoId = uuidv4().slice(0, 8);
    const destino = path.join(TMP_DIR, `${archivoId}.mp3`);

    const comando = `"${YTDLP_PATH}" -f bestaudio -x --audio-format mp3 -o "${destino}" "${videoURL}"`;
    execSync(comando, { stdio: 'inherit' });

    if (!fs.existsSync(destino)) {
      return res.status(500).json({ success: false, error: 'No se generó el archivo MP3' });
    }

    res.json({
      success: true,
      url: `/audios/${archivoId}.mp3`,
      nombre: `${archivoId}.mp3`
    });

  } catch (error) {
    console.error('❌ Error en conversión:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🌐 Ruta raíz
app.get('/', (req, res) => {
  res.send('🎵 Backend Dailymotion-MP3 activo y escuchando');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});