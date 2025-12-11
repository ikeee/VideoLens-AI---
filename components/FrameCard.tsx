import React from 'react';
import { VideoFrame, ProcessingStatus } from '../types';
import { PhotoIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface FrameCardProps {
  frame: VideoFrame;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame }) => {
  const [copied, setCopied] = React.useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = () => {
    if (frame.prompt) {
      navigator.clipboard.writeText(frame.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg flex flex-col h-full animate-fadeIn">
      <div className="relative aspect-video bg-black group">
        <img
          src={frame.imageUrl}
          alt={`Frame at ${frame.timestamp}s`}
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          {formatTime(frame.timestamp)}
        </div>
        
        {/* Overlay Status */}
        {frame.status === ProcessingStatus.ANALYZING && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <ArrowPathIcon className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
         {frame.status === ProcessingStatus.ERROR && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <PhotoIcon className="w-4 h-4 text-blue-400" />
            AI 提示词
          </h4>
          {frame.status === ProcessingStatus.COMPLETED && (
            <button
              onClick={copyToClipboard}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              title="复制提示词"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">已复制</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>复制</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300 overflow-y-auto max-h-48 border border-slate-700/50">
          {frame.status === ProcessingStatus.PENDING && (
            <span className="text-slate-500 italic">等待分析...</span>
          )}
          {frame.status === ProcessingStatus.ANALYZING && (
            <span className="text-blue-400 animate-pulse">正在调用 Nano Banana 视觉模型进行分析...</span>
          )}
          {frame.status === ProcessingStatus.ERROR && (
            <span className="text-red-400">错误: {frame.errorMessage || '无法生成描述'}</span>
          )}
          {frame.status === ProcessingStatus.COMPLETED && (
             <p className="whitespace-pre-wrap leading-relaxed text-xs">{frame.prompt}</p>
          )}
        </div>
      </div>
    </div>
  );
};