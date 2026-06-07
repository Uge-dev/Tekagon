const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

/**
 * GET /api/messages/user/:userId
 * Get all messages for a user with optional timestamp filter
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = req.query; // ISO timestamp

    let query = { userId };

    // If 'since' parameter provided, only get messages after that time
    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    const messages = await Message.find(query).sort({ timestamp: 1 });

    res.json({
      success: true,
      messages: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/messages/ticket/:ticketId
 * Get all messages for a ticket
 */
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { since } = req.query;

    let query = { ticketId };

    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    const messages = await Message.find(query).sort({ timestamp: 1 });

    res.json({
      success: true,
      messages: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/messages/unread/:userId
 * Get count of unread messages for a user
 */
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const unreadCount = await Message.countDocuments({
      userId: userId,
      read: false,
      sender: { $ne: 'user' }
    });

    res.json({
      success: true,
      unreadCount: unreadCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * PATCH /api/messages/read/:userId
 * Mark all messages as read for a user
 */
router.patch('/read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Message.updateMany(
      { userId: userId, read: false },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
