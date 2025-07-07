const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Ruta al ejecutable yt-dlp local
const YTDLP_PATH = path.join(__dirname, 'tools', 'yt-dlp');

// 📁 Carpeta temporal para audios
const TMP_DIR = path.join(__dirname, 'audios');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR);
  console.log('📂 Carpeta /audios creada');
}

app.use(cors());
app.use(express.json());

// 🧹 Limpieza cada hora
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

// 🎧 Conversión de video Dailymotion a MP3
app.post('/convertir', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ success: false, error: 'videoId inválido' });
    }

    const url = `https://www.dailymotion.com/video/${videoId}`;
    const archivoId = uuidv4().slice(0, 8);
    const destino = path.join(TMP_DIR, `${archivoId}.mp3`);

    // ✅ Ejecutar yt-dlp directamente
    const comando = `"${YTDLP_PATH}" -f bestaudio -x --audio-format mp3 -o "${destino}" "${url}"`;
    execSync(comando, { stdio: 'inherit' });

    if (!fs.existsSync(destino)) {
      return res.status(500).json({ success: false, error: 'No se generó el MP3' });
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

// 📦 Servir MP3 desde carpeta
app.use('/audios', express.static(TMP_DIR));

// 🌐 Ruta raíz
app.get('/', (req, res) => {
  res.send('🎵 Backend Dailymotion-MP3 activo con yt-dlp local');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});