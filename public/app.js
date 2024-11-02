// app.js
// setup canvas
const canvas = document.getElementById("pixel-editor");
const ctx = canvas.getContext("2d");
const pixelSize = 16;  // each 'pixel' will be 16x16 in the grid
const gridSize = 8;    // 8x8 grid for pixel icon
let color = "#000";

// initialize blank canvas
ctx.fillStyle = "#FFF";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// toggle color btn
document.getElementById("toggle-color").addEventListener("click", () => {
    color = color === "#000" ? "#FFF" : "#000"; // just black and white (for now)
  });

// click on canvas to draw
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
        row.push(pixel[0] === 0 ? 1 : 0);  // 1 for black, 0 for white
      }
      pixelData.push(row);
    }
    return pixelData;
}

// WebSocket connection using Socket.IO
const socket = io();

// sending and receiving messages
const chatInput = document.getElementById("chat-input");
const messagesContainer = document.getElementById("messages");

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && chatInput.value.trim() !== "") {
    const message = {
      text: chatInput.value,
      icon: getPixelData(),  // send pixel icon data with each message
    };
    socket.emit("chat message", message);
    chatInput.value = "";  // clear input after sending
  }
});

// receive messages and display them
socket.on("chat message", (msg) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  // display pixel icon next to the message
  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = pixelSize * gridSize;
  iconCanvas.height = pixelSize * gridSize;
  const iconCtx = iconCanvas.getContext("2d");

  // render the icon based on received data
  msg.icon.forEach((row, y) => {
    row.forEach((pixel, x) => {
      iconCtx.fillStyle = pixel === 1 ? "#000" : "#FFF";
      iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });

  messageElement.appendChild(iconCanvas);

  // add the text of the message
  const textElement = document.createElement("p");
  textElement.textContent = msg.text;
  messageElement.appendChild(textElement);

  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // scroll to bottom
});
