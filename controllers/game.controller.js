const User = require("../models/user.model.js");
const Inventory = require("../models/inventory.model.js");
const { isValidAddress } = require("../utils/validators.js");
const web3Service = require("../services/web3.service.js");

// Initialize player inventory if not exists
const initializePlayerInventory = async (address) => {
  const existingInventory = await Inventory.findOne({ address });
  if (!existingInventory) {
    const newInventory = new Inventory({ address });
    await newInventory.save();
    return newInventory;
  }
  return existingInventory;
};

// Get player inventory
const getInventory = async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  const user = await User.findOne({ address });
  const inventory = await Inventory.findOne({ address });

  if (!user || !inventory) {
    return res.status(404).json({ error: "Player not found." });
  }

  res.json({
    items: inventory.items,
    bait: user.bait,
    fishingRods: user.fishingRods,
  });
};

// Get or register player
const getPlayer = async (req, res) => {
  const { address } = req.params;

  //   console.log(address, "Consolidating, fear in things");

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  try {
    let user = await User.findOne({ address });

    if (!user) {
      return res.status(404).json({
        error: "Player not found",
        needsRegistration: true,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get inventory
    let inventory = await Inventory.findOne({ address });
    if (!inventory) {
      inventory = await initializePlayerInventory(address);
    }

    // Get frenzy balance from blockchain
    const frenzyBalance = await web3Service.getFrenzyBalance(address);

    res.json({
      success: true,
      player: {
        address: user.address,
        username: user.username,
        lastLogin: user.lastLogin,
        // Flatten inventory structure to match frontend expectations
        items: inventory.items,
        bait: user.bait,
        fishingRods: user.fishingRods,
        frenzyBalance: parseFloat(frenzyBalance) || 0,
      },
    });
  } catch (error) {
    console.error("Error getting player:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Register new player
const registerPlayer = async (req, res) => {
  const { address, username } = req.body;

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  if (!username || username.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters" });
  }

  try {
    // Check if user already exists
    let existingUser = await User.findOne({ address });
    if (existingUser) {
      // Update last login and return existing user
      existingUser.lastLogin = new Date();
      await existingUser.save();

      let inventory = await Inventory.findOne({ address });
      if (!inventory) {
        inventory = await initializePlayerInventory(address);
      }

      // Get frenzy balance from blockchain
      const frenzyBalance = await web3Service.getFrenzyBalance(address);

      return res.json({
        success: true,
        player: {
          address: existingUser.address,
          username: existingUser.username,
          lastLogin: existingUser.lastLogin,
          // Flatten inventory structure to match frontend expectations
          items: inventory.items,
          bait: existingUser.bait,
          fishingRods: existingUser.fishingRods,
          frenzyBalance: parseFloat(frenzyBalance) || 0,
        },
      });
    }

    // Create new user
    const newUser = new User({
      address,
      username: username.trim(),
      bait: 0,
      fishingRods: 0,
      lastLogin: new Date(),
    });

    await newUser.save();

    // Initialize inventory
    const inventory = await initializePlayerInventory(address);

    // Get frenzy balance from blockchain
    const frenzyBalance = await web3Service.getFrenzyBalance(address);

    res.status(201).json({
      success: true,
      message: "Player registered successfully",
      player: {
        address: newUser.address,
        username: newUser.username,
        lastLogin: newUser.lastLogin,
        // Flatten inventory structure to match frontend expectations
        items: inventory.items,
        bait: newUser.bait,
        fishingRods: newUser.fishingRods,
        frenzyBalance: parseFloat(frenzyBalance) || 0,
      },
    });
  } catch (error) {
    console.error("Error registering player:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Address already registered" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fishing endpoint
const fishingCatch = async (req, res) => {
  const { address, frenzyBalance } = req.body;

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  const user = await User.findOne({ address });
  const inventory = await Inventory.findOne({ address });

  if (!user || !inventory) {
    return res.status(404).json({ error: "Player not found" });
  }

  if (user.bait <= 0) {
    return res.json({ success: false, message: "No bait available" });
  }

  user.bait--;

  const random = Math.random() * 100; // Percentage-based
  let rodBroken = false;
  let caughtItem = null;

  // Rod breaking chance (e.g., 5% on any cast)
  if (Math.random() < 0.05) {
    rodBroken = true;
    user.fishingRods = Math.max(0, user.fishingRods - 1);
  }

  if (random <= 75) {
    // 75% chance for Common
    caughtItem = {
      id: "common-fish", // Changed from itemId to id
      name: "Common Fish",
      type: "common",
      value: 1,
      description: "A regular fish.",
    };
  } else if (random <= 95) {
    // 20% chance for Gold
    caughtItem = {
      id: "gold-fish", // Changed from itemId to id
      name: "Gold Fish",
      type: "gold",
      value: 15000,
      description: "A shiny golden fish.",
    };
  } else if (random <= 99) {
    // 4% chance for Diamond
    caughtItem = {
      id: "diamond-fish", // Changed from itemId to id
      name: "Diamond Fish",
      type: "diamond",
      value: 50000,
      description: "A sparkling diamond fish.",
    };
  } else {
    // 1% chance for Magmafish
    caughtItem = {
      id: "magma-fish", // Changed from itemId to id
      name: "Magmafish",
      type: "magma",
      value: 100000,
      description: "An extremely rare fish from the depths of the volcano.",
    };
  }

  // Add to inventory
  const existingItem = inventory.items.find(
    (i) => i.item.id === caughtItem.id // Changed from itemId to id
  );
  if (existingItem) {
    existingItem.quantity++;
  } else {
    inventory.items.push({ item: caughtItem, quantity: 1 });
  }

  await user.save();
  await inventory.save();

  const message = rodBroken
    ? `You caught a ${caughtItem.name} but your rod broke!`
    : `You caught a ${caughtItem.name}!`;

  res.json({ success: true, item: caughtItem, rodBroken, message });
};

// Get purchase details endpoint (no DB updates)
const getPurchaseDetails = async (req, res) => {
  const { address, cart } = req.body;

  if (!isValidAddress(address) || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const user = await User.findOne({ address });
  if (!user) {
    return res.status(404).json({ error: "Player not found" });
  }

  const prices = {
    "bait-1": 10000,
    "bait-5": 45000,
    "bait-25": 200000,
    "bait-100": 700000,
    "rod-1": 10000,
  };

  let totalCost = 0;
  const itemDetails = [];
  
  for (const item of cart) {
    if (prices[item.itemId]) {
      const itemCost = prices[item.itemId] * item.quantity;
      totalCost += itemCost;
      itemDetails.push({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: prices[item.itemId],
        totalPrice: itemCost
      });
    } else {
      return res.status(400).json({ error: `Invalid item ID: ${item.itemId}` });
    }
  }

  res.json({
    success: true,
    message: "Purchase details calculated",
    totalCost,
    recipient: web3Service.adminWalletAddress,
    itemDetails,
    cartSummary: `${cart.length} item(s) totaling ${totalCost} Frenzy`
  });
};

// Buy items endpoint (DEPRECATED - use verifyPurchase instead)
const buyItems = async (req, res) => {
  // This endpoint is deprecated in favor of the new flow:
  // 1. getPurchaseDetails -> get transaction details
  // 2. Frontend handles Web3 transaction
  // 3. verifyPurchase -> verify transaction and update inventory
  
  return res.status(400).json({ 
    error: "This endpoint is deprecated. Use getPurchaseDetails and verifyPurchase instead." 
  });
};

const verifyPurchase = async (req, res) => {
  const { address, txHash, cart } = req.body;
  
  if (!isValidAddress(address) || !txHash || !Array.isArray(cart)) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  try {
    // Verify the transaction on the blockchain
    const verificationResult = await web3Service.verifyPurchase(txHash);

    if (!verificationResult.success) {
      return res.status(400).json({
        error: "Transaction verification failed",
        details: verificationResult.error,
      });
    }

    // Get user from database
    const user = await User.findOne({ address });
    if (!user) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Process each item in the cart and update user inventory
    let totalItemsAdded = 0;
    const itemsProcessed = [];
    
    for (const item of cart) {
      const [type, amount] = item.itemId.split("-"); // TODO: Change to item.id when frontend is updated
      const quantityToAdd = parseInt(amount) * item.quantity;
      
      if (type === "bait") {
        user.bait += quantityToAdd;
        totalItemsAdded += quantityToAdd;
        itemsProcessed.push(`${quantityToAdd} bait`);
      } else if (type === "rod") {
        user.fishingRods += quantityToAdd;
        totalItemsAdded += quantityToAdd;
        itemsProcessed.push(`${quantityToAdd} fishing rod(s)`);
      }
    }

    // Save user with updated inventory
    await user.save();

    const message = `Purchase verified! Added: ${itemsProcessed.join(", ")}`;
    console.log(`Purchase verified for ${address}: ${message}`);

    res.json({ 
      success: true, 
      message,
      itemsAdded: totalItemsAdded,
      newBait: user.bait,
      newFishingRods: user.fishingRods
    });
    
  } catch (error) {
    console.error("Error verifying purchase:", error);
    res.status(500).json({ error: "Internal server error during verification" });
  }
};

// Sell items endpoint
const sellItems = async (req, res) => {
  const { address, itemId, quantity, frenzyBalance } = req.body; // TODO: Change itemId to id when frontend is updated

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  const user = await User.findOne({ address });
  const inventory = await Inventory.findOne({ address });

  if (!user || !inventory) {
    return res.status(404).json({ error: "Player not found" });
  }

  const itemIndex = inventory.items.findIndex((i) => i.item.id === itemId); // Changed from itemId to id

  if (itemIndex === -1 || inventory.items[itemIndex].quantity < quantity) {
    return res.json({ success: false, message: "Not enough items" });
  }

  const itemToSell = inventory.items[itemIndex].item;
  const totalValue = itemToSell.value * quantity;

  inventory.items[itemIndex].quantity -= quantity;
  if (inventory.items[itemIndex].quantity <= 0) {
    inventory.items.splice(itemIndex, 1);
  }

  const txResult = await web3Service.sendFrenzyTokens(address, totalValue);

  if (!txResult.success) {
    return res
      .status(500)
      .json({ error: "Failed to send Frenzy tokens", details: txResult.error });
  }

  await inventory.save();

  res.json({
    success: true,
    frenzyGained: totalValue,
    newBalance: frenzyBalance + totalValue,
    txHash: txResult.txHash,
  });
};

module.exports = {
  initializePlayerInventory,
  getInventory,
  getPlayer,
  registerPlayer,
  fishingCatch,
  getPurchaseDetails,
  buyItems,
  verifyPurchase,
  sellItems,
};
