'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './PriceChangeModal.module.css';

export interface PriceChangeModalProps {
  isOpen: boolean;
  previousAmount?: number | null;
  previousCurrency?: string | null;
  currentAmount?: number | null;
  currentCurrency?: string | null;
  isProcessing?: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

function formatPrice(amount?: number | null, currency?: string | null) {
  if (amount == null) return '—';
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency || 'EUR'}`; }
}

export const PriceChangeModal: React.FC<PriceChangeModalProps> = ({
  isOpen, previousAmount, previousCurrency = 'EUR', currentAmount, currentCurrency = 'EUR',
  isProcessing = false, onAccept, onCancel,
}) => {
  const difference = previousAmount != null && currentAmount != null && previousCurrency === currentCurrency
    ? currentAmount - previousAmount : null;

  return <Modal isOpen={isOpen} onClose={onCancel} dismissible={!isProcessing} title="Le tarif a été actualisé" size="md" footer={<>
    <button type="button" className={styles.cancel} onClick={onCancel} disabled={isProcessing}>Annuler</button>
    <button type="button" className={styles.accept} onClick={onAccept} disabled={isProcessing}>
      {isProcessing ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Validation…</> : 'Accepter le nouveau tarif'}
    </button>
  </>}>
    <p className={styles.intro}>Le fournisseur a revérifié la disponibilité et le prix de votre voyage. Vérifiez le nouveau montant avant de continuer.</p>
    <div className={styles.prices}>
      <div><span>Ancien tarif</span><strong className={styles.previous}>{formatPrice(previousAmount, previousCurrency)}</strong></div>
      <i className="fas fa-arrow-right" aria-hidden="true" />
      <div><span>Nouveau tarif</span><strong className={styles.current}>{formatPrice(currentAmount, currentCurrency)}</strong></div>
    </div>
    {difference != null && difference !== 0 && <p className={`${styles.change} ${difference > 0 ? styles.increase : styles.decrease}`}>
      {difference > 0 ? 'Hausse' : 'Baisse'} de {formatPrice(Math.abs(difference), currentCurrency)}
    </p>}
  </Modal>;
};
