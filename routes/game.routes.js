const express = require("express");
const router = express.Router();
const gameController = require("../controllers/game.controller.js");

router.get("/player/:address", gameController.getPlayer);
router.post("/player/register", gameController.registerPlayer);
router.get("/inventory/:address", gameController.getInventory);
router.post("/fishing/catch", gameController.fishingCatch);
router.post("/shop/get-purchase-details", gameController.getPurchaseDetails);
router.post("/shop/buy-items", gameController.buyItems);
router.post("/shop/verify-purchase", gameController.verifyPurchase);
router.post("/shop/sell", gameController.sellItems);

module.exports = router;
