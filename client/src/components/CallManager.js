import React, { useState, useEffect } from 'react';
import { callsAPI, recordingsAPI, apiUtils } from '../services/api';
import './CallManager.css';

const CallManager = () => {
  const [calls, setCalls] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [newCall, setNewCall] = useState({
    title: '',
    description: '',
    recordingId: '',
    phoneNumbers: [''],
    scheduledAt: '',
    callerId: '',
    retry: 3
  });

  useEffect(() => {
    fetchCalls();
    fetchRecordings();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await callsAPI.getCalls();
      // Updated for new backend response structure with createResponse
      const callsData = response.data?.data?.calls || [];
      setCalls(Array.isArray(callsData) ? callsData : []);
    } catch (error) {
      console.error('Error fetching calls:', error);
      setCalls([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      const response = await recordingsAPI.getRecordings();
      // Updated for new backend response structure with createResponse
      const recordingsData = response.data?.data || [];
      setRecordings(Array.isArray(recordingsData) ? recordingsData : []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setRecordings([]); // Set to empty array on error
    }
  };

  const handleCreateCall = async (e) => {
    e.preventDefault();
    try {
      // Defensive programming: ensure phoneNumbers is an array
      const phoneNumbersArray = Array.isArray(newCall.phoneNumbers) ? newCall.phoneNumbers : [''];
      const phoneNumbers = phoneNumbersArray
        .filter(num => num && num.trim() !== '')
        .map(num => num.trim());

      if (phoneNumbers.length === 0) {
        alert('Please add at least one phone number');
        return;
      }

      // Validate caller ID
      if (!newCall.callerId.trim()) {
        alert('Caller ID is required');
        return;
      }

      if (!/^\+?[\d\s\-\(\)]+$/.test(newCall.callerId.trim())) {
        alert('Invalid caller ID format. Please use a valid phone number format.');
        return;
      }

      // Validate phone numbers
      const { validNumbers, invalidNumbers } = apiUtils.validatePhoneNumbers(phoneNumbers);
      
      if (invalidNumbers.length > 0) {
        alert(`Invalid phone numbers found: ${invalidNumbers.join(', ')}`);
        return;
      }

      const callData = {
        ...newCall,
        phoneNumbers: validNumbers,
        recordingId: parseInt(newCall.recordingId),
        callerId: newCall.callerId.trim(),
        retry: parseInt(newCall.retry) || 3
      };

      await callsAPI.createCall(callData);
      setShowCreateForm(false);
      setNewCall({
        title: '',
        description: '',
        recordingId: '',
        phoneNumbers: [''],
        scheduledAt: '',
        callerId: '',
        retry: 3
      });
      fetchCalls();
    } catch (error) {
      console.error('Error creating call:', error);
      alert('Failed to create call: ' + apiUtils.handleError(error));
    }
  };

  const handleExecuteCall = async (callId) => {
    try {
      await callsAPI.executeCall(callId);
      fetchCalls(); // Refresh to show updated status
      alert('Call execution started!');
    } catch (error) {
      console.error('Error executing call:', error);
      alert('Failed to execute call: ' + apiUtils.handleError(error));
    }
  };

  const handleCancelCall = async (callId) => {
    if (window.confirm('Are you sure you want to cancel this call?')) {
      try {
        await callsAPI.cancelCall(callId);
        fetchCalls();
      } catch (error) {
        console.error('Error cancelling call:', error);
        alert('Failed to cancel call: ' + apiUtils.handleError(error));
      }
    }
  };

  const handleDeleteCall = async (callId) => {
    if (window.confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
      try {
        await callsAPI.deleteCall(callId);
        fetchCalls();
      } catch (error) {
        console.error('Error deleting call:', error);
        alert('Failed to delete call: ' + apiUtils.handleError(error));
      }
    }
  };

  const addPhoneNumberField = () => {
    setNewCall(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, '']
    }));
  };

  const removePhoneNumberField = (index) => {
    setNewCall(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
  };

  const updatePhoneNumber = (index, value) => {
    setNewCall(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((num, i) => i === index ? value : num)
    }));
  };

  const handleBulkPhoneNumbers = (text) => {
    const numbers = text.split(/[,\n\r]+/)
      .map(num => num.trim())
      .filter(num => num !== '');
    
    setNewCall(prev => ({
      ...prev,
      phoneNumbers: numbers
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#6c757d',
      'scheduled': '#17a2b8',
      'running': '#ffc107',
      'completed': '#28a745',
      'failed': '#dc3545',
      'cancelled': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return <div className="loading">Loading calls...</div>;
  }

  return (
    <div className="call-manager">
      <div className="header">
        <h2>Call Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Call Campaign
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Call Campaign</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCall} className="create-form">
              <div className="form-group">
                <label>Campaign Title *</label>
                <input
                  type="text"
                  value={newCall.title}
                  onChange={(e) => setNewCall(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Enter campaign title"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newCall.description}
                  onChange={(e) => setNewCall(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Campaign description (optional)"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Voice Recording *</label>
                <select
                  value={newCall.recordingId}
                  onChange={(e) => setNewCall(prev => ({ ...prev, recordingId: e.target.value }))}
                  required
                >
                  <option value="">Select a recording</option>
                  {recordings.map(recording => (
                    <option key={recording.id} value={recording.id}>
                      {recording.originalName} ({recording.duration}s)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Caller ID *</label>
                <input
                  type="tel"
                  value={newCall.callerId}
                  onChange={(e) => setNewCall(prev => ({ ...prev, callerId: e.target.value }))}
                  required
                  placeholder="e.g., +1234567890"
                  title="The phone number that will appear as the caller ID"
                />
                <small>The phone number that recipients will see as the caller</small>
              </div>

              <div className="form-group">
                <label>Retry Attempts</label>
                <input
                  type="number"
                  value={newCall.retry}
                  onChange={(e) => setNewCall(prev => ({ ...prev, retry: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="10"
                  placeholder="3"
                  title="Number of times to retry failed calls"
                />
                <small>Number of times to retry if a call fails (1-10 attempts)</small>
              </div>

              <div className="form-group">
                <label>Phone Numbers *</label>
                <div className="phone-numbers-section">
                  <div className="bulk-input">
                    <textarea
                      placeholder="Enter phone numbers (one per line or comma-separated)&#10;e.g.:&#10;+1234567890&#10;+1987654321"
                      rows="4"
                      onChange={(e) => handleBulkPhoneNumbers(e.target.value)}
                    />
                  </div>
                  
                  <div className="individual-inputs">
                    <h4>Or add individually:</h4>
                    {(newCall.phoneNumbers || []).map((number, index) => (
                      <div key={index} className="phone-input-row">
                        <input
                          type="tel"
                          value={number}
                          onChange={(e) => updatePhoneNumber(index, e.target.value)}
                          placeholder="+1234567890"
                        />
                        {(newCall.phoneNumbers || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhoneNumberField(index)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPhoneNumberField}
                      className="add-phone-btn"
                    >
                      Add Another Number
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Scheduled Time (optional)</label>
                <input
                  type="datetime-local"
                  value={newCall.scheduledAt}
                  onChange={(e) => setNewCall(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Create Campaign
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="calls-list">
        {!calls || calls.length === 0 ? (
          <div className="empty-state">
            <p>No call campaigns found. Create your first campaign to get started!</p>
          </div>
        ) : (
          calls.map(call => (
            <div key={call.id} className="call-card">
              <div className="call-header">
                <h3>{call.title}</h3>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(call.status) }}
                >
                  {call.status.toUpperCase()}
                </span>
              </div>

              <div className="call-details">
                <p><strong>Description:</strong> {call.description || 'No description'}</p>
                <p><strong>Voice Recording:</strong> {call.recording?.originalName}</p>
                {/* <p><strong>Total Numbers:</strong> {call.phoneNumbers.length}</p> */}
                {/* <p><strong>Successful Calls:</strong> {call.successfulCalls}</p>
                <p><strong>Failed Calls:</strong> {call.failedCalls}</p> */}
                <p><strong>Created:</strong> {new Date(call.createdAt).toLocaleString()}</p>
                {call.scheduledAt && (
                  <p><strong>Scheduled:</strong> {new Date(call.scheduledAt).toLocaleString()}</p>
                )}
                {call.startedAt && (
                  <p><strong>Started:</strong> {new Date(call.startedAt).toLocaleString()}</p>
                )}
                {call.completedAt && (
                  <p><strong>Completed:</strong> {new Date(call.completedAt).toLocaleString()}</p>
                )}
              </div>

              <div className="call-actions">
                {call.status === 'draft' || call.status === 'scheduled' ? (
                  <button
                    onClick={() => handleExecuteCall(call.id)}
                    className="btn btn-success"
                  >
                    Execute Call
                  </button>
                ) : null}

                {call.status === 'running' && (
                  <button
                    onClick={() => handleCancelCall(call.id)}
                    className="btn btn-warning"
                  >
                    Cancel Call
                  </button>
                )}

                <button
                  onClick={() => setSelectedCall(call)}
                  className="btn btn-info"
                >
                  View Details
                </button>

                {call.status !== 'running' && (
                  <button
                    onClick={() => handleDeleteCall(call.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedCall && (
        <CallDetails 
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
};

// Call Details Component
const CallDetails = ({ call, onClose }) => {
  const [callDetails, setCallDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallDetails();
  }, [call.id]);

  const fetchCallDetails = async () => {
    try {
      const response = await callsAPI.getCall(call.id);
      // Handle the new response structure with nested data
      setCallDetails(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching call details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="loading">Loading call details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal large">
        <div className="modal-header">
          <h3>Call Campaign Details: {callDetails.call?.title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="call-details-content">
          {/* Campaign Overview */}
          <div className="details-section">
            <h4>📊 Campaign Overview</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Status:</span>
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: callDetails.call?.status === 'completed' ? '#28a745' : 
                                   callDetails.call?.status === 'failed' ? '#dc3545' : 
                                   callDetails.call?.status === 'running' ? '#ffc107' : '#6c757d'
                  }}
                >
                  {callDetails.call?.status?.toUpperCase()}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Description:</span>
                <span>{callDetails.call?.description || 'No description'}</span>
              </div>
              <div className="info-item">
                <span className="label">Voice Recording:</span>
                <span>{callDetails.call?.recording?.originalName}</span>
              </div>
              <div className="info-item">
                <span className="label">Duration:</span>
                <span>{callDetails.call?.recording?.duration ? `${Math.round(callDetails.call.recording.duration)}s` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="details-section">
            <h4>📈 Campaign Statistics</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">
                  {callDetails.apiResponse?.report?.length || callDetails.call?.totalCalls || 0}
                </div>
                <div className="stat-label">Total Calls</div>
              </div>
              <div className="stat-card success">
                <div className="stat-number">
                  {callDetails.apiResponse?.report 
                    ? callDetails.apiResponse.report.filter(r => r.call_status === 'Success').length
                    : callDetails.call?.successfulCalls || 0}
                </div>
                <div className="stat-label">Successful</div>
              </div>
              <div className="stat-card failed">
                <div className="stat-number">
                  {callDetails.apiResponse?.report 
                    ? callDetails.apiResponse.report.filter(r => r.call_status !== 'Success').length
                    : callDetails.call?.failedCalls || 0}
                </div>
                <div className="stat-label">Failed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {(() => {
                    if (callDetails.apiResponse?.report && callDetails.apiResponse.report.length > 0) {
                      const successful = callDetails.apiResponse.report.filter(r => r.call_status === 'Success').length;
                      return Math.round((successful / callDetails.apiResponse.report.length) * 100);
                    } else if (callDetails.call?.totalCalls > 0) {
                      return Math.round((callDetails.call?.successfulCalls || 0) / callDetails.call.totalCalls * 100);
                    }
                    return 0;
                  })()}%
                </div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Campaign Timeline */}
          {(callDetails.call?.startedAt || callDetails.call?.completedAt) && (
            <div className="details-section">
              <h4>⏰ Timeline</h4>
              <div className="timeline">
                <div className="timeline-item">
                  <span className="timeline-label">Created:</span>
                  <span>{new Date(callDetails.call.createdAt).toLocaleString()}</span>
                </div>
                {callDetails.call?.startedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Started:</span>
                    <span>{new Date(callDetails.call.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {callDetails.call?.completedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Completed:</span>
                    <span>{new Date(callDetails.call.completedAt).toLocaleString()}</span>
                  </div>
                )}
                {callDetails.apiResponse?.finished_at && (
                  <div className="timeline-item">
                    <span className="timeline-label">API Finished:</span>
                    <span>{new Date(callDetails.apiResponse.finished_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cost Summary - only show if API response has cost data */}
          {callDetails.apiResponse?.report && callDetails.apiResponse.report.some(r => r.deduction) && (
            <div className="details-section">
              <h4>💰 Cost Summary</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">
                    {callDetails.apiResponse.report
                      .reduce((total, r) => total + (parseFloat(r.deduction) || 0), 0)
                      .toFixed(3)}tk
                  </div>
                  <div className="stat-label">Total Cost</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {callDetails.apiResponse.report.length > 0
                      ? (callDetails.apiResponse.report
                          .reduce((total, r) => total + (parseFloat(r.deduction) || 0), 0) / 
                          callDetails.apiResponse.report.length).toFixed(3)
                      : '0.000'}tk
                  </div>
                  <div className="stat-label">Avg Cost per Call</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {callDetails.apiResponse.report
                      .reduce((total, r) => total + (parseInt(r.pulse_billsec) || 0), 0)}s
                  </div>
                  <div className="stat-label">Total Duration</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {callDetails.apiResponse.report.length > 0
                      ? Math.round(callDetails.apiResponse.report
                          .reduce((total, r) => total + (parseInt(r.pulse_billsec) || 0), 0) / 
                          callDetails.apiResponse.report.length)
                      : 0}s
                  </div>
                  <div className="stat-label">Avg Duration</div>
                </div>
              </div>
            </div>
          )}

          {/* API Response Status */}
          {callDetails.apiResponse && (
            <div className="details-section">
              <h4>🔗 API Status</h4>
              <div className="api-status">
                <div className="api-status-item">
                  <span className="label">Blast ID:</span>
                  <span className="value">{callDetails.apiResponse.blast_id}</span>
                </div>
                <div className="api-status-item">
                  <span className="label">Status:</span>
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: callDetails.apiResponse.blast_status === 'Finished' ? '#28a745' : '#ffc107'
                    }}
                  >
                    {callDetails.apiResponse.blast_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Individual Call Results */}
          {callDetails.apiResponse?.report && callDetails.apiResponse.report.length > 0 && (
            <div className="results-section">
              <h4>📞 Individual Call Results</h4>
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Phone Number</th>
                      <th>Caller ID</th>
                      <th>Status</th>
                      <th>Attempt</th>
                      <th>Duration</th>
                      <th>Cost</th>
                      <th>Called At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callDetails.apiResponse.report.map((result, index) => (
                      <tr key={index}>
                        <td className="phone-number">{result.dst}</td>
                        <td>{result.callerid}</td>
                        <td>
                          <span 
                            className="status-badge small"
                            style={{ 
                              backgroundColor: result.call_status === 'Success' ? '#28a745' : '#dc3545'
                            }}
                          >
                            {result.call_status}
                          </span>
                        </td>
                        <td className="attempt-number">{result.attempt}</td>
                        <td className="duration">{result.pulse_billsec ? `${result.pulse_billsec}s` : '-'}</td>
                        <td className="cost">${result.deduction || '0.00'}</td>
                        <td className="call-time">{new Date(result.tried_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No API Response Available */}
          {!callDetails.apiResponse && callDetails.call?.blast_id && (
            <div className="details-section">
              <div className="no-data">
                <p>📡 Campaign report not available yet</p>
                <small>Blast ID: {callDetails.call.blast_id}</small>
              </div>
            </div>
          )}

          {/* Campaign Not Executed */}
          {!callDetails.call?.blast_id && (
            <div className="details-section">
              <div className="no-data">
                <p>⏳ Campaign has not been executed yet</p>
                <small>Execute the campaign to see detailed call results</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallManager;