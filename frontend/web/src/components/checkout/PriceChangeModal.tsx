'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';

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

export const PriceChangeModal: React.FC<PriceChangeModalProps> = ({
  isOpen,
  previousAmount,
  previousCurrency = 'EUR',
  currentAmount,
  currentCurrency = 'EUR',
  isProcessing = false,
  onAccept,
  onCancel,
}) => {
  const diff =
    previousAmount != null && currentAmount != null
      ? currentAmount - previousAmount
      : null;

  const isIncrease = diff != null && diff > 0;
  const isDecrease = diff != null && diff < 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Actualisation du tarif fournisseur"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: 'transparent',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#555',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isProcessing}
            className="btn-booking"
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#fff',
            }}
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                <span>Validation...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check-circle" />
                <span>Accepter le nouveau tarif</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: isIncrease ? '#fff3e0' : '#e8f5e9',
            color: isIncrease ? '#e65100' : '#2e7d32',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            marginBottom: '1rem',
          }}
        >
          <i className={isIncrease ? 'fas fa-chart-line' : 'fas fa-tags'} />
        </div>
        <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.5' }}>
          La disponibilité et le tarif ont été réévalués en temps réel auprès du fournisseur de voyage.
          Le montant de l&apos;offre a été actualisé :
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          background: 'var(--bg, #f4f6f6)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>
            Ancien tarif
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#777',
              textDecoration: 'line-through',
              marginTop: '0.25rem',
            }}
          >
            {previousAmount != null ? `${previousAmount.toFixed(2)} ${previousCurrency}` : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: '#01796F', textTransform: 'uppercase', fontWeight: 700 }}>
            Nouveau tarif
          </div>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: isIncrease ? '#d32f2f' : '#2e7d32',
              marginTop: '0.25rem',
            }}
          >
            {currentAmount != null ? `${currentAmount.toFixed(2)} ${currentCurrency}` : '—'}
          </div>
        </div>
      </div>

      {diff != null && diff !== 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: isIncrease ? '#fbe9e7' : '#e8f5e9',
            color: isIncrease ? '#c62828' : '#2e7d32',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <i className={isIncrease ? 'fas fa-arrow-up' : 'fas fa-arrow-down'} />
          <span>
            Variation : {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {currentCurrency}
          </span>
        </div>
      )}
    </Modal>
  );
};
