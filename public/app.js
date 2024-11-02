// app.js
const canvas = document.getElementById("pixel-editor");
const ctx = canvas.getContext("2d");
const pixelSize = 16;
const gridSize = 16;
let color = "#000";

canvas.addEventListener("click", (e) => {
    const x = Math.floor(e.offsetX / pixelSize);
    const y = Math.floor(e.offsetY / pixelSize);
    ctx.fillStyle = color;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
});

// Toggle color
document.addEventListener("keydown", (e) => {
    if (e.key === " ") color = color === "#000" ? "#FFF" : "#000";
});

// app.js (frontend)
const socket = io();
const chatInput = document.getElementById("chat-input");

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const msg = chatInput.value;
        socket.emit("chat message", msg);
        chatInput.value = "";
    }
});

socket.on("chat message", (msg) => {
    const messageElement = document.createElement("p");
    messageElement.textContent = msg;
    document.body.appendChild(messageElement);
});
