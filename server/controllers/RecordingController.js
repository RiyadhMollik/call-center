const { Recording } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Utility function for consistent response format
const createResponse = (success = true, message = '', data = null) => {
  return { success, message, data };
};
// Get all recordings
const getAllRecordings = async (req, res) => {
    try {
      const recordings = await Recording.findAll({
        order: [['createdAt', 'DESC']]
      });
      res.json(createResponse(true, 'Recordings retrieved successfully', recordings));
    } catch (error) {
      console.error('Error fetching recordings:', error);
      res.status(500).json(createResponse(false, 'Failed to fetch recordings'));
    }
  };

// Get a specific recording by ID
const getRecordingById = async (req, res) => {
    try {
      const recording = await Recording.findByPk(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      res.json(recording);
    } catch (error) {
      console.error('Error fetching recording:', error);
      res.status(500).json({ error: 'Failed to fetch recording' });
    }
  };

// Upload a new recording
const uploadRecording = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { customName, trimStart, trimEnd, duration } = req.body;

      if (!customName || customName.trim() === '') {
        return res.status(400).json({ error: 'Custom name is required' });
      }

      // Check if custom name already exists
      const existingRecording = await Recording.findOne({
        where: { customName: customName.trim() }
      });

      if (existingRecording) {
        // Delete uploaded file if name already exists
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Recording name already exists' });
      }

      // Create recording record
      const recording = await Recording.create({
        customName: customName.trim(),
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        duration: duration ? parseFloat(duration) : null,
        trimStart: trimStart ? parseFloat(trimStart) : 0,
        trimEnd: trimEnd ? parseFloat(trimEnd) : null
      });

      res.status(201).json({
        message: 'Recording uploaded successfully',
        recording
      });

    } catch (error) {
      console.error('Error uploading recording:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading recording:', error);
      res.status(500).json({ error: 'Failed to upload recording' });
    }
  };

// Update recording metadata
const updateRecording = async (req, res) => {
    try {
      const { customName, trimStart, trimEnd } = req.body;
      
      const recording = await Recording.findByPk(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      // Check if new custom name already exists (if changed)
      if (customName && customName.trim() !== recording.customName) {
        const existingRecording = await Recording.findOne({
          where: { 
            customName: customName.trim(),
            id: { [Op.ne]: req.params.id }
          }
        });

        if (existingRecording) {
          return res.status(400).json({ error: 'Recording name already exists' });
        }
      }

      // Update recording
      await recording.update({
        customName: customName ? customName.trim() : recording.customName,
        trimStart: trimStart !== undefined ? parseFloat(trimStart) : recording.trimStart,
        trimEnd: trimEnd !== undefined ? parseFloat(trimEnd) : recording.trimEnd
      });

      res.json({
        message: 'Recording updated successfully',
        recording
      });

    } catch (error) {
      console.error('Error updating recording:', error);
      res.status(500).json({ error: 'Failed to update recording' });
    }
  };

// Delete a recording
const deleteRecording = async (req, res) => {
    try {
      const recording = await Recording.findByPk(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      // Delete file from filesystem
      if (fs.existsSync(recording.filePath)) {
        fs.unlinkSync(recording.filePath);
      }

      // Delete record from database
      await recording.destroy();

      res.json({ message: 'Recording deleted successfully' });

    } catch (error) {
      console.error('Error deleting recording:', error);
      res.status(500).json({ error: 'Failed to delete recording' });
    }
  };

// Download a recording file
const downloadRecording = async (req, res) => {
    try {
      const recording = await Recording.findByPk(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      if (!fs.existsSync(recording.filePath)) {
        return res.status(404).json({ error: 'Recording file not found' });
      }

      const fileName = `${recording.customName}${path.extname(recording.fileName)}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', recording.mimeType);
      
      const fileStream = fs.createReadStream(recording.filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading recording:', error);
      res.status(500).json({ error: 'Failed to download recording' });
    }
  };

// Stream a recording file
const streamRecording = async (req, res) => {
    try {
      const recording = await Recording.findByPk(req.params.id);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      if (!fs.existsSync(recording.filePath)) {
        return res.status(404).json({ error: 'Recording file not found' });
      }

      const stat = fs.statSync(recording.filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(recording.filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': recording.mimeType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': recording.mimeType,
        };
        res.writeHead(200, head);
        fs.createReadStream(recording.filePath).pipe(res);
      }

    } catch (error) {
      console.error('Error streaming recording:', error);
      res.status(500).json({ error: 'Failed to stream recording' });
    }
  };

module.exports = {
  getAllRecordings,
  getRecordingById,
  uploadRecording,
  updateRecording,
  deleteRecording,
  downloadRecording,
  streamRecording
};