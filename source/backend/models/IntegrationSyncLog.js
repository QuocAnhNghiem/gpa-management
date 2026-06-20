const mongoose = require('mongoose');

const IntegrationSyncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, required: true, default: 'usth_erp' },
  status: { type: String, enum: ['previewed', 'synced', 'failed'], default: 'previewed' },
  summary: {
    subjects: {
      create: { type: Number, default: 0 },
      update: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      conflicts: { type: Number, default: 0 },
    },
    schedules: {
      create: { type: Number, default: 0 },
      update: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      conflicts: { type: Number, default: 0 },
    },
  },
  errorMessages: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('IntegrationSyncLog', IntegrationSyncLogSchema);
