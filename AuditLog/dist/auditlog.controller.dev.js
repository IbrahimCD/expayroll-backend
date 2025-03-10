"use strict";

var AuditLog = require('./auditlog.model'); // Endpoint to fetch audit logs (only Admin can access this)


exports.getAuditLogs = function _callee(req, res) {
  var logs;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(AuditLog.find().sort({
            timestamp: -1
          }));

        case 3:
          logs = _context.sent;
          return _context.abrupt("return", res.status(200).json({
            logs: logs
          }));

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);
          console.error("Error fetching audit logs:", _context.t0);
          return _context.abrupt("return", res.status(500).json({
            message: 'Server error fetching audit logs'
          }));

        case 11:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
}; // A helper function that you can call in other controllers to record an audit log.


exports.createAuditLog = function _callee2(_ref) {
  var userId, userName, action, entity, entityId, details, log;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          userId = _ref.userId, userName = _ref.userName, action = _ref.action, entity = _ref.entity, entityId = _ref.entityId, details = _ref.details;
          _context2.prev = 1;
          log = new AuditLog({
            userId: userId,
            userName: userName,
            action: action,
            entity: entity,
            entityId: entityId,
            details: details
          });
          _context2.next = 5;
          return regeneratorRuntime.awrap(log.save());

        case 5:
          return _context2.abrupt("return", log);

        case 8:
          _context2.prev = 8;
          _context2.t0 = _context2["catch"](1);
          console.error("Error creating audit log:", _context2.t0);

        case 11:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[1, 8]]);
};