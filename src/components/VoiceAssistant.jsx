import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader, Eye, EyeOff, AlertCircle, RefreshCw, X, Send } from 'lucide-react';
import { animateOrb } from '../utils/animation.js';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [response, setResponse] = useState({ response: '', links: [], media_links: [], personal_info: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResponse, setShowResponse] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('response');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [latency, setLatency] = useState(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const maxRecordTimeoutRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const requestStartTimeRef = useRef(null);

  // Initialize WebSocket
  useEffect(() => {
    websocketRef.current = new WebSocket('ws://localhost:8000/ws');

    websocketRef.current.onopen = () => {
      console.log('WebSocket connected');
      setError('');
    };

    websocketRef.current.onmessage = async (event) => {
      try {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);
        setTranscript(data.transcript || '');
        setResponse(data.response || { response: '', links: [], media_links: [], personal_info: [] });
        setIsProcessing(data.segment_index === -1);

        // Calculate latency for audio queries
        if (requestStartTimeRef.current && data.segment_index === -1) {
          const endTime = performance.now();
          const latencyMs = endTime - requestStartTimeRef.current;
          console.log(`Audio query latency: ${latencyMs.toFixed(2)} ms`);
          setLatency((latencyMs / 1000).toFixed(2)); // Convert to seconds, 2 decimal places
          requestStartTimeRef.current = null;
        }

        if (data.audio_segment && !data.is_last_segment) {
          audioQueueRef.current.push(data.audio_segment);
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Error processing server response. Please try again.');
        setLatency(null);
      }
    };

    websocketRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setError('WebSocket connection lost. Please refresh the page.');
      setIsProcessing(false);
      setIsListening(false);
      setIsPlaying(false);
      setLatency(null);
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Error connecting to server. Please try again.');
      setIsProcessing(false);
      setIsListening(false);
      setIsPlaying(false);
      setLatency(null);
    };

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Orb animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const cleanup = animateOrb(canvas, isListening);
      return cleanup;
    }
  }, [isListening]);

  // Play audio segments sequentially
  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      return;
    }

    setIsPlaying(true);
    isPlayingRef.current = true;
    const audioSegment = audioQueueRef.current.shift();
    try {
      const audioBlob = await fetch(`data:audio/wav;base64,${audioSegment}`).then(res => res.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        playNextAudio();
      };
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Error playing assistant response. Please try again.');
      setIsPlaying(false);
      isPlayingRef.current = false;
      audioQueueRef.current = [];
      currentAudioRef.current = null;
      setLatency(null);
    }
  };

  // Stop all audio playback
  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  // Check MediaRecorder and microphone availability
  const isMediaRecorderSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  };

  const checkMicrophoneAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      if (audioInputs.length === 0) {
        return { available: false, message: 'No microphone detected. Please connect a microphone and refresh the page.' };
      }
      return { available: true, message: '' };
    } catch (error) {
      console.error('Error checking devices:', error);
      return { available: false, message: 'Error accessing audio devices. Please ensure a microphone is connected and try again.' };
    }
  };

  // Get browser-specific permission instructions
  const getPermissionInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) {
      return 'Please enable microphone permissions in Chrome by clicking the lock icon in the address bar, setting "Microphone" to "Allow", and refreshing the page.';
    } else if (userAgent.includes('firefox')) {
      return 'Please enable microphone permissions in Firefox by clicking the permissions icon in the address bar, allowing microphone access, and refreshing the page.';
    } else if (userAgent.includes('safari')) {
      return 'Please enable microphone permissions in Safari by going to Safari > Settings > Websites > Microphone, setting this site to "Allow", and refreshing the page.';
    } else {
      return 'Please enable microphone permissions in your browser settings and refresh the page. Check your browser’s help documentation for specific instructions.';
    }
  };

  // Handle microphone recording with silence detection
  const handleMicClick = async () => {
    if (isListening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    stopAudioPlayback();

    if (!isMediaRecorderSupported()) {
      setError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
      return;
    }

    const micCheck = await checkMicrophoneAvailability();
    if (!micCheck.available) {
      setError(micCheck.message);
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      if (permissionStatus.state === 'denied') {
        setError(`Microphone access is denied. ${getPermissionInstructions()}`);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;
      const dataArray = new Uint8Array(analyserRef.current.fftSize);

      const mimeType = MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending audio data via WebSocket');
            requestStartTimeRef.current = performance.now(); // Start latency timer
            websocketRef.current.send(base64data);
            setIsProcessing(true);
          } else {
            setError('WebSocket connection is not open. Please try again.');
            setIsProcessing(false);
            setLatency(null);
          }
        };
        reader.readAsDataURL(blob);
        clearTimeout(silenceTimeoutRef.current);
        clearTimeout(maxRecordTimeoutRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      const detectSilence = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        if (average < 10) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
              setIsListening(false);
            }
          }, 8000); // 8 seconds silence timeout
        } else {
          clearTimeout(silenceTimeoutRef.current);
        }
        if (isListening) {
          requestAnimationFrame(detectSilence);
        }
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      setTranscript('Listening...');
      setError('');
      detectSilence();

      maxRecordTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 40000); // 40 seconds max recording

    } catch (error) {
      console.error('Error accessing microphone:', error);
      let errorMessage = 'Unable to access microphone. ';
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += getPermissionInstructions();
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is in use by another application or not accessible. Please close other apps using the microphone and try again.';
      } else {
        errorMessage += 'An unexpected error occurred. Please ensure a microphone is connected, permissions are granted, and try again.';
      }
      setError(errorMessage);
      setIsListening(false);
      setLatency(null);
    }
  };

  // Handle text input submission
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) {
      setError('Please enter a query.');
      setLatency(null);
      return;
    }

    stopAudioPlayback();
    setTranscript(textInput);
    setIsProcessing(true);
    setError('');
    setLatency(null); // Reset latency

    try {
      console.log('Sending POST request to /text_query with query:', textInput);
      requestStartTimeRef.current = performance.now(); // Start latency timer
      const response = await fetch('http://localhost:8000/text_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: textInput }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Text query failed:', response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Invalid response format from server');
      }
      const endTime = performance.now();
      const latencyMs = endTime - requestStartTimeRef.current;
      console.log(`Text query latency: ${latencyMs.toFixed(2)} ms`);
      setLatency((latencyMs / 1000).toFixed(2)); // Convert to seconds, 2 decimal places
      requestStartTimeRef.current = null;
      console.log('Received response:', data);
      setResponse(data);
      setIsProcessing(false);
      setTextInput('');
    } catch (error) {
      console.error('Error sending text query:', error);
      setError(`Failed to process text query: ${error.message}. Please check if the server is running on http://localhost:8000 and try again.`);
      setIsProcessing(false);
      setLatency(null);
    }
  };

  // Handle retry button click
  const handleRetryClick = () => {
    setError('');
    setLatency(null);
    handleMicClick();
  };

  // Handle media click for lightbox
  const handleMediaClick = (media) => {
    setSelectedMedia(media);
  };

  // Close lightbox
  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  // Determine if the media is a video
  const isVideo = (url) => {
    return /\.(mp4|webm|ogg)$/i.test(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Header with Links */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            AI Voice Secretary
          </h1>
          <div className="flex space-x-4">
            <a
              href="https://github.com/abdullah-khaled0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm sm:text-base font-medium"
            >
              GitHub
            </a>
            <a
              href="https://abdullah-khaled0.github.io/portfolio-react/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm sm:text-base font-medium"
            >
              Portfolio
            </a>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <canvas ref={canvasRef} className="w-32 h-32 sm:w-48 sm:h-48" />
            <button
              onClick={handleMicClick}
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full transition-all duration-300 ${
                isListening
                  ? 'bg-blue-500 text-white'
                  : isPlaying
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-600'
              } hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop listening' : isPlaying ? 'Stop and listen again' : 'Start listening'}
              disabled={isProcessing}
            >
              <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        </div>

        {/* Text Input Form */}
        <div className="mb-6">
          <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask the assistant something..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Submit text query"
              disabled={isProcessing}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 text-sm sm:text-base">{error}</p>
                <button
                  onClick={handleRetryClick}
                  className="mt-2 flex items-center text-blue-600 hover:text-blue-800 focus:outline-none text-sm sm:text-base"
                  aria-label="Retry microphone access"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Transcript</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {transcript || 'Click the microphone or type to start interacting'}
            </p>
            <p className="text-gray-600 text-sm sm:text-base mt-2">
              Response time: {latency ? `${latency} seconds` : 'Not available'}
            </p>
          </div>

          {isProcessing && (
            <div className="flex justify-center">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}

          {response.response && !isProcessing && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-blue-700">Response</h2>
                <button
                  onClick={() => setShowResponse(!showResponse)}
                  className="text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label={showResponse ? 'Hide response' : 'Show response'}
                >
                  {showResponse ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div
                className={`transition-all duration-300 ${
                  showResponse ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                } overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100`}
              >
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    className={`px-3 py-2 text-sm font-medium flex-1 text-center ${
                      activeTab === 'response'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                    onClick={() => setActiveTab('response')}
                  >
                    Response
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium flex-1 text-center ${
                      activeTab === 'links'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                    onClick={() => setActiveTab('links')}
                  >
                    Links
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium flex-1 text-center ${
                      activeTab === 'media'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                    onClick={() => setActiveTab('media')}
                  >
                    Media
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium flex-1 text-center ${
                      activeTab === 'personal'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                    onClick={() => setActiveTab('personal')}
                  >
                    Personal Info
                  </button>
                </div>
                {activeTab === 'response' && (
                  <p className="text-gray-800 text-sm sm:text-base">{response.response}</p>
                )}
                {activeTab === 'links' && (
                  <ul className="text-gray-800 space-y-2 text-sm sm:text-base">
                    {response.links.length > 0 ? (
                      response.links.map((link, index) => (
                        <li key={index}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {link.platform}
                          </a>
                        </li>
                      ))
                    ) : (
                      <p>No links available.</p>
                    )}
                  </ul>
                )}
                {activeTab === 'media' && (
                  <div className="text-gray-800">
                    {response.media_links.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {response.media_links.map((media, index) => (
                          isVideo(media) ? (
                            <video
                              key={index}
                              src={media}
                              controls
                              className="w-full h-32 sm:h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity duration-200"
                              onClick={() => handleMediaClick(media)}
                              onError={(e) => {
                                console.error(`Failed to load video: ${media}`);
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <img
                              key={index}
                              src={media}
                              alt={`Media ${index + 1}`}
                              className="w-full h-32 sm:h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity duration-200"
                              onClick={() => handleMediaClick(media)}
                              onError={(e) => {
                                console.error(`Failed to load image: ${media}`);
                                e.target.style.display = 'none';
                              }}
                            />
                          )
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base">No media available. Try asking about a specific project.</p>
                    )}
                  </div>
                )}
                {activeTab === 'personal' && (
                  <ul className="text-gray-800 space-y-2 text-sm sm:text-base">
                    {response.personal_info.length > 0 ? (
                      response.personal_info.map((info, index) => (
                        <li key={index}>
                          <span className="font-semibold">{info.type}:</span>{' '}
                          {info.type === 'Phone' ? (
                            <a
                              href={info.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {info.value}
                            </a>
                          ) : (
                            <span>{info.value}</span>
                          )}
                        </li>
                      ))
                    ) : (
                      <p>No personal information available. Try asking for contact details.</p>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox for media preview */}
        {selectedMedia && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="relative max-w-4xl w-full p-4">
              <button
                onClick={closeLightbox}
                className="absolute top-2 right-2 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close media preview"
              >
                <X className="w-6 h-6" />
              </button>
              {isVideo(selectedMedia) ? (
                <video
                  src={selectedMedia}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                  onError={(e) => {
                    console.error(`Failed to load full-size video: ${selectedMedia}`);
                    e.target.style.display = 'none';
                    setError('Failed to load video preview.');
                  }}
                />
              ) : (
                <img
                  src={selectedMedia}
                  alt="Full-size preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                  onError={(e) => {
                    console.error(`Failed to load full-size image: ${selectedMedia}`);
                    e.target.style.display = 'none';
                    setError('Failed to load image preview.');
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;