// cronJobs/autoReminders.js

const cron = require('node-cron');
const dayjs = require('dayjs'); // or use native Date
const Employee = require('../Employee/employee.model'); // Update path if needed
const Reminder = require('../Reminder/Reminder');       // The newly updated reminder model

// This function checks if a milestone reminder was already created for that employee
async function milestoneReminderExists(employeeId, autoType) {
  const existing = await Reminder.findOne({
    employeeId,
    autoType
    // optionally, if you only want one *ever*, you can do nothing else
    // or if you want to limit to e.g. "created in the last day," you'd
    // do a date comparison. Usually once is enough.
  });
  return !!existing;
}

function calculateAge(dob, today = new Date()) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate)) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  const d = today.getDate() - birthDate.getDate();
  // If today's month-day is before the birth month-day, subtract 1
  if (m < 0 || (m === 0 && d < 0)) {
    age--;
  }
  return age;
}

function daysBetween(date1, date2) {
  const d1 = dayjs(date1).startOf('day');
  const d2 = dayjs(date2).startOf('day');
  return d2.diff(d1, 'day');
}

// The main daily function:
async function runDailyAutoReminders() {
  try {
    console.log('[AutoReminders] Starting daily check...');
    // 1) fetch all employees
    const employees = await Employee.find({}); // optionally filter by org if multi-tenant

    const today = new Date();
    for (const emp of employees) {
      // Typically you have "organizationId" on employee?
      // We'll assume we have it. If not, you'll need to set some default or skip.
      const orgId = emp.organizationId || /* your logic */ null;

      // --------------------
      // 1) Check for birthdays
      // Is it the employee's birthday *today*?
      if (emp.dateOfBirth) {
        const birth = new Date(emp.dateOfBirth);
        if (
          birth.getMonth() === today.getMonth() &&
          birth.getDate() === today.getDate()
        ) {
          // It's the actual birthdate day and month
          const ageNow = calculateAge(emp.dateOfBirth, today);

          // Check if turning 18
          if (ageNow === 18) {
            const already = await milestoneReminderExists(
              emp._id,
              'AUTO_18_BDAY'
            );
            if (!already) {
              await Reminder.create({
                employeeId: emp._id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                note: `${emp.firstName} turned 18 today. Please update NI rate in the pay-structure.`,
                dueDate: today,
                status: 'Pending',
                organizationId: orgId,
                createdBy: /* your system user ID or some fallback? */ emp._id,
                autoType: 'AUTO_18_BDAY'
              });
            }
          }

          // Check if turning 21
          if (ageNow === 21) {
            const already = await milestoneReminderExists(
              emp._id,
              'AUTO_21_BDAY'
            );
            if (!already) {
              await Reminder.create({
                employeeId: emp._id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                note: `${emp.firstName} turned 21 today. Please update NI rate in the pay-structure.`,
                dueDate: today,
                status: 'Pending',
                organizationId: orgId,
                createdBy: emp._id,
                autoType: 'AUTO_21_BDAY'
              });
            }
          }
        }
      }

      // --------------------
      // 2) Check for Commencement Milestones
      if (emp.commencementDate) {
        const diffDays = daysBetween(emp.commencementDate, today);

        // If exactly 14 days, create the 2-week reminder
        if (diffDays === 14) {
          const already = await milestoneReminderExists(
            emp._id,
            'AUTO_14DAY_COMMENCE'
          );
          if (!already) {
            await Reminder.create({
              employeeId: emp._id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              note: `${emp.firstName} has worked 2 weeks since commencement. Check if pay structure changes are required.`,
              dueDate: today,
              status: 'Pending',
              organizationId: orgId,
              createdBy: emp._id,
              autoType: 'AUTO_14DAY_COMMENCE'
            });
          }
        }

        // If exactly 84 days, create the 12-week reminder
        if (diffDays === 84) {
          const already = await milestoneReminderExists(
            emp._id,
            'AUTO_84DAY_COMMENCE'
          );
          if (!already) {
            await Reminder.create({
              employeeId: emp._id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              note: `${emp.firstName} has worked 12 weeks since commencement. Check if pay structure changes are required.`,
              dueDate: today,
              status: 'Pending',
              organizationId: orgId,
              createdBy: emp._id,
              autoType: 'AUTO_84DAY_COMMENCE'
            });
          }
        }
      }
    }
    console.log('[AutoReminders] Finished daily check.');
  } catch (err) {
    console.error('[AutoReminders] Error in daily auto reminders:', err);
  }
}

// Export a function that schedules the daily check at midnight
function scheduleDailyAutoReminders() {
  // Runs every day at 00:00 (midnight server time)
  cron.schedule('0 0 * * *', () => {
    runDailyAutoReminders();
  });
  console.log('[AutoReminders] Scheduled daily reminder check at 00:00.');
}

module.exports = { scheduleDailyAutoReminders };
