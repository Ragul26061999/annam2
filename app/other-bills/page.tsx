'use client';

import { Suspense } from 'react';
import OtherBills from '../../src/pages/OtherBills';

export default function OtherBillsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OtherBills />
    </Suspense>
  );
}
