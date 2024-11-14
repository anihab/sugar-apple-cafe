// chat.js
// import default icons
import bearIcon from '../assets/icons/bear.js';
import rabbitIcon from '../assets/icons/rabbit.js';
import catIcon from '../assets/icons/cat.js';

const pixelSize = 16;  // each pixel will be 16x16 in the grid
const gridSize = 8;    // 8x8 grid for icon
const step = 10;       // step for arrow movement
const iconWidth = 128;
const iconHeight = 128;

// DOM elements
const welcomePage = document.getElementById("welcome-page");
const chatPage = document.getElementById("chat-page");

const canvas = document.getElementById("pixel-editor");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("color-picker");

const nameInput = document.getElementById("name-input");
const chatInput = document.getElementById("chat-input");

const chatroom = document.getElementById("chatroom");
const historyMessages = document.getElementById("history-messages");

const joinButton = document.getElementById("join-button");
const inviteButton = document.getElementById("invite-button");

let color = "#000";
let userName = "";
let joinedChat = false;
let userPosition;
let otherUsers = {};
let inviteLink = "";

// initialize blank canvas
ctx.fillStyle = "#fff";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// canvas event handlers
colorPicker.addEventListener("input", (event) => {
  color = event.target.value;
});

canvas.addEventListener("click", (event) => {
  const x = Math.floor(event.offsetX / pixelSize) * pixelSize;
  const y = Math.floor(event.offsetY / pixelSize) * pixelSize;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, pixelSize, pixelSize);
});

// icon rendering
const icons = { bear: bearIcon, rabbit: rabbitIcon, cat: catIcon };

function renderIcon(canvasId, pixelData) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pixelData.forEach((row, y) => {
    row.forEach((color, x) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  Object.keys(icons).forEach(iconKey => renderIcon(`${iconKey}-icon`, icons[iconKey]));
});

// icon selection event listeners
document.getElementById("bear-icon").addEventListener("click", () => {
  renderIcon("pixel-editor", bearIcon); // draw the given icon on the canvas
});

document.getElementById("rabbit-icon").addEventListener("click", () => {
  renderIcon("pixel-editor", rabbitIcon);
});

document.getElementById("cat-icon").addEventListener("click", () => {
  renderIcon("pixel-editor", catIcon)
});

// get pixel data from canvas
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
function createOrUpdateUserIcon(id, name, position, pixelData, message) {
  let userElement = otherUsers[id];

  if (!userElement) {
    userElement = document.createElement("div");
    userElement.classList.add("user");
    userElement.innerHTML = `
      <canvas width="128" height="128"></canvas>
      <div class="username">${name || ""}</div>
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

// add message to chat history
function addToChatHistory(name, message, isLocalUser = true) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-message", isLocalUser ? "local-message" : "remote-message"); // style the local user's messages differently
  messageElement.textContent = `${name}: ${message}`;
  historyMessages.appendChild(messageElement);
  historyMessages.scrollTop = historyMessages.scrollHeight; // scroll to latest message
}

// join button event handler
joinButton.addEventListener("click", () => {
  if (joinedChat) return;  // prevent re-joining if already joined

  userName = nameInput.value.trim();
  if (!userName) {
    alert("Please enter a name before joining the chat.");
    return;
  }

  joinedChat = true;
  welcomePage.style.display = "none";
  chatPage.style.display = "flex";

  // set init position to center of chatroom
  userPosition = {
    x: (chatroom.getBoundingClientRect().width - iconWidth) / 2,
    y: (chatroom.getBoundingClientRect().height - iconHeight) / 2,
  };

  const roomId = new URLSearchParams(window.location.search).get("room") || null;
  socket.emit("join", { name: userName, icon: getPixelData(), position: userPosition, roomId });
  createOrUpdateUserIcon(socket.id, userName, userPosition, getPixelData());
});

// invite button event handler
inviteButton.addEventListener("click", () => {
  // copy the link to clipboard
  navigator.clipboard.writeText(inviteLink).then(() => {
    alert("Invite link copied to clipboard!");
  }).catch((error) => console.error("Failed to copy: ", error));
});

// arrow keys for user movement
document.addEventListener("keydown", (event) => {
  // retrieve the actual width and height of the chatroom
  const chatroomWidth = chatroom.offsetWidth;
  const chatroomHeight = chatroom.offsetHeight;
  
  let moved = false;
  switch (event.key) {
    case "ArrowUp":
      if (userPosition.y - step >= 0) {
        userPosition.y -= step;
        moved = true;
      }
      break;
    case "ArrowDown":
      if (userPosition.y + step + iconHeight <= chatroomHeight) {
        userPosition.y += step;
        moved = true;
      }
      break;
    case "ArrowLeft":
      if (userPosition.x - step >= 0) {
        userPosition.x -= step;
        moved = true;
      }
      break;
    case "ArrowRight":
      if (userPosition.x + step + iconWidth <= chatroomWidth) {
        userPosition.x += step;
        moved = true;
      }
      break;
  }
  
  if (moved) {
    createOrUpdateUserIcon(socket.id, userName, userPosition, getPixelData());
    socket.emit("user moved", userPosition);
  }
});

// sending chat messages
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && chatInput.value.trim() !== "") {
    const message = {
      text: chatInput.value,
      name: userName,
      icon: getPixelData(),
      position: userPosition,
      id: socket.id, // unique user ID
    };

    socket.emit("chat message", message);
    createOrUpdateUserIcon(socket.id, userName, userPosition, getPixelData(), message.text);
    addToChatHistory(userName, message.text);
    chatInput.value = "";
  }
});

// recieving chat messages
socket.on("chat message", (msg) => {
  if (msg.id !== socket.id) {
    createOrUpdateUserIcon(msg.id, msg.name, msg.position, msg.icon, msg.text);
    addToChatHistory(msg.name, msg.text, false);
  }
});

// detecting user movement
socket.on("user moved", (data) => {
  if (data.id !== socket.id) {
    createOrUpdateUserIcon(data.id, data.name, data.position);
  }
});

// handle newly joining a room
socket.on("joined room", ({ roomId, users }) => {
  // update the chatroom with existing users
  Object.values(users).forEach(user => {
    createOrUpdateUserIcon(user.id, user.name, user.position, user.icon);
  });

  // update the browser URL and inviteLink to match the current room
  inviteLink = `${window.location.origin}/?room=${roomId}`;
  window.history.pushState({}, "", `/?room=${roomId}`);
});

// handle disconnection
socket.on("user disconnected", (userId) => {
  let userElement = otherUsers[userId];
  // remove disconnected user's icon from the chatroom
  if (userElement) {
    userElement.remove(); 
    delete otherUsers[userId];
  }
});