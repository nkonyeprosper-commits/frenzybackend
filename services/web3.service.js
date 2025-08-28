const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.getDefaultProvider(process.env.ALCHEMY_URL); // Assuming you'll add ALCHEMY_URL to your .env

const adminWallet = new ethers.Wallet(
  process.env.BACKEND_WALLET_PRIVATE_KEY,
  provider
);

//main 0x9BDB113c9dbE5114440D420AE94721EbD3732372
// test 0xD9930690cCADec5efAd5b685093c0B88eb43def9
const frenzyTokenAddress = "0xD9930690cCADec5efAd5b685093c0B88eb43def9"; // From frontend
const frenzyTokenAbi = [
  "function transfer(address to, uint amount)",
  "function balanceOf(address owner) view returns (uint)",
];

const frenzyContract = new ethers.Contract(
  frenzyTokenAddress,
  frenzyTokenAbi,
  adminWallet
);

const sendFrenzyTokens = async (toAddress, amount) => {
  try {
    // Updated to ethers.js v6 syntax
    const amountInWei = ethers.parseUnits(amount.toString(), 18); // Assuming 18 decimals
    const tx = await frenzyContract.transfer(toAddress, amountInWei);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Transaction confirmed: ${tx.hash}`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error("Error sending Frenzy tokens:", error);
    return { success: false, error: error.message };
  }
};

const getFrenzyBalance = async (address) => {
  try {
    const balance = await frenzyContract.balanceOf(address);
    // Convert from Wei to standard units (assuming 18 decimals)
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error("Error getting Frenzy balance:", error);
    return "0";
  }
};

const verifyPurchase = async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      throw new Error("Transaction not found");
    }
    // Further verification can be added here, e.g., checking recipient, amount, etc.
    await tx.wait();
    return { success: true, transaction: tx };
  } catch (error) {
    console.error("Error verifying purchase:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendFrenzyTokens,
  getFrenzyBalance,
  verifyPurchase,
  adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
};
