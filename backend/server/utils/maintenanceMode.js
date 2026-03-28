/**
 * maintenanceMode.js
 * ------------------
 * In-memory maintenance flag toggled by the retrain service.
 * Exposed as a module-level singleton so any require() of this file
 * shares the same state within the Node process.
 */

let _inMaintenance = false;
let _startedAt     = null;

const setMaintenance = (active) => {
  _inMaintenance = active;
  _startedAt     = active ? new Date().toISOString() : null;
  console.log(`[MAINTENANCE] Mode ${active ? 'ENABLED' : 'DISABLED'}`);
};

const isInMaintenance = () => _inMaintenance;

const getStatus = () => ({
  inMaintenance: _inMaintenance,
  startedAt:     _startedAt,
});

module.exports = { setMaintenance, isInMaintenance, getStatus };
