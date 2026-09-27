'use client';

import React, { useState } from 'react';
import { Discrepancy } from '@/types/qc';
import { X, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
  discrepancy: Discrepancy | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (id: string, status: 'FALSE_POSITIVE', note: string, category: string) => void;
}

const CATEGORIES = [
  'Internal Customer SOP Variance',
  'Drawing / CAD Font Artifact',
  'Alternate Qualified Standard Approved',
  'Pre-approved Pilot Run Concession',
  'Symbol Recognition Tolerance Issue',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  discrepancy,
  isOpen,
  onClose,
  onSubmitFeedback,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [note, setNote] = useState<string>('');

  if (!isOpen || !discrepancy) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitFeedback(discrepancy.id, 'FALSE_POSITIVE', note, selectedCategory);
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Discrepancy Feedback Loop
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                {discrepancy.id}
              </span>
              <span className="text-xs font-semibold text-rose-400">
                {discrepancy.severity}
              </span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">
              {discrepancy.title}
            </h4>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {discrepancy.plainLanguageExplanation}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Reason for Marking False Positive
            </label>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    selectedCategory === cat
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="accent-cyan-500"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Engineering Notes / Context (Feeds Regression Dataset)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Approved per Engineering Change Order ECO-482. Tolerable for prototype run..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition resize-none placeholder:text-slate-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Save & Update AI Regression Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
