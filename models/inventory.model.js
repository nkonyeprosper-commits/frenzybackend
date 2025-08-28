const mongoose = require('mongoose');
const ItemSchema = require('./item.schema.js');

const InventorySchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, ref: 'User' },
  items: [{
    item: ItemSchema,
    quantity: { type: Number, required: true, default: 0 },
  }],
  bait: { type: Number, default: 10 },
  fishingRods: { type: Number, default: 1 },
});

const Inventory = mongoose.model('Inventory', InventorySchema);

module.exports = Inventory;
