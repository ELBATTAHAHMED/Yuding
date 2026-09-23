'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBookingDossierPath, getConfirmationReference } from '@/lib/confirmation-state';

function LegacyConfirmationRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = getConfirmationReference(searchParams);

  useEffect(() => {
    if (reference) router.replace(getBookingDossierPath(reference));
  }, [reference, router]);

  return <main className="flex min-h-[75vh] items-center justify-center">
    <i className="fas fa-spinner fa-spin text-2xl text-teal-700" aria-label="Redirection vers le dossier" />
  </main>;
}

export default function BookingConfirmationPage() {
  return <Suspense fallback={<main className="flex min-h-[75vh] items-center justify-center"><i className="fas fa-spinner fa-spin text-2xl text-teal-700" /></main>}>
    <LegacyConfirmationRedirect />
  </Suspense>;
}
