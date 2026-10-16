const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Key = require('../models/Key');
const User = require('../models/User');

const router = express.Router();

function gerarKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bloco = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `777w1n-${bloco()}-${bloco()}-${bloco()}`;
}

// POST /generate — usado pelo bot
router.post('/generate', async (req, res) => {
  const { secret, duration_days } = req.body;

  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Secret inválido' });
  }

  // Gera key única
  let key;
  let existe = true;
  while (existe) {
    key = gerarKey();
    existe = await Key.findOne({ key });
  }

  // Calcula expiração
  const agora = new Date();
  const expires_at = duration_days === 0
    ? new Date('2099-12-31')
    : new Date(agora.getTime() + duration_days * 24 * 60 * 60 * 1000);

  await Key.create({ key, duration_days, expires_at });

  res.json({
    key,
    duration_days,
    expires_at: Math.floor(expires_at.getTime() / 1000)
  });
});

// POST /register — cria conta com key
router.post('/register', async (req, res) => {
  const { username, password, key } = req.body;

  if (!username || !password || !key) {
    return res.status(400).json({ error: 'Preencha tudo' });
  }

  // Valida key
  const keyDoc = await Key.findOne({ key });
  if (!keyDoc) return res.status(400).json({ error: 'Key inválida' });
  if (keyDoc.used) return res.status(400).json({ error: 'Key já usada' });
  if (new Date() > keyDoc.expires_at) return res.status(400).json({ error: 'Key expirada' });

  // Verifica se username já existe
  const existe = await User.findOne({ username });
  if (existe) return res.status(400).json({ error: 'Nome já usado' });

  // Cria user
  const hash = await bcrypt.hash(password, 10);
  await User.create({
    username,
    password: hash,
    key,
    expires_at: keyDoc.expires_at
  });

  // Marca key como usada
  keyDoc.used = true;
  keyDoc.used_by = username;
  keyDoc.used_at = new Date();
  await keyDoc.save();

  res.json({ success: true, message: 'Conta criada' });
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha tudo' });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Nome ou senha inválidos' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Nome ou senha inválidos' });

  if (new Date() > user.expires_at) {
    return res.status(403).json({ error: 'Key expirada' });
  }

  const token = jwt.sign(
    { username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    expires_at: Math.floor(user.expires_at.getTime() / 1000)
  });
});

// POST /validate — usado pelo cheat
router.post('/validate', async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ valid: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) return res.json({ valid: false });
    if (new Date() > user.expires_at) return res.json({ valid: false, reason: 'expirado' });

    res.json({ valid: true, username: user.username });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;