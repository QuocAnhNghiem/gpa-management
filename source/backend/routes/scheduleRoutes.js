const express = require('express');
const router = express.Router();
const { getSchedules, createSchedule, updateSchedule, deleteSchedule } = require('../controllers/scheduleController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.route('/').get(getSchedules).post(createSchedule);
router.route('/:id').put(updateSchedule).delete(deleteSchedule);

module.exports = router;
