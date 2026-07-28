const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const emailService = require('../services/email');
const pushService = require('../services/push');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = db.query(
      'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND is_active = 1',
      [req.params.matchId, req.user.id, req.user.id]
    );
    if (match.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    const messages = db.query(
      `SELECT m.* FROM messages m WHERE m.match_id = ? ORDER BY m.created_at ASC LIMIT 200`,
      [req.params.matchId]
    );

    const unread = db.query(
      'SELECT COUNT(*) as count FROM messages WHERE match_id = ? AND sender_id != ? AND is_read = 0',
      [req.params.matchId, req.user.id]
    );

    if (unread.rows[0]?.count > 0) {
      db.query('UPDATE messages SET is_read = 1 WHERE match_id = ? AND sender_id != ? AND is_read = 0',
        [req.params.matchId, req.user.id]);

      const otherUserId = match.rows[0].user1_id === req.user.id ? match.rows[0].user2_id : match.rows[0].user1_id;
      const io = req.app.get('io');
      if (io) io.to(`user_${otherUserId}`).emit('message_read', { matchId: parseInt(req.params.matchId) });
    }

    res.json(messages.rows);
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:matchId', auth, async (req, res) => {
  try {
    const { content, messageType = 'text' } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message content required' });
    if (content.trim().length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    if (!['text', 'image', 'audio'].includes(messageType)) return res.status(400).json({ error: 'Invalid message type' });

    const match = db.query(
      'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND is_active = 1',
      [req.params.matchId, req.user.id, req.user.id]
    );
    if (match.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    const result = db.query(
      'INSERT INTO messages (match_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
      [req.params.matchId, req.user.id, content.trim(), messageType]
    );

    const message = {
      id: result.rows[0].id,
      match_id: parseInt(req.params.matchId),
      sender_id: req.user.id,
      content: content.trim(),
      message_type: messageType,
      is_read: 0,
      reaction: null,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      const otherUserId = match.rows[0].user1_id === req.user.id ? match.rows[0].user2_id : match.rows[0].user1_id;
      io.to(`user_${otherUserId}`).emit('new_message', message);

      const senderProfile = db.query('SELECT first_name FROM profiles WHERE user_id = ?', [req.user.id]);
      const senderName = senderProfile.rows[0]?.first_name || 'Someone';
      pushService.sendPush(otherUserId, senderName, content.trim().substring(0, 100), `/chat/${req.params.matchId}`).catch(() => {});

      try {
        const recipient = db.query(
          `SELECT u.email, p.first_name FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = ?`,
          [otherUserId]
        );
        if (recipient.rows[0]?.email) {
          emailService.sendNewMessageEmail(
            recipient.rows[0].email,
            recipient.rows[0].first_name || 'there',
            senderName
          );
        }
      } catch (_) {}
    }

    res.status(201).json(message);
  } catch (err) { console.error('Send message error:', err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:matchId/react', auth, async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    if (!messageId || !reaction) return res.status(400).json({ error: 'messageId and reaction required' });
    if (reaction.length > 10) return res.status(400).json({ error: 'Invalid reaction' });

    const match = db.query('SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND is_active = 1',
      [req.params.matchId, req.user.id, req.user.id]);
    if (match.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    db.query('UPDATE messages SET reaction = ? WHERE id = ? AND match_id = ?',
      [reaction, messageId, req.params.matchId]);

    const io = req.app.get('io');
    if (io) {
      const otherUserId = match.rows[0].user1_id === req.user.id ? match.rows[0].user2_id : match.rows[0].user1_id;
      io.to(`user_${otherUserId}`).emit('message_reaction', { messageId, reaction, matchId: parseInt(req.params.matchId) });
    }

    res.json({ messageId, reaction });
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:matchId/unread', auth, async (req, res) => {
  try {
    const match = db.query('SELECT id FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND is_active = 1',
      [req.params.matchId, req.user.id, req.user.id]);
    if (match.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    const result = db.query(
      'SELECT COUNT(*) as count FROM messages WHERE match_id = ? AND sender_id != ? AND is_read = 0',
      [req.params.matchId, req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
