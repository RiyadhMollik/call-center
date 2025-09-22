import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/recordings`);
      // Updated for new backend response structure with createResponse
      const recordingsData = response.data?.data || [];
      setRecordings(Array.isArray(recordingsData) ? recordingsData : []);
      setError('');
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to fetch recordings. Make sure the server is running.');
      setRecordings([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const uploadRecording = async (audioBlob, customName, trimStart = 0, trimEnd = null, duration = null) => {
    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('audio', audioBlob, `${customName}.webm`);
      formData.append('customName', customName);
      if (trimStart !== undefined) formData.append('trimStart', trimStart);
      if (trimEnd !== null) formData.append('trimEnd', trimEnd);
      if (duration !== null) formData.append('duration', duration);

      await axios.post(`${API_BASE_URL}/recordings/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchRecordings(); // Refresh the list
      return { success: true };
    } catch (err) {
      console.error('Error uploading recording:', err);
      const errorMessage = err.response?.data?.error || 'Failed to upload recording';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  };

  const deleteRecording = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/recordings/${id}`);
      await fetchRecordings(); // Refresh the list
    } catch (err) {
      console.error('Error deleting recording:', err);
      setError('Failed to delete recording');
    }
  };

  const downloadRecording = async (id, customName) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/recordings/${id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${customName}.webm`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading recording:', err);
      setError('Failed to download recording');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Expose uploadRecording function to parent components
  React.useImperativeHandle = React.useImperativeHandle || (() => {});
  
  // Make upload function available globally
  if (typeof window !== 'undefined') {
    window.uploadRecording = uploadRecording;
  }

  if (loading) {
    return (
      <div className="recordings-list">
        <h2>Saved Recordings</h2>
        <p>Loading recordings...</p>
      </div>
    );
  }

  return (
    <div className="recordings-list">
      <h2>Saved Recordings</h2>
      
      {uploading && (
        <div className="status">
          Uploading recording...
        </div>
      )}
      
      {error && (
        <div className="status error">
          {error}
        </div>
      )}

      <button 
        className="btn" 
        onClick={fetchRecordings}
        disabled={loading}
        style={{ marginBottom: '20px' }}
      >
        Refresh List
      </button>

      {recordings.length === 0 ? (
        <p>No recordings found. Record and upload your first audio file!</p>
      ) : (
        <div>
          <p>{recordings.length} recording(s) found</p>
          {recordings.map((recording) => (
            <div key={recording.id} className="recording-item">
              <div>
                <h4>{recording.customName}</h4>
                <p>
                  Size: {formatFileSize(recording.fileSize)} | 
                  Duration: {formatDuration(recording.duration)} | 
                  Uploaded: {formatDate(recording.createdAt)}
                </p>
                {recording.trimStart > 0 || recording.trimEnd !== null ? (
                  <p style={{ fontSize: '0.9em', color: '#666' }}>
                    Trimmed: {recording.trimStart.toFixed(1)}s - {recording.trimEnd ? recording.trimEnd.toFixed(1) : 'end'}s
                  </p>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <audio 
                  controls 
                  src={`${API_BASE_URL}/recordings/${recording.id}/stream`}
                  style={{ width: '200px' }}
                />
                <button 
                  className="btn btn-download"
                  onClick={() => downloadRecording(recording.id, recording.customName)}
                >
                  Download
                </button>
                <button 
                  className="btn"
                  onClick={() => deleteRecording(recording.id)}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingsList;