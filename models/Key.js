const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  duration_days: { type: Number, required: true }, // 0 = lifetime
  used: { type: Boolean, default: false },
  used_by: { type: String, default: null },       // nome do user
  used_at: { type: Date, default: null },
  expires_at: { type: Date, required: true },     // data de expiração
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Key', keySchema);