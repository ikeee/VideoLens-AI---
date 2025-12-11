import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Uploader } from './components/Uploader';
import { FrameCard } from './components/FrameCard';
import { VideoFrame, ProcessingStatus, AnalysisConfig } from './types';
import { generateImagePrompt } from './services/geminiService';
import { Cog6ToothIcon, PlayIcon, StopIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Configuration State
  const [config, setConfig] = useState<AnalysisConfig>({
    interval: 3, // Default to capture every 3 seconds
    customInstructions: ''
  });

  // Refs for video processing
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up URL on unmount or file change
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoSrc(url);
    setFrames([]);
    setProgress(0);
    setIsProcessing(false);
  };

  const reset = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoFile(null);
    setVideoSrc(null);
    setFrames([]);
    setProgress(0);
    setIsProcessing(false);
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
  };

  const processFrame = useCallback(async (frame: VideoFrame) => {
    try {
        setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: ProcessingStatus.ANALYZING } : f));
        
        const prompt = await generateImagePrompt(frame.imageUrl, config.customInstructions);
        
        setFrames(prev => prev.map(f => f.id === frame.id ? { 
            ...f, 
            status: ProcessingStatus.COMPLETED, 
            prompt 
        } : f));

    } catch (error: any) {
        setFrames(prev => prev.map(f => f.id === frame.id ? { 
            ...f, 
            status: ProcessingStatus.ERROR, 
            errorMessage: error.message 
        } : f));
    }
  }, [config.customInstructions]);

  const startAnalysis = async () => {
    if (!videoSrc) return;

    setIsProcessing(true);
    setFrames([]);
    setProgress(0);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
        alert("Canvas context initialization failed");
        return;
    }

    video.src = videoSrc;
    video.muted = true;
    
    // Wait for metadata to know duration
    await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
    });

    const duration = video.duration;
    const interval = Math.max(1, config.interval);
    const totalFrames = Math.floor(duration / interval);
    let capturedCount = 0;

    // Phase 1: Capture Frames
    for (let time = 0; time < duration; time += interval) {
        if (signal.aborted) break;

        // Seek
        video.currentTime = time;
        await new Promise((resolve) => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve(true);
            };
            video.addEventListener('seeked', onSeeked);
        });

        // Draw
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Downscale large images to avoid hitting token limits or payload limits quickly
        // keeping aspect ratio, max width 1024
        const MAX_WIDTH = 1024;
        let drawWidth = video.videoWidth;
        let drawHeight = video.videoHeight;
        
        if (drawWidth > MAX_WIDTH) {
            const scale = MAX_WIDTH / drawWidth;
            drawWidth = MAX_WIDTH;
            drawHeight = drawHeight * scale;
            canvas.width = drawWidth;
            canvas.height = drawHeight;
        }

        ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);

        const newFrame: VideoFrame = {
            id: crypto.randomUUID(),
            timestamp: time,
            imageUrl,
            prompt: null,
            status: ProcessingStatus.PENDING
        };

        setFrames(prev => [...prev, newFrame]);
        capturedCount++;
        setProgress((capturedCount / totalFrames) * 50); // First 50% is capturing
    }
  };
  
  // UseEffect to trigger analysis strictly SEQUENTIALLY
  useEffect(() => {
    if (!isProcessing) return;
    if (abortControllerRef.current?.signal.aborted) return;

    // Check if ANY frame is currently being analyzed. If so, DO NOT start another one.
    const isAnalyzing = frames.some(f => f.status === ProcessingStatus.ANALYZING);
    if (isAnalyzing) return;

    const pendingFrame = frames.find(f => f.status === ProcessingStatus.PENDING);
    
    if (pendingFrame) {
        // Add a 1s delay before processing the next frame to help with rate limits
        const timer = setTimeout(() => {
             processFrame(pendingFrame);
        }, 1000);
        return () => clearTimeout(timer);
    } else {
        // Check if we are done capturing and analyzing
        const allCompleted = frames.length > 0 && frames.every(f => f.status === ProcessingStatus.COMPLETED || f.status === ProcessingStatus.ERROR);
        if (allCompleted) {
            setIsProcessing(false);
            setProgress(100);
        } else if (frames.length > 0) {
             // Calculate progress for analysis phase (50% to 100%)
             const completedCount = frames.filter(f => f.status === ProcessingStatus.COMPLETED || f.status === ProcessingStatus.ERROR).length;
             const total = frames.length;
             setProgress(50 + (completedCount / total) * 50);
        }
    }
  }, [frames, isProcessing, processFrame]); 


  const stopAnalysis = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      setIsProcessing(false);
  };

  return (
    <div className="min-h-screen pb-20 font-sans text-slate-200">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-lg">V</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              VideoLens AI
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 border border-slate-800 px-2 py-1 rounded">
             Model: Gemini 2.5 Flash Image (Nano Banana)
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!videoFile ? (
            <Uploader onFileSelected={handleFileSelected} />
        ) : (
            <div className="space-y-8 animate-fadeIn">
                {/* Control Panel */}
                <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative w-32 aspect-video bg-black rounded-lg overflow-hidden border border-slate-600">
                                <video src={videoSrc!} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white truncate max-w-[200px]" title={videoFile.name}>
                                    {videoFile.name}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 flex items-center gap-1">
                                    <Cog6ToothIcon className="w-3 h-3" />
                                    采样间隔 (秒)
                                </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="60"
                                    value={config.interval}
                                    onChange={(e) => setConfig({...config, interval: parseInt(e.target.value) || 3})}
                                    disabled={isProcessing}
                                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 w-24 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div className="flex items-end gap-2">
                                {!isProcessing ? (
                                    <button 
                                        onClick={startAnalysis}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                                    >
                                        <PlayIcon className="w-5 h-5" />
                                        开始分析
                                    </button>
                                ) : (
                                    <button 
                                        onClick={stopAnalysis}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-medium transition-all"
                                    >
                                        <StopIcon className="w-5 h-5" />
                                        停止
                                    </button>
                                )}
                                <button 
                                    onClick={reset}
                                    disabled={isProcessing}
                                    className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="清除文件"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {frames.length > 0 && (
                        <div className="mt-6">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>进度 ({Math.round(progress)}%)</span>
                                <span>{frames.filter(f => f.status === ProcessingStatus.COMPLETED).length} / {frames.length} 帧已完成</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grid */}
                {frames.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {frames.map((frame) => (
                            <FrameCard key={frame.id} frame={frame} />
                        ))}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}