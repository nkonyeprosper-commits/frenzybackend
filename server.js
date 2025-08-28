require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");
const initSocket = require("./services/socket.service.js");
const gameRoutes = require("./routes/game.routes.js");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: [
      "https://basedfrenzy.com",
      "https://play.basedfrenzy.com",
      "https://gameverse.basedfrenzy.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Initialize Socket.IO
const io = initSocket(server);

// API Routes
app.use('/api', gameRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
    });
  });

const PORT = process.env.PORT || 3005;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});
