'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { BookingConfirmationDossier } from '@/components/checkout/BookingConfirmationDossier';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export default function BookingDossierPage() {
  const params = useParams();
  const reference = typeof params?.reference === 'string' ? params.reference : '';

  return <ProtectedRoute>
    <BookingConfirmationDossier reference={reference} />
  </ProtectedRoute>;
}
