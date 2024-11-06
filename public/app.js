// app.js
const canvas = document.getElementById("pixel-editor");
const ctx = canvas.getContext("2d");
const chatInput = document.getElementById("chat-input");
const chatroom = document.getElementById("chatroom");

const pixelSize = 16;  // each 'pixel' will be 16x16 in the grid
const gridSize = 8;    // 8x8 grid for pixel icon
let color = "#000";
let userPosition = { x: 50, y: 50 };
let userElement;
let otherUsers = {};

// initialize blank canvas
ctx.fillStyle = "#fff";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// setup color picker and icon canvas (click to draw)
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

// create the user's icon with speech bubble
function createUserIcon() {
  if (!userElement) {
    userElement = document.createElement("div");
    userElement.classList.add("user");
    chatroom.appendChild(userElement);

    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 128;
    iconCanvas.height = 128;
    userElement.appendChild(iconCanvas);

    const speechBubble = document.createElement("div");
    speechBubble.classList.add("speech-bubble");
    userElement.appendChild(speechBubble);
  }

  userElement.style.left = `${userPosition.x}px`;
  userElement.style.top = `${userPosition.y}px`;

  const iconCtx = userElement.querySelector("canvas").getContext("2d");
  const pixelData = getPixelData();
  pixelData.forEach((row, y) => {
    row.forEach((color, x) => {
      iconCtx.fillStyle = color;
      iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });
}
  
createUserIcon();

// update the user's position
function updateUserPosition() {
    userElement.style.left = `${userPosition.x}px`;
    userElement.style.top = `${userPosition.y}px`;
}

// display speech bubble with message
function displaySpeechBubble(element, message) {
  const speechBubble = element.querySelector(".speech-bubble");
  speechBubble.textContent = message;
  speechBubble.style.visibility = "visible";
  setTimeout(() => {
    speechBubble.style.visibility = "hidden";
  }, 3000); // 3 seconds
}

// the user can move their icon around the chatroom
// arrow key movement for
document.addEventListener("keydown", (event) => {
    const step = 10;
    switch (event.key) {
      case "ArrowUp":
        userPosition.y = Math.max(0, userPosition.y - step);
        break;
      case "ArrowDown":
        userPosition.y = Math.min(chatroom.offsetHeight - 128, userPosition.y + step);
        break;
      case "ArrowLeft":
        userPosition.x = Math.max(0, userPosition.x - step);
        break;
      case "ArrowRight":
        userPosition.x = Math.min(chatroom.offsetWidth - 128, userPosition.x + step);
        break;
    }
    updateUserPosition();
});

// sending and receiving chat messages
chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && chatInput.value.trim() !== "") {
      const message = {
        text: chatInput.value,
        icon: getPixelData(),  // include pixel icon data in message
        position: userPosition,
        id: socket.id, // unique user ID
      };
      socket.emit("chat message", message);
      displaySpeechBubble(userElement, message.text);  // show bubble for sender
      chatInput.value = "";  // clear input
    }
});

// display messages and icons for other users
socket.on("chat message", (msg) => {
    // if message is from a different user
    if (msg.id !== socket.id) {
      // update or create icon for other user
      let otherUserElement = otherUsers[msg.id];
      if (!otherUserElement) {
        otherUserElement = document.createElement("div");
        otherUserElement.classList.add("user");
        
        const iconCanvas = document.createElement("canvas");
        speechBubble.classList.add("speech-bubble");
        otherUserElement.appendChild(speechBubble);

        const speechBubble = document.createElement("div");
        speechBubble.classList.add("speech-bubble");
        otherUserElement.appendChild(speechBubble);

        chatroom.appendChild(otherUserElement);
        otherUsers[msg.id] = otherUserElement;
      }

      // update position, icon, and message
      otherUserElement.style.left = `${msg.position.x}px`;
      otherUserElement.style.top = `${msg.position.y}px`;

      const iconCtx = otherUserElement.querySelector("canvas").getContext("2d");
      msg.icon.forEach((row, y) => {
        row.forEach((color, x) => {
          iconCtx.fillStyle = color;
          iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        });
      });

      displaySpeechBubble(otherUserElement, msg.text);
    }
  });


// // sending and receiving messages
// chatInput.addEventListener("keydown", (event) => {
//   if (event.key === "Enter" && chatInput.value.trim() !== "") {
//     const message = {
//       text: chatInput.value,
//       icon: getPixelData(),  // send pixel icon data with each message
//     };
//     socket.emit("chat message", message);
//     chatInput.value = "";  // clear input after sending
//   }
// });

// // receive messages and display them
// socket.on("chat message", (msg) => {
//   const messageElement = document.createElement("div");
//   messageElement.classList.add("message");

//   // display pixel icon next to the message
//   const iconCanvas = document.createElement("canvas");
//   iconCanvas.width = pixelSize * gridSize;
//   iconCanvas.height = pixelSize * gridSize;
//   const iconCtx = iconCanvas.getContext("2d");

//   // render the icon based on received data
//   msg.icon.forEach((row, y) => {
//     row.forEach((pixel, x) => {
//       iconCtx.fillStyle = pixel === 1 ? "#000" : "#FFF";
//       iconCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
//     });
//   });

//   messageElement.appendChild(iconCanvas);

//   // add the text of the message
//   const textElement = document.createElement("p");
//   textElement.textContent = msg.text;
//   messageElement.appendChild(textElement);

//   messagesContainer.appendChild(messageElement);
//   messagesContainer.scrollTop = messagesContainer.scrollHeight; // scroll to bottom
// });