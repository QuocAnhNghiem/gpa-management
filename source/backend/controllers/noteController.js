const Note = require('../models/Note');
const ALLOWED_NOTE_FIELDS = ['title', 'content', 'colorId', 'fontFamily', 'tags', 'isPinned'];

function pickAllowedNoteFields(payload = {}) {
  const next = {};
  ALLOWED_NOTE_FIELDS.forEach((key) => {
    if (payload[key] !== undefined) next[key] = payload[key];
  });
  return next;
}

exports.getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ isPinned: -1, updatedAt: -1 });
    res.status(200).json({ success: true, count: notes.length, data: notes });
  } catch (error) { next(error); }
};

exports.createNote = async (req, res, next) => {
  try {
    const note = await Note.create({ ...pickAllowedNoteFields(req.body), userId: req.user.id });
    res.status(201).json({ success: true, data: note });
  } catch (error) { next(error); }
};

exports.updateNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      pickAllowedNoteFields(req.body),
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ success: false, message: 'Không tìm thấy ghi chú' });
    res.status(200).json({ success: true, data: note });
  } catch (error) { next(error); }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ success: false, message: 'Không tìm thấy ghi chú' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};
