"use client";

import React, { useState } from "react";
import { ExecutiveReportSummary } from "@/services/executiveAgent";
import { ExecutivePdfReport } from "./ExecutivePdfReport";
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  Info,
  Sparkles
} from "lucide-react";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ExecutiveReportSummary;
  onDownloadCsv?: () => void;
  onDownloadJson?: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  summary,
  onDownloadCsv,
  onDownloadJson,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyNarrative = () => {
    navigator.clipboard.writeText(summary.narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // Print window directly
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Top Floating Control Bar (Hidden during print) */}
      <div className="no-print bg-[#1F2937] text-white border-b border-gray-700 px-6 py-3 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1F8A70] flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">
                Executive FinOps & ESG Briefing Preview
              </h2>
              <span className="bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Strict 2-Page Budget
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Account: {summary.account.name} ({summary.account.providerAccountId}) • Print-ready A4/Letter
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyNarrative}
            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-600"
            title="Copy synthesized AI briefing to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-300" />
                <span>Copy AI Brief</span>
              </>
            )}
          </button>

          {onDownloadCsv && (
            <button
              type="button"
              onClick={onDownloadCsv}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-600"
              title="Download raw CSV inventory"
            >
              <Download className="w-3.5 h-3.5 text-gray-300" />
              <span>CSV Ledger</span>
            </button>
          )}

          {onDownloadJson && (
            <button
              type="button"
              onClick={onDownloadJson}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-600"
              title="Download telemetry JSON"
            >
              <Download className="w-3.5 h-3.5 text-gray-300" />
              <span>JSON Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-[#1F8A70] hover:bg-[#186D58] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ml-2"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Helper Banner (Hidden during print) */}
      <div className="no-print bg-[#FFFBEB] border-b border-[#FDE68A] text-[#92400E] px-6 py-1.5 text-center text-xs flex items-center justify-center gap-2 shrink-0">
        <Info className="w-3.5 h-3.5 text-[#B45309]" />
        <span>
          <strong>Print Tip:</strong> In your browser print dialog, select <strong>Destination: Save as PDF</strong> and ensure <strong>Pages: All (1-2)</strong>.
        </span>
      </div>

      {/* Main Preview Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-gray-900/60 print:p-0 print:bg-white print:overflow-visible">
        <div className="w-full max-w-[840px] bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
          <ExecutivePdfReport summary={summary} />
        </div>
      </div>
    </div>
  );
};
