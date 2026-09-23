'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookingDossierPath } from '@/lib/confirmation-state';

function LegacyBookingReferenceRedirect() {
  const params = useParams();
  const router = useRouter();
  const reference = typeof params?.reference === 'string' ? params.reference : '';

  useEffect(() => {
    if (reference) router.replace(getBookingDossierPath(reference));
  }, [reference, router]);

  return <main className="flex min-h-[75vh] items-center justify-center">
    <i className="fas fa-spinner fa-spin text-2xl text-teal-700" aria-label="Redirection vers le dossier" />
  </main>;
}

export default function BookingReferencePage() {
  return <LegacyBookingReferenceRedirect />;
}
