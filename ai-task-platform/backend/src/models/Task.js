// === FILE: backend/src/models/Task.js ===
const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['INFO', 'ERROR', 'WARN', 'DEBUG'], default: 'INFO' },
  message: { type: String, required: true }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  input: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    enum: ['uppercase', 'lowercase', 'reverse', 'word_count'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending'
  },
  result: {
    type: mongoose.Schema.Types.Mixed, // Can be string or JSON (for word_count)
    default: null
  },
  logs: [logEntrySchema],
  workerPid: {
    type: String, // String to handle various worker identifiers natively
    default: null
  }
}, { timestamps: true });

// Compound indexes strictly derived from Architecture requirements
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
