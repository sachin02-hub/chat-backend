const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema(
  {
    senderId: String,
    receiverId: String,
    message: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("Message", MessageSchema);