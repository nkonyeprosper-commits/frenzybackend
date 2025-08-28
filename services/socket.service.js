const socketIo = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const { isValidAddress, isValidUsername, sanitizeMessage } = require("../utils/validators");
const { checkRateLimit } = require("../utils/rateLimiter");
const User = require("../models/user.model");
const {initializePlayerInventory} = require("../controllers/game.controller");

let messages = [];
const MAX_MESSAGES_HISTORY = 1000;

const connectedUsers = new Map(); // address -> user info
const userSockets = new Map(); // socketId -> user address

const addMessage = (address, username, message, replyTo = null) => {
    const newMessage = {
      id: uuidv4(),
      address,
      username,
      message: sanitizeMessage(message),
      timestamp: Date.now(),
      replyTo: replyTo
        ? {
            id: replyTo.id,
            username: replyTo.username,
            message: sanitizeMessage(replyTo.message),
          }
        : null,
    };
  
    messages.push(newMessage);
  
    // Trim messages if over limit
    if (messages.length > MAX_MESSAGES_HISTORY) {
      messages = messages.slice(-MAX_MESSAGES_HISTORY);
    }
  
    return newMessage;
  };

const getOnlineUsers = () => {
    return Array.from(connectedUsers.values());
};

const initSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: [
                "https://basedfrenzy.com",
                "https://play.basedfrenzy.com",
                "https://gameverse.basedfrenzy.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
  
    let userAddress = null;
    let username = null;
  
    // Handle authentication
    socket.on("authenticate", async (auth) => {
      try {
        const { address, username: providedUsername } = auth;
  
        if (!isValidAddress(address)) {
          return socket.emit("error", { message: "Invalid wallet address" });
        }
  
        if (!isValidUsername(providedUsername)) {
          return socket.emit("error", {
            message:
              "Invalid username. Must be 3-20 characters, alphanumeric only.",
          });
        }
        
        // Check if address is already connected in this session
        if (connectedUsers.has(address)) {
          return socket.emit("error", {
            message: "Address already connected from another session",
          });
        }
  
        userAddress = address;
        username = providedUsername.trim();
  
        // Find or create user in DB
        let user = await User.findOneAndUpdate(
          { address: userAddress },
          { username: username, lastLogin: Date.now() },
          { upsert: true, new: true }
        );
        await initializePlayerInventory(userAddress);
  
  
        // Store user info for online status
        const onlineUser = {
          address: userAddress,
          username: username,
          isOnline: true,
          joinedAt: Date.now(),
        };
  
        connectedUsers.set(userAddress, onlineUser);
        userSockets.set(socket.id, userAddress);
  
        socket.emit("chatHistory", messages.slice(-50));
        socket.emit("onlineUsers", getOnlineUsers());
        socket.broadcast.emit("userJoined", onlineUser);
  
        console.log(`User authenticated: ${username} (${userAddress})`);
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("error", { message: "Authentication failed" });
      }
    });
  
    // Handle new messages
    socket.on("sendMessage", (data) => {
      try {
        if (!userAddress || !username) {
          return socket.emit("error", { message: "Not authenticated" });
        }
  
        const { message, replyTo } = data;
  
        if (!message || typeof message !== "string" || !message.trim()) {
          return socket.emit("error", { message: "Invalid message" });
        }
  
        if (!checkRateLimit(userAddress)) {
          return socket.emit("error", {
            message: "Rate limit exceeded. Please slow down.",
          });
        }
  
        let validatedReplyTo = null;
        if (replyTo && replyTo.id && replyTo.username && replyTo.message) {
          validatedReplyTo = {
            id: replyTo.id,
            username: replyTo.username,
            message: replyTo.message,
          };
        }
  
        const newMessage = addMessage(userAddress, username, message, validatedReplyTo);
        io.emit("message", newMessage);
  
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });
  
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      if (userAddress) {
        connectedUsers.delete(userAddress);
        userSockets.delete(socket.id);
        socket.broadcast.emit("userLeft", userAddress);
        console.log(`User disconnected: ${username} (${userAddress})`);
      }
    });
  
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
};

module.exports = initSocket;
