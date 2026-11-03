import React from 'react';
import { AlertTriangleIcon, CheckCircleIcon, XIcon } from './Icons';

export const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all ${
        isError
          ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
          : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isError ? (
          <AlertTriangleIcon className="w-5 h-5 text-rose-400" />
        ) : (
          <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
        )}
      </div>
      <div className="flex-1 font-medium leading-relaxed">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md transition"
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
