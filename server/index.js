const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoute = require("./Routes/userRoute");
const chatRoute = require("./Routes/chatRoute");
const messageRoute = require("./Routes/messageRoute");
const path = require("path");

const app = express();
require("dotenv").config();

app.use(express.json());
app.use(cors());
app.use("/api/users", userRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);

// -------------------- Deployment --------------------
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname1, "client", "dist", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Welcome to our chat app APIs");
  });
}
// -------------------- Deployment --------------------

const port = process.env.PORT || 5001;
const uri = process.env.ATLAS_URI;

// app.listen(port, (req, res) => {
//   console.log(`Server running on port: ${port}`);
// });

// -------------------- Socket --------------------
// const { Server } = require("socket.io");
// const https = require("https");
// const server = https.createServer(app);
// const io = new Server(server);

// const io = new Server({
//   cors: "https://chatapp.taiyeen.com:3000/",
// });

const server = app.listen(
  port,
  console.log(`Server running on PORT ${port}...`),
);

const io = require("socket.io")(server, {
  // pingTimeout: 60000,
  cors: {
    origin: "https://chatapp.taiyeen.com/",
    // credentials: true,
  },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("new connection", socket.id);

  // listen to new user event
  socket.on("addNewUser", (userId) => {
    !onlineUsers.some((user) => user.userId === userId) &&
      onlineUsers.push({ userId, socketId: socket.id });
    console.log("onlineusers", onlineUsers);
    io.emit("getOnlineUsers", onlineUsers);
  });

  // send message event
  socket.on("sendMessage", (message) => {
    const user = onlineUsers.find(
      (user) => user.userId === message.recipientId,
    );

    if (user) {
      io.to(user.socketId).emit("getMessage", message);
      io.to(user.socketId).emit("getNotification", {
        senderId: message.senderId,
        isRead: false,
        date: new Date(),
      });
    }
  });

  // send user's offline event
  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});

// server.listen(3000, () => {
//   console.log("listening on *:3000");
// });
// -------------------- Socket --------------------

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connection established"))
  .catch((error) => console.log("MongoDB connection failed: " + error.message));
