const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'created', 'updated', 'deleted'
  entity: { type: String, required: true }, // e.g., 'Timesheet', 'Employee', etc.
  entityId: { type: Schema.Types.ObjectId, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports =
  mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
