// app.js
const canvas = document.getElementById("pixel-editor");
const ctx = canvas.getContext("2d");
const joinButton = document.getElementById("join-button");

const welcomePage = document.getElementById("welcome-page");
const chatPage = document.getElementById("chat-page");

const chatInput = document.getElementById("chat-input");
const chatroom = document.getElementById("chatroom");
const historyMessages = document.getElementById("history-messages");

const pixelSize = 16;  // each 'pixel' will be 16x16 in the grid
const gridSize = 8;    // 8x8 grid for pixel icon
let color = "#000";
let joinedChat = false;

let userPosition = { x: 50, y: 50 };
let userElement;
let otherUsers = {};

// initialize blank canvas
ctx.fillStyle = "#fff";
ctx.fillRect(0, 0, canvas.width, canvas.height);

document.getElementById("color-picker").addEventListener("input", (event) => {
  color = event.target.value;
});

canvas.addEventListener("click", (event) => {
  const x = Math.floor(event.offsetX / pixelSize) * pixelSize;
  const y = Math.floor(event.offsetY / pixelSize) * pixelSize;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, pixelSize, pixelSize);
});

// convert to and get shareable data
function getPixelData() {
  const pixelData = [];
  for (let y = 0; y < gridSize; y++) {
    const row = [];
    for (let x = 0; x < gridSize; x++) {
      const pixel = ctx.getImageData(x * pixelSize, y * pixelSize, 1, 1).data;
      const hexColor = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)}`;
      row.push(hexColor);
    }
    pixelData.push(row);
  }
  return pixelData;
}

// WebSocket connection using Socket.IO
const socket = io();

// create or update user's icon
function createOrUpdateUserIcon(id, position, pixelData, message) {
  let userElement = otherUsers[id];

  if (!userElement) {
    userElement = document.createElement("div");
    userElement.classList.add("user");
    userElement.innerHTML = `
      <canvas width="128" height="128"></canvas>
      <div class="speech-bubble"></div>
    `;
    chatroom.appendChild(userElement);
    otherUsers[id] = userElement;
  }

  // update the user's position
  userElement.style.left = `${position.x}px`;
  userElement.style.top = `${position.y}px`;

  if (pixelData) {
    const iconCtx = userElement.querySelector("canvas").getContext("2d");
    iconCtx.clearRect(0, 0, 128, 128);
    pixelData.forEach((row, y) => {
      row.forEach((color, x) => {
        iconCtx.fillStyle = color;
        iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      });
    });
  }

  // display speech bubble with message
  if (message) {
    const speechBubble = userElement.querySelector(".speech-bubble");
    speechBubble.textContent = message;
    speechBubble.style.visibility = "visible";
    setTimeout(() => (speechBubble.style.visibility = "hidden"), 3000); // 3 seconds
  }
}

// add message to the chat history box
function addToChatHistory(message, isLocalUser = true) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-message", isLocalUser ? "local-message" : "remote-message"); // style the local user's messages differently
  messageElement.textContent = message;
  historyMessages.appendChild(messageElement);
  historyMessages.scrollTop = historyMessages.scrollHeight; // scroll to latest message
}

// join button event handler
joinButton.addEventListener("click", () => {
  if (joinedChat) return;  // prevent re-joining if already joined

  joinedChat = true;
  welcomePage.style.display = "none";
  chatPage.style.display = "flex";

  socket.emit("join", { id: socket.id, icon: getPixelData(), position: userPosition });
  createOrUpdateUserIcon(socket.id, userPosition, getPixelData());
});

// arrow keys for user movement
document.addEventListener("keydown", (event) => {
  const step = 10;
  let moved = false;

  switch (event.key) {
    case "ArrowUp":
      userPosition.y = Math.max(0, userPosition.y - step);
      moved = true;
      break;
    case "ArrowDown":
      userPosition.y = Math.min(chatroom.offsetHeight - 128, userPosition.y + step);
      moved = true;
      break;
    case "ArrowLeft":
      userPosition.x = Math.max(0, userPosition.x - step);
      moved = true;
      break;
    case "ArrowRight":
      userPosition.x = Math.min(chatroom.offsetWidth - 128, userPosition.x + step);
      moved = true;
      break;
  }
  
  if (moved) {
    createOrUpdateUserIcon(socket.id, userPosition, getPixelData());
    socket.emit("user moved", userPosition);
  }
});

// sending chat messages
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && chatInput.value.trim() !== "") {
    const message = {
      text: chatInput.value,
      icon: getPixelData(),
      position: userPosition,
      id: socket.id, // unique user ID
    };

    socket.emit("chat message", message);
    createOrUpdateUserIcon(socket.id, userPosition, getPixelData(), message.text);
    addToChatHistory(`You: ${message.text}`);
    chatInput.value = "";
  }
});

// recieving chat messages
socket.on("chat message", (msg) => {
  if (msg.id !== socket.id) {
    createOrUpdateUserIcon(msg.id, msg.position, msg.icon, msg.text);
    addToChatHistory(`${msg.id}: ${msg.text}`, false);
  }
});

// detecting user movement
socket.on("user moved", (data) => {
  if (data.id !== socket.id) {
    createOrUpdateUserIcon(data.id, data.position);
  }
});

socket.on("join", (users) => {
  // iterate over the 'users' data object
  Object.values(users).forEach((user) => {
    let otherUserElement = otherUsers[user.id];
    if (!otherUserElement) {
      // create and append the user's element if it's not already on the screen
      otherUserElement = document.createElement("div");
      otherUserElement.classList.add("user");

      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = 128;
      iconCanvas.height = 128;
      otherUserElement.appendChild(iconCanvas);

      const speechBubble = document.createElement("div");
      speechBubble.classList.add("speech-bubble");
      otherUserElement.appendChild(speechBubble);

      chatroom.appendChild(otherUserElement);
      otherUsers[user.id] = otherUserElement;
    }

    otherUserElement.style.left = `${user.position.x}px`;
    otherUserElement.style.top = `${user.position.y}px`;

    const iconCtx = otherUserElement.querySelector("canvas").getContext("2d");
    iconCtx.clearRect(0, 0, 128, 128);
    user.icon.forEach((row, y) => {
      row.forEach((color, x) => {
        iconCtx.fillStyle = color;
        iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      });
    });
  });
});

socket.on("user disconnected", (userId) => {
  let userElement = otherUsers[userId];
  // remove disconnected user's icon from the chatroom
  if (userElement) {
    userElement.remove(); 
    delete otherUsers[userId];
  }
});