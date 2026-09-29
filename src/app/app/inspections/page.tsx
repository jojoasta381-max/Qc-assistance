'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { InspectionWizard } from '@/components/InspectionWizard';
import { FeedbackModal } from '@/components/FeedbackModal';
import { SAMPLE_DIAGRAMS } from '@/data/samples';
import { StandardPreset, QCReport, Discrepancy } from '@/types/qc';
import { Sparkles } from 'lucide-react';

export default function AppInspectionsPage() {
  const router = useRouter();
  const { tenant } = useAuth();
  const [report, setReport] = useState<QCReport>(SAMPLE_DIAGRAMS[0].sampleReport);
  const [activeStandard, setActiveStandard] = useState<StandardPreset>('IPC-WHMA-A-620');
  const [activeFeedbackDiscrepancy, setActiveFeedbackDiscrepancy] = useState<Discrepancy | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(tenant?.quotaUsed ?? 38);
  const [quotaLimit, setQuotaLimit] = useState(tenant?.checkQuota ?? 100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenFeedback = (d: Discrepancy) => {
    setActiveFeedbackDiscrepancy(d);
    setIsFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = (
    id: string,
    status: 'FALSE_POSITIVE',
    note: string,
    category: string
  ) => {
    setReport((prev) => {
      const updated = prev.discrepancies.map((d) => (d.id === id ? { ...d, status } : d));
      return { ...prev, discrepancies: updated };
    });
    showToast(`Marked ${id} as False Positive (${category}). Logged to regression test set.`);
  };

  const handleCheckExecuted = () => {
    setQuotaUsed((prev) => Math.min(prev + 1, quotaLimit));
    showToast('QC Inspection complete! Findings loaded for engineering review.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Main Inspection Wizard Shell */}
      <InspectionWizard
        currentReport={report}
        onUpdateReport={(newRep) => setReport(newRep)}
        activeStandard={activeStandard}
        onChangeStandard={(std) => {
          setActiveStandard(std);
          showToast(`Active inspection standard set to ${std}`);
        }}
        onOpenFeedbackModal={handleOpenFeedback}
        quotaUsed={quotaUsed}
        quotaLimit={quotaLimit}
        onCheckExecuted={handleCheckExecuted}
        onOpenEditor={() => router.push('/app/editor')}
      />

      {/* Regression Feedback Modal */}
      <FeedbackModal
        discrepancy={activeFeedbackDiscrepancy}
        isOpen={isFeedbackModalOpen}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          setActiveFeedbackDiscrepancy(null);
        }}
        onSubmitFeedback={handleSubmitFeedback}
      />
    </div>
  );
}
