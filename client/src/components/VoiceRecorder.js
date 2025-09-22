import React, { useState, useRef, useEffect } from 'react';
import AudioTrimmer from './AudioTrimmer';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingName, setRecordingName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const [duration, setDuration] = useState(0);
  const [audioFormat, setAudioFormat] = useState('webm'); // Track current audio format
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        setAudioFormat('webm'); // Set initial format
        setStatus('Recording completed - Processing audio...');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Try to calculate duration immediately from the blob
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const calculatedDuration = audioBuffer.length / audioBuffer.sampleRate;
          
          console.log('Duration calculated immediately after recording:', calculatedDuration);
          
          if (isFinite(calculatedDuration) && calculatedDuration > 0) {
            setDuration(calculatedDuration);
            setStatus(`Recording completed - Duration: ${calculatedDuration.toFixed(1)}s`);
          }
          
          audioContext.close();
        } catch (error) {
          console.warn('Could not calculate duration immediately:', error);
          setStatus('Recording completed - Duration will be detected when audio loads');
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setStatus('Recording...');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Error: Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      console.log('Audio metadata loaded, duration:', audioDuration);
      
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
        setStatus(`Audio ready - Duration: ${audioDuration.toFixed(1)}s`);
      } else {
        console.warn('Invalid audio duration from metadata:', audioDuration);
        // Try alternative methods to get duration
        tryAlternativeDurationDetection();
      }
    }
  };

  const tryAlternativeDurationDetection = async () => {
    try {
      // Method 1: Wait and retry
      setTimeout(() => {
        if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          setDuration(audioRef.current.duration);
          setStatus(`Duration detected: ${audioRef.current.duration.toFixed(1)}s`);
          return;
        }
      }, 500);

      // Method 2: Use Web Audio API to decode the blob
      if (audioBlob) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const calculatedDuration = audioBuffer.length / audioBuffer.sampleRate;
        
        console.log('Duration calculated from audio buffer:', calculatedDuration);
        
        if (isFinite(calculatedDuration) && calculatedDuration > 0) {
          setDuration(calculatedDuration);
          setStatus(`Duration calculated: ${calculatedDuration.toFixed(1)}s`);
        }
        
        // Close audio context to free resources
        audioContext.close();
      }
    } catch (error) {
      console.error('Error in alternative duration detection:', error);
      setStatus('Could not determine audio duration');
    }
  };

  const convertToWAV = async (webmBlob) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(audioBuffer);
      audioContext.close();
      
      return wavBlob;
    } catch (error) {
      console.error('Error converting to WAV:', error);
      return webmBlob; // Return original if conversion fails
    }
  };

  const audioBufferToWav = (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert audio data to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const downloadRecording = () => {
    if (audioBlob && recordingName.trim()) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      // Use the current audio format for the file extension
      a.download = `${recordingName.trim()}.${audioFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(`Download started (${audioFormat.toUpperCase()} format)`);
    } else {
      setStatus('Please enter a recording name');
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob || !recordingName.trim()) {
      setStatus('Please enter a recording name');
      return;
    }

    if (typeof window.uploadRecording === 'function') {
      setStatus(`Uploading (${audioFormat.toUpperCase()} format)...`);
      const result = await window.uploadRecording(
        audioBlob, 
        recordingName.trim(), 
        0, // trimStart
        null, // trimEnd  
        duration
      );
      
      if (result.success) {
        setStatus(`Recording uploaded successfully! (${audioFormat.toUpperCase()} format)`);
        // Optionally reset the form
        // resetRecording();
      } else {
        setStatus(`Upload failed: ${result.error}`);
      }
    } else {
      setStatus('Upload service not available');
    }
  };

  const recalculateDuration = async () => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      console.log('Recalculating duration from audio element:', newDuration);
      
      if (isFinite(newDuration) && newDuration > 0) {
        setDuration(newDuration);
        setStatus(`Duration updated: ${newDuration.toFixed(1)}s`);
        return;
      }
    }

    // If audio element doesn't have duration, try Web Audio API
    if (audioBlob) {
      try {
        setStatus('Calculating duration from audio data...');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const calculatedDuration = audioBuffer.length / audioBuffer.sampleRate;
        
        console.log('Duration calculated from blob:', calculatedDuration, 'seconds');
        console.log('Audio buffer info:', {
          length: audioBuffer.length,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels
        });
        
        if (isFinite(calculatedDuration) && calculatedDuration > 0) {
          setDuration(calculatedDuration);
          setStatus(`Duration calculated: ${calculatedDuration.toFixed(1)}s`);
        } else {
          setStatus('Unable to calculate audio duration');
        }
        
        // Close audio context to free resources
        audioContext.close();
        
      } catch (error) {
        console.error('Error calculating duration:', error);
        setStatus('Error: Could not calculate audio duration');
      }
    } else {
      setStatus('No audio data available for duration calculation');
    }
  };

  const resetRecording = () => {
    setAudioURL('');
    setAudioBlob(null);
    setRecordingName('');
    setIsPlaying(false);
    setStatus('');
    setDuration(0);
    setAudioFormat('webm'); // Reset to default format
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleTrimmedAudio = (trimmedBlob, trimStart, trimEnd) => {
    // Revoke old URL to prevent memory leaks
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    
    const url = URL.createObjectURL(trimmedBlob);
    setAudioURL(url);
    setAudioBlob(trimmedBlob);
    // Keep the same audio format after trimming
    
    // Update duration to match trimmed audio
    const newDuration = trimEnd - trimStart;
    setDuration(newDuration);
    
    setStatus(`Audio trimmed successfully! New duration: ${newDuration.toFixed(1)}s (${audioFormat.toUpperCase()} format)`);
    
    // Reset audio player
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="recorder-section">
      <h2>Voice Recorder</h2>
      
      <div className="controls">
        <button 
          className="btn btn-record" 
          onClick={startRecording} 
          disabled={isRecording}
        >
          {isRecording ? 'Recording...' : 'Start Recording'}
        </button>
        
        <button 
          className="btn btn-stop" 
          onClick={stopRecording} 
          disabled={!isRecording}
        >
          Stop Recording
        </button>
        
        {audioURL && (
          <>
            <button 
              className="btn btn-play" 
              onClick={playRecording}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button 
              className="btn" 
              onClick={resetRecording}
            >
              Reset
            </button>
            
            <button 
              className="btn" 
              onClick={recalculateDuration}
              style={{ backgroundColor: '#17a2b8', color: 'white' }}
            >
              Fix Duration
            </button>
            
            <button 
              className="btn" 
              onClick={async () => {
                setStatus('Converting to WAV format...');
                const wavBlob = await convertToWAV(audioBlob);
                const wavUrl = URL.createObjectURL(wavBlob);
                
                // Revoke old URL
                URL.revokeObjectURL(audioURL);
                
                setAudioURL(wavUrl);
                setAudioBlob(wavBlob);
                setAudioFormat('wav'); // Update format state
                setStatus('Converted to WAV format');
              }}
              style={{ backgroundColor: '#6f42c1', color: 'white' }}
              disabled={audioFormat === 'wav'}
            >
              Convert to WAV
            </button>
            
            {audioFormat === 'wav' && (
              <button 
                className="btn" 
                onClick={() => {
                  // If user wants to go back to original WebM, they need to re-record
                  // For now, just show a helpful message
                  setStatus('To convert back to WebM, please record a new audio or refresh the page');
                }}
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                ✓ WAV Format
              </button>
            )}
          </>
        )}
      </div>

      {status && (
        <div className={`status ${status.includes('Error') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {audioURL && (
        <div>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: audioFormat === 'wav' ? '#d4edda' : '#e2e3e5', 
            border: `1px solid ${audioFormat === 'wav' ? '#c3e6cb' : '#d6d8db'}`,
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: audioFormat === 'wav' ? '#155724' : '#495057'
          }}>
            Current Format: {audioFormat.toUpperCase()}
            {duration > 0 && ` • Duration: ${duration.toFixed(1)}s`}
          </div>
          
          <audio 
            ref={audioRef}
            src={audioURL}
            onEnded={handleAudioEnded}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onCanPlay={handleAudioLoadedMetadata}
            onLoadedData={handleAudioLoadedMetadata}
            onDurationChange={handleAudioLoadedMetadata}
            onLoad={handleAudioLoadedMetadata}
            onProgress={handleAudioLoadedMetadata}
            className="audio-player"
            controls
            preload="metadata"
          />
          
          <div className="file-input">
            <input
              type="text"
              placeholder="Enter recording name"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
            />
            <button 
              className="btn btn-download" 
              onClick={downloadRecording}
              disabled={!recordingName.trim()}
            >
              Download
            </button>
            <button 
              className="btn"
              onClick={uploadRecording}
              disabled={!recordingName.trim()}
              style={{ backgroundColor: '#28a745', color: 'white' }}
            >
              Save to Server
            </button>
          </div>

          {duration > 0 && isFinite(duration) && (
            <AudioTrimmer 
              audioBlob={audioBlob}
              duration={duration}
              onTrimmed={handleTrimmedAudio}
            />
          )}
          
          {(!duration || !isFinite(duration)) && audioBlob && (
            <div style={{ padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', margin: '10px 0' }}>
              <strong>Note:</strong> Audio trimming not available - unable to determine audio duration. 
              Duration detected: {duration}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;