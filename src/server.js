// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// set up the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // listen for 'chat message' events from clients
  socket.on("chat message", (msg) => {
    // Broadcast the message to all connected clients
    io.emit("chat message", msg);
  });

  // handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});