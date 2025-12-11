import React, { useRef } from 'react';
import { ArrowUpTrayIcon, FilmIcon } from '@heroicons/react/24/outline';

interface UploaderProps {
  onFileSelected: (file: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelected(file);
      } else {
        alert('请上传视频文件');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto mt-10 p-10 border-2 border-dashed border-slate-600 rounded-2xl bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        accept="video/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-400">
        <div className="p-4 bg-slate-700/50 rounded-full mb-4 group-hover:bg-blue-500/20 transition-colors">
            <ArrowUpTrayIcon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-semibold text-slate-200">点击或拖拽上传视频</h3>
        <p className="mt-2 text-sm text-slate-500">支持 MP4, WebM, MOV 等格式</p>
        <div className="mt-6 flex items-center gap-2 text-xs bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
            <FilmIcon className="w-4 h-4" />
            <span>自动逐帧拆解 + Gemini Nano Banana 分析</span>
        </div>
      </div>
    </div>
  );
};