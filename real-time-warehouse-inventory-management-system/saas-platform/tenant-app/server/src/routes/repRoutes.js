const express = require('express');
const router = express.Router();
const {
  getReps,
  getRepById,
  createRep,
  updateRep,
  deleteRep,
  getRepPerformance,
  getActiveReps,
} = require('../controllers/repController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all reps with pagination and filtering
router.get('/', getReps);

// Get active reps for dropdown
router.get('/active', getActiveReps);

// Get rep by ID
router.get('/:id', getRepById);

// Get rep performance data
router.get('/:id/performance', getRepPerformance);

// Create new rep
router.post('/', createRep);

// Update rep
router.put('/:id', updateRep);

// Delete rep
router.delete('/:id', deleteRep);

module.exports = router;
