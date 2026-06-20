const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Ghi chú mới', trim: true },
  content: { type: String, default: '' },
  colorId: { type: String, enum: ['yellow', 'pink', 'green', 'blue'], default: 'yellow' },
  fontFamily: { type: String, default: 'Outfit' },
  tags: [{ type: String, trim: true }],
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
