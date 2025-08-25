const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        if (req.query.search) {
            query.$or = [
                { 'profile.ownerName': { $regex: req.query.search, $options: 'i' } },
                { 'profile.companyName': { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { uniqueid: { $regex: req.query.search, $options: 'i' } },
                { 'profile.mobileNumber': { $regex: req.query.search, $options: 'i' } }
            ];
        }
        if (req.query.role) {
            query.role = req.query.role;
        }
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            count: users.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const userId = req.params.id;

        // Users can only access their own data unless they're admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this user'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', [
    body('email').optional().isEmail().withMessage('Please include a valid email'),
    body('profile.ownerName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Owner name must be between 1 and 100 characters'),
    body('profile.companyName').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Company name must be between 1 and 200 characters'),
    body('profile.mobileNumber').optional(),
    body('profile.address').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Address must be between 1 and 500 characters'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin')
], protect, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = req.params.id;

        // Users can only update their own data unless they're admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this user'
            });
        }

        const { email, profile, bank, role, isActive } = req.body;

        // Only admins can change role and isActive status
        const updateData = {};
        if (email !== undefined) updateData.email = email;

        // Update profile fields
        if (profile) {
            if (profile.ownerName !== undefined) updateData['profile.ownerName'] = profile.ownerName;
            if (profile.companyName !== undefined) updateData['profile.companyName'] = profile.companyName;
            if (profile.mobileNumber !== undefined) updateData['profile.mobileNumber'] = profile.mobileNumber;
            if (profile.address !== undefined) updateData['profile.address'] = profile.address;
            if (profile.gstNumber !== undefined) updateData['profile.gstNumber'] = profile.gstNumber;
            if (profile.panNumber !== undefined) updateData['profile.panNumber'] = profile.panNumber;
        }

        // Update bank fields
        if (bank) {
            if (bank.bankName !== undefined) updateData['bank.bankName'] = bank.bankName;
            if (bank.accountHolderName !== undefined) updateData['bank.accountHolderName'] = bank.accountHolderName;
            if (bank.accountNumber !== undefined) updateData['bank.accountNumber'] = bank.accountNumber;
            if (bank.ifscCode !== undefined) updateData['bank.ifscCode'] = bank.ifscCode;
            if (bank.bankBranchName !== undefined) updateData['bank.bankBranchName'] = bank.bankBranchName;
        }

        if (req.user.role === 'admin') {
            if (role !== undefined) updateData.role = role;
            if (isActive !== undefined) updateData.isActive = isActive;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent admin from deleting themselves
        if (req.user._id.toString() === userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: {
                id: user._id,
                uniqueid: user.uniqueid,
                email: user.email,
                profile: user.profile
            }
        });
    } catch (error) {
        console.error('Delete user error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

module.exports = router;
// @desc    Get user by unique ID
// @route   GET /api/users/uniqueid/:uniqueid
// @access  Private
router.get('/uniqueid/:uniqueid', protect, async (req, res) => {
    try {
        const uniqueid = req.params.uniqueid;

        const user = await User.findByUniqueId(uniqueid);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Users can only access their own data unless they're admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this user'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by uniqueid error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Get user by mobile number
// @route   GET /api/users/mobile/:mobile
// @access  Private/Admin
router.get('/mobile/:mobile', protect, authorize('admin'), async (req, res) => {
    try {
        const mobileNumber = req.params.mobile;

        const user = await User.findByMobile(mobileNumber);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by mobile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Update user profile
// @route   PUT /api/users/:id/profile
// @access  Private
router.put('/:id/profile', [
    body('ownerName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Owner name must be between 1 and 100 characters'),
    body('companyName').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Company name must be between 1 and 200 characters'),
    body('mobileNumber').optional(),
    body('address').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Address must be between 1 and 500 characters'),
    body('gstNumber').optional(),
    body('panNumber').optional()
], protect, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = req.params.id;

        // Users can only update their own data unless they're admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this user'
            });
        }

        const profileData = req.body;
        const updateData = {};

        // Build update object for profile fields
        Object.keys(profileData).forEach(key => {
            if (profileData[key] !== undefined) {
                updateData[`profile.${key}`] = profileData[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Update profile error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate data found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Update user bank details
// @route   PUT /api/users/:id/bank
// @access  Private
router.put('/:id/bank', [
    body('bankName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Bank name must be between 1 and 100 characters'),
    body('accountHolderName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Account holder name must be between 1 and 100 characters'),
    body('accountNumber').optional(),
    body('ifscCode').optional(),
    body('bankBranchName').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Bank branch name must be between 1 and 200 characters')
], protect, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = req.params.id;

        // Users can only update their own data unless they're admin
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this user'
            });
        }

        const bankData = req.body;
        const updateData = {};

        // Build update object for bank fields
        Object.keys(bankData).forEach(key => {
            if (bankData[key] !== undefined) {
                updateData[`bank.${key}`] = bankData[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Update bank details error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const regularUsers = await User.countDocuments({ role: 'user' });

        // Users registered in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                admins: adminUsers,
                regular: regularUsers,
                recentRegistrations: recentUsers
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});