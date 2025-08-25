const express = require('express');
const router = express.Router();
const TransportEntry = require('../models/TransportEntry');
const { protect } = require('../middleware/authMiddleware');
const { body, validationResult, query } = require('express-validator');

// Validation middleware
const validateTransportEntry = [
  body('vehicleNo')
    .notEmpty()
    .withMessage('Vehicle number is required')
    .isLength({ max: 20 })
    .withMessage('Vehicle number cannot be more than 20 characters'),
  body('from')
    .notEmpty()
    .withMessage('From location is required')
    .isLength({ max: 100 })
    .withMessage('From location cannot be more than 100 characters'),
  body('to')
    .notEmpty()
    .withMessage('To location is required')
    .isLength({ max: 100 })
    .withMessage('To location cannot be more than 100 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date'),
  body('transportBillData.total')
    .optional()
    .isNumeric()
    .withMessage('Total must be a number')
    .custom(value => value >= 0)
    .withMessage('Total cannot be negative'),
  body('transportBillData.status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status must be one of: PENDING, IN_PROGRESS, COMPLETED, CANCELLED')
];

const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('Limit must be between 1 and 5000'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term cannot be more than 100 characters')
];

// @desc    Get all transport entries for the authenticated user
// @route   GET /api/transport-entries
// @access  Private
router.get('/', protect, validateQuery, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;
    const from = req.query.from;
    const to = req.query.to;

    // Build query
    let query = { userId: req.user._id };

    // Add search functionality
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: 'i' } }, // Search by custom Entry ID
        { vehicleNo: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { 'transportBillData.invoiceNo': { $regex: search, $options: 'i' } },
        { 'ownerData.ownerNameAndAddress': { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (status) {
      query['transportBillData.status'] = status;
    }
    if (from) {
      query.from = { $regex: from, $options: 'i' };
    }
    if (to) {
      query.to = { $regex: to, $options: 'i' };
    }

    // Get entries with pagination
    const entries = await TransportEntry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await TransportEntry.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page,
          pages,
          limit,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get transport entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching transport entries'
    });
  }
});

// @desc    Get single transport entry
// @route   GET /api/transport-entries/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const entry = await TransportEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Transport entry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Get transport entry error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transport entry ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while fetching transport entry'
    });
  }
});

// @desc    Create new transport entry
// @route   POST /api/transport-entries
// @access  Private
router.post('/', protect, validateTransportEntry, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    // Add user ID to the entry data
    const entryData = {
      ...req.body,
      userId: req.user._id
    };

    const entry = await TransportEntry.create(entryData);

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Transport entry created successfully'
    });
  } catch (error) {
    console.error('Create transport entry error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while creating transport entry'
    });
  }
});

// @desc    Update transport entry
// @route   PUT /api/transport-entries/:id
// @access  Private
router.put('/:id', protect, validateTransportEntry, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const entry = await TransportEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Transport entry not found'
      });
    }

    // Update the entry
    const updatedEntry = await TransportEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedEntry,
      message: 'Transport entry updated successfully'
    });
  } catch (error) {
    console.error('Update transport entry error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transport entry ID'
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while updating transport entry'
    });
  }
});

// @desc    Delete transport entry
// @route   DELETE /api/transport-entries/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await TransportEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Transport entry not found'
      });
    }

    await TransportEntry.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Transport entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete transport entry error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid transport entry ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error while deleting transport entry'
    });
  }
});

// @desc    Get transport entry statistics
// @route   GET /api/transport-entries/stats/summary
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get basic statistics
    const totalEntries = await TransportEntry.countDocuments({ userId });
    
    const statusStats = await TransportEntry.aggregate([
      { $match: { userId } },
      { $group: { _id: '$transportBillData.status', count: { $sum: 1 } } }
    ]);

    const totalAmount = await TransportEntry.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$transportBillData.total' } } }
    ]);

    // Recent entries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentEntries = await TransportEntry.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEntries,
        statusBreakdown: statusStats,
        totalAmount: totalAmount[0]?.total || 0,
        recentEntries
      }
    });
  } catch (error) {
    console.error('Get transport entry stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching statistics'
    });
  }
});

module.exports = router;