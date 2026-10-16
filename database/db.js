const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] MongoDB conectado');
  } catch (err) {
    console.error('[DB] Erro ao conectar:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;