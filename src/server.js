// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// set up the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// store users' data globally
let users = {};

// serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // listen for the 'join' event when a user joins the chatroom
  socket.on("join", (data) => {
    console.log("User joined:", socket.id);

    // store user data (icon and position)
    users[socket.id] = {
      id: socket.id,
      icon: data.icon,
      position: data.position,
    };

    // emit the list of all users to the newly connected user
    // send existing users' positions and icons immediately upon joining
    socket.emit("join", users);  // sends to the newly joined user

    // broadcast the user's data to all other clients
    socket.broadcast.emit("join", users[socket.id]);

    // broadcast to all clients when the user moves
    socket.on("user moved", (position) => {
      users[socket.id].position = position;
      socket.broadcast.emit("user moved", { id: socket.id, position });
    });

    // listen for 'chat message' events
    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);
    });

    // handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      delete users[socket.id];
      io.emit("user disconnected", socket.id);
    });
  });
});

// start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});