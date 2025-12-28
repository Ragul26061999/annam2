'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import OutpatientRegistrationForm from '../../../components/OutpatientRegistrationForm';

export default function OutpatientRegisterPage() {
  const router = useRouter();

  const handleCancel = () => {
    router.push('/patients');
  };

  const handleComplete = (result: any) => {
    console.log('Registration complete in page:', result);
    // The form handles its own success state, but we could do more here
  };

  return (
    <div className="min-h-screen bg-orange-50/30 py-8 px-6 print:bg-white print:p-0">
      <div className="w-full max-w-full mx-auto print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/outpatient"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Outpatient Menu
          </Link>
          <div className="text-sm text-gray-400 font-medium">Annam Hospital • Outpatient Department</div>
        </div>

        <OutpatientRegistrationForm
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}