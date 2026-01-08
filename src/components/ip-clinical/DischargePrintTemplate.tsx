import React from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { IPDischargeSummary } from '../../lib/ipClinicalService';

interface DischargePrintTemplateProps {
  summary: Partial<IPDischargeSummary>;
  patient: any;
  bedAllocation: any;
}

export const DischargePrintTemplate = React.forwardRef<HTMLDivElement, DischargePrintTemplateProps>(
  ({ summary, patient, bedAllocation }, ref) => {
    // Helper to format dates
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '______________________';
      return new Date(dateStr).toLocaleDateString('en-GB'); // DD/MM/YYYY format
    };

    // Use a Portal to render directly into body, bypassing modal nesting
    // This ensures print styles work correctly and aren't affected by parent overflow/hiding
    return createPortal(
      <div ref={ref} className="bg-white text-black print-template hidden print:block print-portal-root">
        <style jsx global>{`
          @media print {
            /* Reset body */
            body {
              margin: 0;
              padding: 0;
              background: white;
              height: auto;
              overflow: visible;
            }
            
            /* Hide EVERYTHING in the body first */
            body > * {
              display: none !important;
            }

            /* But show our portal root */
            body > .print-portal-root {
              display: block !important;
              position: relative;
              top: auto;
              left: auto;
              width: 100%;
              height: auto;
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: black;
              background: white;
              z-index: 9999;
              visibility: visible;
            }

            /* Explicitly hide standard app roots just in case */
            #root, #modal-root {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 20mm;
            }

            .section-break {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 2rem;
            }
            
            .force-break {
              break-before: page;
              page-break-before: always;
            }
          }
        `}</style>

        {/* Header Block */}
        <div className="section-break">
          <div className="flex flex-col items-center justify-center mb-2">
            {/* Logo */}
            <div className="h-28 w-full flex items-center justify-center mb-2">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,</p>
              <p className="text-sm font-semibold text-gray-800">Thoothukudi - 628 216.</p>
              <div className="text-sm text-gray-800 mt-1 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4 pb-2 border-b-2 border-gray-800">
            <h2 className="text-lg font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              DISCHARGE SUMMARY
            </h2>
          </div>
        </div>

        {/* Patient Identification */}
        <div className="section-break mb-8">
          <div className="flex gap-8 text-sm font-medium pt-4">
            {/* Left Column */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-24 shrink-0">Name :</span>
                <span className="flex-1 uppercase border-b border-dotted border-gray-400 pb-1">{patient?.name}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-24 shrink-0 mt-1">Address :</span>
                <span className="flex-1 min-h-[48px] whitespace-pre-wrap border-b border-dotted border-gray-400 pb-1">{patient?.address || ''}</span>
              </div>
              <div className="flex items-baseline mt-auto">
                <span className="font-bold w-24 shrink-0">Consultant :</span>
                <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">{summary.consultant_name}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">
                  {patient?.age || '__'} Yrs / {patient?.gender || '__'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-baseline flex-1">
                    <span className="font-bold w-20 shrink-0">O.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{patient?.patient_id}</span>
                 </div>
                 <div className="flex items-baseline flex-1 ml-4">
                    <span className="font-bold w-16 shrink-0 text-right pr-2">I.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{bedAllocation?.ip_number}</span>
                 </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Admission :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(bedAllocation?.admission_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Surgery :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{summary.surgery_date ? formatDate(summary.surgery_date) : '-'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Discharge :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(summary.discharge_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Content - Continuous Flow */}
        <div className="space-y-8">
          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Presenting Complaint :</h3>
            <div className="whitespace-pre-wrap text-justify leading-relaxed">{summary.presenting_complaint}</div>
          </div>
          
          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Physical Findings :</h3>
            <div className="whitespace-pre-wrap text-justify leading-relaxed">{summary.physical_findings}</div>
          </div>

          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Investigations :</h3>
            <div className="whitespace-pre-wrap text-justify leading-relaxed">{summary.investigations}</div>
          </div>

          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Final Diagnosis :</h3>
            <div className="whitespace-pre-wrap text-justify font-semibold leading-relaxed">{summary.final_diagnosis}</div>
          </div>

          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Management / Procedure / Treatment :</h3>
            <div className="whitespace-pre-wrap text-justify leading-relaxed border border-gray-200 p-4 rounded">
              {summary.treatment_given}
            </div>
          </div>

          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Condition at Discharge :</h3>
            <div className="flex flex-wrap gap-6 py-2">
              {['Cured', 'Improved', 'Referred', 'Dis. at Request', 'Lama', 'Absconded'].map((cond) => (
                <div key={cond} className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black flex items-center justify-center relative">
                    {summary.condition_at_discharge === cond && (
                      <Check className="w-6 h-6 text-black absolute -top-1 -left-0.5" strokeWidth={4} />
                    )}
                  </div>
                  <span className="font-medium">{cond}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-break">
            <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Follow Up Advice :</h3>
            <div className="whitespace-pre-wrap text-justify leading-relaxed">
              {summary.follow_up_advice}
            </div>
          </div>

          <div className="section-break mt-8">
            <div className="flex items-center gap-2">
              <span className="font-bold">Review on :</span>
              <span className="border-b-2 border-dotted border-gray-400 min-w-[200px] inline-block text-center font-bold">
                {formatDate(summary.review_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Footer - Always keep together */}
        <div className="section-break mt-16">
          <div className="flex justify-end">
            <div className="text-center min-w-[250px]">
              <div className="h-16 flex items-end justify-center pb-2">
                {/* Digital Signature Placeholder */}
                {summary.status === 'final' && <span className="font-script text-xl italic text-blue-900">{summary.consultant_name}</span>}
              </div>
              <div className="border-t-2 border-gray-800 pt-2">
                <p className="font-bold text-sm uppercase">Signature of Doctor</p>
                {summary.finalized_at && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Finalized: {new Date(summary.finalized_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>,
      document.body
    );
  }
);

DischargePrintTemplate.displayName = 'DischargePrintTemplate';
