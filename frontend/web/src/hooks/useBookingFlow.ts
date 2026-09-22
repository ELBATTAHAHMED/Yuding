'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { bookingService } from '@/services/booking.service';
import {
  BookingPricingResponseDto,
  BookingProductType,
  BookingRevalidationResponseDto,
} from '@/types/booking.types';

export type BookingFlowStage =
  | 'idle'
  | 'creating_draft'
  | 'revalidating'
  | 'price_changed'
  | 'pricing'
  | 'redirecting'
  | 'error';

export interface UseBookingFlowReturn {
  stage: BookingFlowStage;
  isProcessing: boolean;
  statusMessage: string | null;
  error: string | null;
  bookingReference: string | null;
  revalidationData: BookingRevalidationResponseDto | null;
  pricingData: BookingPricingResponseDto | null;
  isPriceChangeModalOpen: boolean;
  startBookingFlow: (params: {
    productType: BookingProductType;
    selectionRef?: string;
  }) => Promise<void>;
  handleAcceptPriceChange: () => Promise<void>;
  handleCancelPriceChange: () => void;
  resetFlow: () => void;
}

export function useBookingFlow(): UseBookingFlowReturn {
  const router = useRouter();
  const [stage, setStage] = useState<BookingFlowStage>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [revalidationData, setRevalidationData] = useState<BookingRevalidationResponseDto | null>(null);
  const [pricingData, setPricingData] = useState<BookingPricingResponseDto | null>(null);
  const [isPriceChangeModalOpen, setIsPriceChangeModalOpen] = useState(false);

  const resetFlow = useCallback(() => {
    setStage('idle');
    setStatusMessage(null);
    setError(null);
    setBookingReference(null);
    setRevalidationData(null);
    setPricingData(null);
    setIsPriceChangeModalOpen(false);
  }, []);

  /**
   * Completes authoritative pricing and navigation to the payment page.
   * Strictly avoids passing any price or currency parameters in the URL.
   */
  const proceedToPricingAndPayment = useCallback(
    async (reference: string) => {
      setStage('pricing');
      setStatusMessage('Calcul de la tarification autoritaire certifiée...');

      const pricing = await bookingService.createAuthoritativePricing(reference);
      setPricingData(pricing);

      if (pricing.canProceedToPayment) {
        setStage('redirecting');
        setStatusMessage('Redirection vers la page de règlement sécurisé...');
        // Strictly navigate to /booking/{reference}/payment without price parameters in URL
        router.push(`/booking/${reference}/payment`);
      } else {
        setStage('error');
        setError(
          pricing.message ||
            'Ce dossier ne peut pas faire l’objet d’un règlement en ligne immédiat.'
        );
      }
    },
    [router]
  );

  /**
   * Main booking initiation sequence:
   * 1. Create DRAFT booking + attach immutable OfferSnapshot (POST /bookings).
   * 2. Live read-only provider revalidation (POST /bookings/{reference}/revalidate).
   * 3. Price change acknowledgement dialog if price changed.
   * 4. Authoritative server pricing (POST /bookings/{reference}/pricing).
   * 5. Navigate to /booking/{reference}/payment.
   */
  const startBookingFlow = useCallback(
    async ({
      productType,
      selectionRef,
    }: {
      productType: BookingProductType;
      selectionRef?: string;
    }) => {
      setError(null);
      setRevalidationData(null);
      setPricingData(null);
      setIsPriceChangeModalOpen(false);

      try {
        // Step 1: Create/reuse DRAFT booking with OfferSnapshot
        setStage('creating_draft');
        setStatusMessage('Création du dossier de réservation...');

        const booking = await bookingService.createDraftBooking({
          productType,
          selectionRef: selectionRef?.trim() ? selectionRef.trim() : undefined,
        });

        const reference = booking.bookingReference;
        setBookingReference(reference);

        // Step 2: Phase 36 live provider revalidation
        setStage('revalidating');
        setStatusMessage('Vérification en direct de la disponibilité auprès du fournisseur...');

        const reval = await bookingService.revalidateBooking(reference);
        setRevalidationData(reval);

        // Check availability
        const avail = (reval.availabilityStatus || '').toUpperCase();
        if (avail === 'UNAVAILABLE') {
          setStage('error');
          setError(
            'Cette offre n’est plus disponible auprès du fournisseur. Veuillez sélectionner une autre prestation.'
          );
          return;
        }

        if (avail === 'UNKNOWN' || avail === 'REVALIDATION_UNSUPPORTED') {
          setStage('error');
          setError(
            reval.message ||
              'La disponibilité en direct n’a pas pu être confirmée par le fournisseur.'
          );
          return;
        }

        // Check price change requirement
        const priceStatus = (reval.priceStatus || '').toUpperCase();
        if (priceStatus === 'CHANGED' && reval.requiresPriceConfirmation) {
          setStage('price_changed');
          setStatusMessage('Le tarif a changé. Votre confirmation est requise.');
          setIsPriceChangeModalOpen(true);
          return;
        }

        // Step 3: Authoritative pricing and redirect to payment
        await proceedToPricingAndPayment(reference);
      } catch (err: any) {
        setStage('error');
        const msg =
          err?.message ||
          'Une erreur est survenue lors de la validation du dossier de réservation.';
        setError(msg);
      }
    },
    [proceedToPricingAndPayment]
  );

  /**
   * User accepts price change in modal:
   * 1. Acknowledge price change (POST /bookings/{reference}/revalidation/accept-price-change).
   * 2. Continue to authoritative pricing & payment.
   */
  const handleAcceptPriceChange = useCallback(async () => {
    if (!bookingReference) return;

    try {
      setStatusMessage('Enregistrement de votre accord sur le nouveau tarif...');
      await bookingService.acceptPriceChange(bookingReference);
      setIsPriceChangeModalOpen(false);
      await proceedToPricingAndPayment(bookingReference);
    } catch (err: any) {
      setStage('error');
      setError(
        err?.message ||
          'Impossible d’enregistrer la modification de tarif. Veuillez réessayer.'
      );
      setIsPriceChangeModalOpen(false);
    }
  }, [bookingReference, proceedToPricingAndPayment]);

  const handleCancelPriceChange = useCallback(() => {
    setIsPriceChangeModalOpen(false);
    setStage('error');
    setError('Vous avez refusé le nouveau tarif. La réservation n’a pas été finalisée.');
  }, []);

  const isProcessing =
    stage === 'creating_draft' ||
    stage === 'revalidating' ||
    stage === 'pricing' ||
    stage === 'redirecting';

  return {
    stage,
    isProcessing,
    statusMessage,
    error,
    bookingReference,
    revalidationData,
    pricingData,
    isPriceChangeModalOpen,
    startBookingFlow,
    handleAcceptPriceChange,
    handleCancelPriceChange,
    resetFlow,
  };
}
