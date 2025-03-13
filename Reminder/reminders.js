// routes/reminders.js
const express = require('express');
const router = express.Router();
const Reminder = require('../Reminder/Reminder');
const Notification = require('../Reminder/Notification');
const { sendEmail } = require('../Reminder/email');
const { getUsersByOrganization } = require('../Reminder/user');
const { verifyToken } = require('../LoginSignup/auth.middleware');

// GET /reminders - list reminders for the user's organization
router.get('/', verifyToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    // Optionally add filtering/pagination here
    const reminders = await Reminder.find({ organizationId: orgId }).sort({ dueDate: 1 });
    res.json({ reminders });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reminders' });
  }
});

// GET /reminders/:id - get single reminder
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reminder' });
  }
});

// POST /reminders - create a new reminder
router.post('/', verifyToken, async (req, res) => {
  try {
    const { employeeId, employeeName, note, dueDate, status } = req.body;
    const orgId = req.user.organizationId;
    const reminder = new Reminder({
      employeeId,
      employeeName,
      note,
      dueDate,
      status: status || 'Pending',
      organizationId: orgId,
      createdBy: req.user._id
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
      sendEmail(user.email, 'New Reminder Created', `Reminder for ${employeeName}: ${note} (Due: ${new Date(dueDate).toLocaleDateString()})`);
    });

    res.status(201).json({ message: 'Reminder created successfully', reminder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating reminder' });
  }
});

// PUT /reminders/:id - update a reminder
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updateData = req.body;
    const reminder = await Reminder.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder updated successfully', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Error updating reminder' });
  }
});

// DELETE /reminders/:id - delete a reminder
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting reminder' });
  }
});

module.exports = router;
