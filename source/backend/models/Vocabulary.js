const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    word: {
      type: String,
      required: [true, 'Vui lòng nhập từ vựng'],
      trim: true,
    },
    phonetic: {
      type: String,
      trim: true,
      default: '',
    },
    partOfSpeech: {
      type: String,
      trim: true,
      default: '',
    },
    meaning: {
      type: String,
      required: [true, 'Vui lòng nhập nghĩa của từ'],
      trim: true,
    },
    synonyms: {
      type: String,
      trim: true,
      default: '',
    },
    antonyms: {
      type: String,
      trim: true,
      default: '',
    },
    example: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: 'General',
    },
    status: {
      type: String,
      enum: ['new', 'learning', 'mastered'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vocabulary', vocabularySchema);
