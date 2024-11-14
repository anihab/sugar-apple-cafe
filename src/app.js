// app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// store users' data and active rooms globally
let users = {};
let rooms = {};

// serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // listen for the 'join' event when a user joins the chatroom
  socket.on("join", (data) => {
    const { name, icon, position, roomId } = data;

    // if no roomId, generate a new one
    let room = roomId || `${uuidv4()}`; // unique room ID
    if (!rooms[room]) {
      rooms[room] = {};
      console.log("Room created:", room);
    }

    // store user data (icon and position) in the room
    rooms[room][socket.id] = { id: socket.id, name, icon, position };
    users[socket.id] = { room, name };

    console.log("User joined room:", room);
    socket.join(room);

    // emit the current room's ID and user list to the newly joined user
    // send existing users' positions and icons immediately upon joining
    socket.emit("joined room", { roomId: room, users: rooms[room] });

    // broadcast to room that a new user joined
    socket.to(room).emit("user joined", rooms[room][socket.id]);

    // broadcast when the user moves within the room
    socket.on("user moved", (position) => {
      const room = users[socket.id]?.room;
      if (room) {
        rooms[room][socket.id].position = position;
        socket.to(room).emit("user moved", { id: socket.id, position });
      }
    });

    // broadcast chat messages to the room
    socket.on("chat message", (msg) => {
      const room = users[socket.id]?.room;
      if (room) {
        io.to(room).emit("chat message", msg);
      };
    });

    // handle disconnection and notify other clients in the room
    socket.on("disconnect", () => {
      const user = users[socket.id];
      if (user) {
        const room = user.room;
        console.log("User disconnected:", socket.id);
        delete rooms[room][socket.id];
        delete users[socket.id];
        io.to(room).emit("user disconnected", socket.id);

        // delete room if empty
        if (Object.keys(rooms[room]).length == 0) {
          console.log("Room deleted:", room);
          delete rooms[room];
        }
      }
    });
  });
});

// start the server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";  // allows external access for hosting

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

// handle errors for server startup issues
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error("Server encountered an error:", err);
  }
});

// handle shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });
});