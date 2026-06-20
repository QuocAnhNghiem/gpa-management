const Vocabulary = require('../models/Vocabulary');
const ALLOWED_VOCAB_FIELDS = [
  'word',
  'phonetic',
  'partOfSpeech',
  'meaning',
  'synonyms',
  'antonyms',
  'example',
  'topic',
  'status',
];

function pickAllowedVocabularyFields(payload = {}) {
  const next = {};
  ALLOWED_VOCAB_FIELDS.forEach((key) => {
    if (payload[key] !== undefined) next[key] = payload[key];
  });
  return next;
}

// @desc    Lấy danh sách từ vựng của user (có filter)
// @route   GET /api/vocabulary
// @access  Private
exports.getVocabularies = async (req, res, next) => {
  try {
    const query = { userId: req.user.id };
    if (req.query.topic) query.topic = req.query.topic;
    if (req.query.status) query.status = req.query.status;

    const vocabularies = await Vocabulary.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: vocabularies.length, data: vocabularies });
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo từ vựng mới
// @route   POST /api/vocabulary
// @access  Private
exports.createVocabulary = async (req, res, next) => {
  try {
    const vocabulary = await Vocabulary.create({
      ...pickAllowedVocabularyFields(req.body),
      userId: req.user.id,
    });
    res.status(201).json({ success: true, data: vocabulary });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật từ vựng
// @route   PUT /api/vocabulary/:id
// @access  Private
exports.updateVocabulary = async (req, res, next) => {
  try {
    let vocabulary = await Vocabulary.findOne({ _id: req.params.id, userId: req.user.id });
    if (!vocabulary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' });
    }

    vocabulary = await Vocabulary.findOneAndUpdate({
      _id: req.params.id,
      userId: req.user.id,
    }, pickAllowedVocabularyFields(req.body), {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: vocabulary });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật trạng thái từ vựng (chuyển sang 'learning' hoặc 'mastered')
// @route   PATCH /api/vocabulary/:id/status
// @access  Private
exports.updateVocabularyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let vocabulary = await Vocabulary.findOne({ _id: req.params.id, userId: req.user.id });
    if (!vocabulary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' });
    }

    vocabulary.status = status;
    await vocabulary.save();

    res.status(200).json({ success: true, data: vocabulary });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa từ vựng
// @route   DELETE /api/vocabulary/:id
// @access  Private
exports.deleteVocabulary = async (req, res, next) => {
  try {
    const vocabulary = await Vocabulary.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!vocabulary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy 20 thẻ flashcard ngẫu nhiên để ôn tập
// @route   GET /api/vocabulary/flashcards
// @access  Private
exports.getFlashcards = async (req, res, next) => {
  try {
    const matchQuery = { userId: req.user._id };
    if (req.query.topic) matchQuery.topic = req.query.topic;

    // Ưu tiên các từ 'new' và 'learning'
    let flashcards = await Vocabulary.aggregate([
      { $match: { ...matchQuery, status: { $in: ['new', 'learning'] } } },
      { $sample: { size: 20 } }
    ]);

    // Nếu chưa đủ 20 từ, lấy thêm các từ 'mastered'
    if (flashcards.length < 20) {
      const remainingCount = 20 - flashcards.length;
      const excludeIds = flashcards.map(f => f._id);
      
      const masteredCards = await Vocabulary.aggregate([
        { $match: { ...matchQuery, status: 'mastered', _id: { $nin: excludeIds } } },
        { $sample: { size: remainingCount } }
      ]);
      
      flashcards = [...flashcards, ...masteredCards];
      
      // Shuffle lại mảng cuối cùng
      flashcards.sort(() => 0.5 - Math.random());
    }

    res.status(200).json({ success: true, data: flashcards });
  } catch (error) {
    next(error);
  }
};
