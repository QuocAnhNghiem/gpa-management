const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  updateVocabularyStatus,
  getFlashcards
} = require('../controllers/vocabularyController');

router.use(protect);

router.route('/flashcards').get(getFlashcards);

router.route('/')
  .get(getVocabularies)
  .post(createVocabulary);

router.route('/:id')
  .put(updateVocabulary)
  .delete(deleteVocabulary);

router.route('/:id/status')
  .patch(updateVocabularyStatus);

module.exports = router;
