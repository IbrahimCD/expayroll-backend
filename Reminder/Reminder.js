// models/Reminder.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  action: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String }
});

const CommentSchema = new Schema({
  comment: { type: String, required: true },
  commentedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now }
});

/**
 * autoType can be one of:
 * - 'MANUAL' (the default for user-created reminders)
 * - 'AUTO_18_BDAY'
 * - 'AUTO_21_BDAY'
 * - 'AUTO_14DAY_COMMENCE'
 * - 'AUTO_84DAY_COMMENCE'
 * 
 * This helps us identify which milestone the reminder corresponds to.
 */
const ReminderSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    note: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue', 'Escalated'],
      default: 'Pending'
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isRecurring: { type: Boolean, default: false },
    recurrenceInterval: { type: String, enum: ['daily', 'weekly', 'monthly'], default: null },
    attachments: [String], // array of file URLs
    comments: [CommentSchema],
    auditLogs: [AuditLogSchema],

    // NEW FIELD: This marks whether the reminder was automatically generated for a certain milestone
    autoType: {
      type: String,
      enum: [
        'MANUAL',
        'AUTO_18_BDAY',
        'AUTO_21_BDAY',
        'AUTO_14DAY_COMMENCE',
        'AUTO_84DAY_COMMENCE'
      ],
      default: 'MANUAL'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reminder', ReminderSchema);
