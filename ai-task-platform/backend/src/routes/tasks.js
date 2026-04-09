// === FILE: backend/src/routes/tasks.js ===
const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { redisClient } = require('../config/redis');
const promClient = require('prom-client');

const router = express.Router();

const taskCreatedTotal = new promClient.Counter({
  name: 'task_created_total',
  help: 'Total number of tasks created',
  labelNames: ['operation']
});

router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('input').notEmpty().withMessage('Input is required'),
  body('operation').isIn(['uppercase', 'lowercase', 'reverse', 'word_count']).withMessage('Invalid operation')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, input, operation } = req.body;

    const task = new Task({
      userId: req.user.id,
      title,
      input,
      operation,
      status: 'pending',
      logs: [{ message: 'Task created and queued', level: 'INFO' }]
    });

    await task.save();

    if (redisClient.isOpen) {
      const jobPayload = JSON.stringify({
        taskId: task.id,
        operation,
        input
      });
      // BLPOP producer strategy
      await redisClient.lPush('ai_task_queue', jobPayload);
    } else {
      console.warn(`[${req.id}] Redis is down. Task saved to MongoDB for fallback worker polling.`);
    }

    taskCreatedTotal.inc({ operation });

    res.status(201).json({ task });
  } catch (err) {
    console.error(`[${req.id}] Create Task Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-logs'); // Omit heavy logs array

    const total = await Task.countDocuments({ userId: req.user.id });

    res.status(200).json({
      tasks,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(`[${req.id}] List Tasks Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ task });
  } catch (err) {
    console.error(`[${req.id}] Get Task Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[${req.id}] Delete Task Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Server-Sent Events (SSE) log streaming (BONUS 1)
router.get('/:id/stream', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Ensure nginx doesn't hold SSE packets
    res.flushHeaders();

    res.write(`data: ${JSON.stringify(task.logs)}\n\n`);

    if (task.status === 'success' || task.status === 'failed') {
      res.write(`event: done\ndata: {}\n\n`);
      return res.end();
    }

    let currentLogCount = task.logs.length;
    const interval = setInterval(async () => {
      const updatedTask = await Task.findById(task.id);
      
      if (!updatedTask) {
        clearInterval(interval);
        return res.end();
      }

      if (updatedTask.logs.length > currentLogCount) {
        const newLogs = updatedTask.logs.slice(currentLogCount);
        currentLogCount = updatedTask.logs.length;
        res.write(`data: ${JSON.stringify(newLogs)}\n\n`);
      }

      if (updatedTask.status === 'success' || updatedTask.status === 'failed') {
        clearInterval(interval);
        res.write(`event: done\ndata: {}\n\n`);
        return res.end();
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (err) {
    console.error(`[${req.id}] SSE Stream Error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
