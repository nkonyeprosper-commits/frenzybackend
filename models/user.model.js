const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  bait: { type: Number, default: 0 },
  fishingRods: { type: Number, default: 0 },
  lastLogin: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
