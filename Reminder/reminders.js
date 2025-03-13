const express = require('express');
const router = express.Router();
const Reminder = require('../Reminder/Reminder');
const Notification = require('../Reminder/Notification');
const { sendEmail } = require('../Reminder/email');
const { getUsersByOrganization } = require('../Reminder/user');
const { protect } = require('../LoginSignup/auth.middleware');

// GET /reminders - list reminders for the user's organization
router.get('/', protect, async (req, res) => {
  try {
    // Use req.user.orgId (set by your token middleware)
    const orgId = req.user.orgId;
    // Optionally add filtering/pagination here
    const reminders = await Reminder.find({ organizationId: orgId }).sort({ dueDate: 1 });
    res.json({ reminders });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reminders' });
  }
});

// GET /reminders/:id - get single reminder
router.get('/:id', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reminder' });
  }
});

// POST /reminders - create a new reminder
router.post('/', protect, async (req, res) => {
  try {
    const { employeeId, employeeName, note, dueDate, status, isRecurring, recurrenceInterval, attachments } = req.body;
    const orgId = req.user.orgId;
    const reminder = new Reminder({
      employeeId,
      employeeName,
      note,
      dueDate,
      status: status || 'Pending',
      organizationId: orgId,
      createdBy: req.user.userId,
      isRecurring: isRecurring || false,
      recurrenceInterval: recurrenceInterval || null,
      attachments: attachments || []
    });

    // Add audit log entry for creation
    reminder.auditLogs.push({
      action: 'Created',
      performedBy: req.user._id,
      details: 'Reminder created'
    });

    await reminder.save();

    // Send notifications to all users in this organization
    const users = await getUsersByOrganization(orgId);
    users.forEach(user => {
      const notif = new Notification({
        userId: user._id,
        message: `Reminder: ${employeeName} - ${note} (Due: ${new Date(dueDate).toLocaleDateString()}) - Status: Pending`
      });
      notif.save();
      // Also send email notifications:
      sendEmail(
        user.email,
        'New Reminder Created',
        `Reminder for ${employeeName}: ${note} (Due: ${new Date(dueDate).toLocaleDateString()})`
      );
    });

    res.status(201).json({ message: 'Reminder created successfully', reminder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating reminder' });
  }
});

// PUT /reminders/:id - update a reminder
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = req.body;
    // Append audit log entry for update
    updateData.$push = {
      auditLogs: {
        action: 'Updated',
        performedBy: req.user._id,
        details: 'Reminder updated'
      }
    };
    const reminder = await Reminder.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    // If reminder is recurring and status changed to Completed, create the next occurrence
    if (updateData.status === 'Completed' && reminder.isRecurring) {
      let newDueDate = new Date(reminder.dueDate);
      if (reminder.recurrenceInterval === 'daily') {
        newDueDate.setDate(newDueDate.getDate() + 1);
      } else if (reminder.recurrenceInterval === 'weekly') {
        newDueDate.setDate(newDueDate.getDate() + 7);
      } else if (reminder.recurrenceInterval === 'monthly') {
        newDueDate.setMonth(newDueDate.getMonth() + 1);
      }
      const newReminder = new Reminder({
        employeeId: reminder.employeeId,
        employeeName: reminder.employeeName,
        note: reminder.note,
        dueDate: newDueDate,
        status: 'Pending',
        organizationId: reminder.organizationId,
        createdBy: req.user.userId,
        isRecurring: reminder.isRecurring,
        recurrenceInterval: reminder.recurrenceInterval,
        attachments: reminder.attachments,
        auditLogs: [
          {
            action: 'Auto-Generated',
            performedBy: req.user._id,
            details: 'Recurring reminder auto-generated after completion'
          }
        ]
      });
      await newReminder.save();
    }

    res.json({ message: 'Reminder updated successfully', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error updating reminder' });
  }
});

// POST /reminders/:id/comments - add a comment to a reminder
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { comment } = req.body;
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    reminder.comments.push({
      comment,
      commentedBy: req.user._id
    });
    // Add audit log entry for comment
    reminder.auditLogs.push({
      action: 'Comment Added',
      performedBy: req.user._id,
      details: comment
    });
    await reminder.save();
    res.status(201).json({ message: 'Comment added successfully', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// PUT /reminders/:id/escalate - escalate a reminder
router.put('/:id/escalate', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    reminder.status = 'Escalated';
    reminder.auditLogs.push({
      action: 'Escalated',
      performedBy: req.user._id,
      details: 'Reminder escalated due to overdue'
    });
    await reminder.save();
    res.json({ message: 'Reminder escalated successfully', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error escalating reminder' });
  }
});

// DELETE /reminders/:id - delete a reminder
router.delete('/:id', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting reminder' });
  }
});

module.exports = router;
