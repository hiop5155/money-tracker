import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all duration-300">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-200">
                <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">處理中...</span>
            </div>
        </div>
    );
};

export default LoadingOverlay;
