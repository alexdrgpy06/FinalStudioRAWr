import React, { memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const FileListItem = memo(({ file, isActive, onSelect }) => {
  return (
    <button
        onClick={() => onSelect(file.id)}
        className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group/item ${isActive ? 'bg-zinc-800/50 border-blue-500/30 shadow-xl' : 'bg-zinc-900/20 border-transparent hover:bg-zinc-900/40 hover:border-zinc-800'}`}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 group-hover/item:bg-zinc-700'}`}>
            <ImageIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>{file.name}</p>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mt-1">Pending</p>
        </div>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
    </button>
  );
});

export default FileListItem;
