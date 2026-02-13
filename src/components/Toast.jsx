import React, { useEffect } from 'react';
import { useStudioStore } from '../store';
import { X, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';

const ToastItem = ({ toast }) => {
    const removeToast = useStudioStore(s => s.removeToast);

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast.id, removeToast]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle size={16} className="text-green-500" />;
            case 'error': return <AlertOctagon size={16} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            default: return <Info size={16} className="text-blue-500" />;
        }
    };

    return (
        <div className="flex items-center gap-3 p-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm">
            {getIcon()}
            <p className="text-xs font-bold text-zinc-300 flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
        </div>
    );
};

export const ToastContainer = () => {
    const toasts = useStudioStore(s => s.toasts);

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
            {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
        </div>
    );
};
