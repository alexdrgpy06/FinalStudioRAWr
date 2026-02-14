import React, { memo } from 'react';
import { Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'PENDING', color: 'text-zinc-600', bg: 'bg-zinc-800', dot: 'bg-zinc-600' },
  processing: { label: 'PROCESSING', color: 'text-blue-400', bg: 'bg-blue-600', dot: 'bg-blue-500', spin: true },
  done: { label: 'DONE', color: 'text-emerald-400', bg: 'bg-emerald-600', dot: 'bg-emerald-500' },
  error: { label: 'ERROR', color: 'text-red-400', bg: 'bg-red-600', dot: 'bg-red-500' },
};

const FileListItem = memo(({ file, isActive, onSelect, onExport }) => {
  const status = STATUS_CONFIG[file.status] || STATUS_CONFIG.pending;

  return (
    <button
      onClick={() => onSelect(file.id)}
      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group/item ${isActive ? 'bg-zinc-800/50 border-blue-500/30 shadow-xl' : 'bg-zinc-900/20 border-transparent hover:bg-zinc-900/40 hover:border-zinc-800'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isActive ? 'bg-blue-600 text-white' : `${status.bg}/20 text-zinc-500 group-hover/item:bg-zinc-700`}`}>
        {status.spin ? (
          <Loader2 size={16} className="animate-spin text-blue-400" />
        ) : file.status === 'done' ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : file.status === 'error' ? (
          <AlertCircle size={16} className="text-red-400" />
        ) : (
          <ImageIcon size={16} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>{file.name}</p>
        <p className={`text-[8px] uppercase tracking-widest font-black mt-1 ${status.color}`}>
          {status.label}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {file.status === 'done' && onExport && (
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); onExport(file); }}
            className="w-6 h-6 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100 cursor-pointer"
            title="Download"
          >
            <Download size={10} />
          </div>
        )}
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
      </div>
    </button>
  );
});

export default FileListItem;
