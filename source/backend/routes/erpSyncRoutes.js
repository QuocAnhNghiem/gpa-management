const express = require('express');
const router = express.Router();
const { protectWebOrExtension } = require('../middlewares/authMiddleware');
const {
  previewUsthErpSync,
  syncUsthErp,
  getUsthErpHistory,
} = require('../controllers/erpSyncController');

router.use(protectWebOrExtension);

router.post('/usth-erp/preview', previewUsthErpSync);
router.post('/usth-erp/sync', syncUsthErp);
router.get('/usth-erp/history', getUsthErpHistory);

module.exports = router;
