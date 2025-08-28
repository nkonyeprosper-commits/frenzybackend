const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Changed from itemId to id for consistency
  name: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  description: { type: String },
});

module.exports = ItemSchema;
