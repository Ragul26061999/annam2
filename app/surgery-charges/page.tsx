'use client';

import { Suspense } from 'react';
import SurgeryCharges from '../../src/pages/SurgeryCharges';

export default function SurgeryChargesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurgeryCharges />
    </Suspense>
  );
}
