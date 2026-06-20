const express = require('express');
const router = express.Router();
const { getAttendances, updateConfig, toggleAttendance, deleteAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAttendances);

router.route('/config')
  .put(updateConfig);

router.route('/toggle')
  .post(toggleAttendance);

router.route('/:id')
  .delete(deleteAttendance);

module.exports = router;
