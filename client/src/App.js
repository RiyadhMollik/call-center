import React, { useState } from 'react';
import VoiceRecorder from './components/VoiceRecorder';
import RecordingsList from './components/RecordingsList';
import CallManager from './components/CallManager';

function App() {
  const [activeTab, setActiveTab] = useState('recordings');

  return (
    <div className="container">
      <div className="header">
        <h1>Call Center Voice System</h1>
        <p>Record, crop, and manage your voice recordings, then create call campaigns</p>
      </div>
      
      <div className="navigation">
        <button 
          className={`nav-btn ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
        >
          Voice Recordings
        </button>
        <button 
          className={`nav-btn ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          Call Management
        </button>
      </div>
      
      {activeTab === 'recordings' && (
        <div className="tab-content">
          <VoiceRecorder />
          <RecordingsList />
        </div>
      )}
      
      {activeTab === 'calls' && (
        <div className="tab-content">
          <CallManager />
        </div>
      )}
    </div>
  );
}

export default App;