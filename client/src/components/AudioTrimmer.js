import React, { useState, useRef, useEffect } from 'react';

const AudioTrimmer = ({ audioBlob, duration, onTrimmed }) => {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);

  useEffect(() => {
    console.log('Duration changed:', duration);
    if (duration && duration > 0 && !isNaN(duration) && isFinite(duration)) {
      setTrimStart(0);
      setTrimEnd(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (audioBlob && duration > 0 && !isNaN(duration) && isFinite(duration)) {
      loadAudioBuffer();
    }
  }, [audioBlob, duration]);

  const loadAudioBuffer = async () => {
    try {
      setIsLoading(true);
      
      // Create or resume audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      
      // Calculate actual duration from audio buffer as fallback
      const bufferDuration = audioBuffer.length / audioBuffer.sampleRate;
      console.log('Audio buffer loaded:', {
        duration: duration,
        bufferDuration: bufferDuration,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length
      });
      
      // If passed duration is invalid, use buffer duration
      if (!isFinite(duration) || duration <= 0) {
        console.warn('Using buffer duration as fallback:', bufferDuration);
        // We can't directly set duration here since it's a prop, but we can log it
      }
      
      drawWaveform(audioBuffer);
    } catch (error) {
      console.error('Error loading audio buffer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawWaveform = (audioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / width);

    if (samplesPerPixel === 0) return;

    // Draw waveform
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const centerY = height / 2;
    
    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, channelData.length);
      
      let min = 1.0;
      let max = -1.0;
      
      for (let i = startSample; i < endSample; i++) {
        const sample = channelData[i];
        if (sample > max) max = sample;
        if (sample < min) min = sample;
      }
      
      const yMax = centerY - (max * centerY * 0.8);
      const yMin = centerY - (min * centerY * 0.8);
      
      if (x === 0) {
        ctx.moveTo(x, yMax);
      } else {
        ctx.lineTo(x, yMax);
      }
      ctx.lineTo(x, yMin);
    }
    
    ctx.stroke();

    // Draw trim markers
    const validTrimStart = isFinite(trimStart) ? trimStart : 0;
    const validTrimEnd = isFinite(trimEnd) ? trimEnd : duration;
    const validDuration = isFinite(duration) ? duration : audioBuffer.duration;
    
    const startX = Math.max(0, (validTrimStart / validDuration) * width);
    const endX = Math.min(width, (validTrimEnd / validDuration) * width);

    // Highlight selected region first (background)
    ctx.fillStyle = 'rgba(40, 167, 69, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);

    // Start marker (red line)
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();

    // End marker (red line)
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    // Add marker labels
    ctx.fillStyle = '#dc3545';
    ctx.font = '12px Arial';
    ctx.fillText('Start', startX + 5, 15);
    ctx.fillText('End', endX - 25, 15);
  };

  useEffect(() => {
    if (audioBufferRef.current) {
      drawWaveform(audioBufferRef.current);
    }
  }, [trimStart, trimEnd, duration]);

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration || !isFinite(duration) || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = Math.max(0, Math.min((x / canvas.width) * duration, duration));

    console.log('Canvas click:', { x, clickTime, duration, trimStart, trimEnd });

    // Determine if clicking closer to start or end marker
    const distanceToStart = Math.abs(clickTime - trimStart);
    const distanceToEnd = Math.abs(clickTime - trimEnd);

    if (distanceToStart < distanceToEnd) {
      // Moving start marker
      const newStart = Math.max(0, Math.min(clickTime, trimEnd - 0.1));
      setTrimStart(newStart);
    } else {
      // Moving end marker
      const newEnd = Math.max(trimStart + 0.1, Math.min(clickTime, duration));
      setTrimEnd(newEnd);
    }
  };

  const handleStartChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && isFinite(value)) {
      setTrimStart(Math.max(0, Math.min(value, trimEnd - 0.1)));
    }
  };

  const handleEndChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && isFinite(value)) {
      setTrimEnd(Math.max(trimStart + 0.1, Math.min(value, duration)));
    }
  };

  const trimAudio = async () => {
    if (!audioBufferRef.current || !audioContextRef.current || trimEnd <= trimStart) {
      console.error('Invalid audio buffer or trim parameters');
      return;
    }

    setIsTrimming(true);
    
    try {
      const audioBuffer = audioBufferRef.current;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const newLength = Math.max(1, endSample - startSample);

      console.log(`Trimming audio: ${trimStart.toFixed(2)}s to ${trimEnd.toFixed(2)}s`);
      console.log(`Samples: ${startSample} to ${endSample} (${newLength} samples)`);

      // Create new audio buffer with trimmed data
      const newAudioBuffer = audioContextRef.current.createBuffer(
        channels,
        newLength,
        sampleRate
      );

      for (let channel = 0; channel < channels; channel++) {
        const oldChannelData = audioBuffer.getChannelData(channel);
        const newChannelData = newAudioBuffer.getChannelData(channel);
        
        for (let i = 0; i < newLength && (startSample + i) < oldChannelData.length; i++) {
          newChannelData[i] = oldChannelData[startSample + i] || 0;
        }
      }

      // Convert audio buffer to blob
      const trimmedBlob = await audioBufferToBlob(newAudioBuffer);
      console.log('Trimmed blob created:', trimmedBlob.size, 'bytes');
      onTrimmed(trimmedBlob, trimStart, trimEnd);
      
    } catch (error) {
      console.error('Error trimming audio:', error);
      alert('Error trimming audio: ' + error.message);
    } finally {
      setIsTrimming(false);
    }
  };

  const audioBufferToBlob = async (audioBuffer) => {
    try {
      // Use OfflineAudioContext for better compatibility
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV format
      const wavBlob = audioBufferToWav(renderedBuffer);
      return wavBlob;
    } catch (error) {
      console.error('Error converting audio buffer to blob:', error);
      throw error;
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

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '0:00.0';
    }
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  if (!audioBlob || !duration || !isFinite(duration) || duration <= 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Audio Trimmer</h3>
      
      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>
        Debug: Duration={duration}, TrimStart={trimStart}, TrimEnd={trimEnd}
      </div>
      
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Loading audio for trimming...
        </div>
      )}
      
      {!isLoading && (
        <>
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
            Click on the waveform to set trim points, or use the sliders below for precise control.
          </div>
          
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            onClick={handleCanvasClick}
            style={{ 
              border: '2px solid #dee2e6', 
              cursor: 'pointer', 
              width: '100%', 
              maxWidth: '600px',
              display: 'block',
              margin: '10px 0',
              borderRadius: '4px',
              backgroundColor: '#fff'
            }}
          />
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            alignItems: 'center', 
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                Start Time: {formatTime(trimStart)}
              </label>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={trimStart || 0}
                onChange={handleStartChange}
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                End Time: {formatTime(trimEnd)}
              </label>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={trimEnd || 0}
                onChange={handleEndChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ 
            marginTop: '15px', 
            padding: '15px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
              Selected Duration: {formatTime(Math.max(0, (trimEnd || 0) - (trimStart || 0)))}
            </div>
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              From {formatTime(trimStart)} to {formatTime(trimEnd)}
            </div>
            <button 
              className="btn"
              onClick={trimAudio}
              disabled={
                isTrimming || 
                isLoading || 
                !isFinite(trimEnd) || 
                !isFinite(trimStart) || 
                trimEnd <= trimStart || 
                !duration ||
                !isFinite(duration)
              }
              style={{
                backgroundColor: isTrimming ? '#6c757d' : '#28a745',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '4px',
                cursor: isTrimming ? 'not-allowed' : 'pointer'
              }}
            >
              {isTrimming ? 'Trimming Audio...' : 'Apply Trim'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioTrimmer;