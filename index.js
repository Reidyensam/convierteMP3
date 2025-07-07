const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Carpeta donde se guardan los audios
const audiosDir = path.join(__dirname, 'audios');
if (!fs.existsSync(audiosDir)) fs.mkdirSync(audiosDir);

// Servir archivos estáticos
app.use('/audios', express.static(audiosDir));

// Endpoint principal
app.post('/convertir', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ success: false, error: 'videoId requerido' });

  const salida = path.join(audiosDir, `${videoId}.mp3`);
  if (fs.existsSync(salida)) {
    return res.json({ success: true, url: `/audios/${videoId}.mp3`, cached: true });
  }

  const videoUrl = `https://www.dailymotion.com/video/${videoId}`;
  const cmd = `yt-dlp -f bestaudio "${videoUrl}" -o - | ffmpeg -i - -vn -ar 44100 -ac 2 -b:a 192k -y "${salida}"`;

  console.log(`🎬 Ejecutando: ${cmd}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error al convertir: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log(`✅ Audio convertido: ${salida}`);
    return res.json({ success: true, url: `/audios/${videoId}.mp3` });
  });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});