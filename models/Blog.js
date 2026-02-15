const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  read_count: { type: Number, default: 0 },
  reading_time: { type: Number, default: 0 }, // In minutes, calculated automatically
  tags: [{ type: String }],
  body: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// We calculate reading_time in the controller

module.exports = mongoose.model('Blog', blogSchema);