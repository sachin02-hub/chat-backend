const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose.connect(process.env.MONGO_URI);
app.use(cors());
app.use(express.json());

const User = require("./models/User");
const Message = require("./models/Message");

let onlineUsers = new Map();

app.post("/users", async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });

  io.emit("newUserRegistered", { _id: user._id, name: user.name, email: user.email });
  res.json({ _id: user._id, name: user.name, email: user.email });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid password" });
  res.json({ _id: user._id, name: user.name, email: user.email });
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post("/messages", async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  await Message.create({ senderId, receiverId, message });
  res.json({ status: "Message sent" });
});

app.get("/messages", async (req, res) => {
  const { senderId, receiverId } = req.query;
  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId }
    ]
  }).sort({ createdAt: 1 });
  res.json(messages);
});

// Socket.IO
io.on("connection", (socket) => {
  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", {
        senderId,
        message,
      });
    }
  });
});

server.listen(4000, () => console.log("Backend running on port 4000"));