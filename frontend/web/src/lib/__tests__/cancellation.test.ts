import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { apiClient } from '../api-client.ts';
import { bookingService } from '../../services/booking.service.ts';
import { canRequestCancellation, cancellationOutcomeLabel, cancellationResultCopy } from '../cancellation-state.ts';
import type { BookingResponseDto, CancellationStatusDto } from '../../types/booking.types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const base = { bookingReference: 'YUD-K7M4P2Q8', status: 'PAID', productType: 'HOTEL', createdAt: '', updatedAt: '' } as BookingResponseDto;
const outcome = { bookingReference: base.bookingReference, bookingStatus: 'CANCELLED', cancellationStatus: 'CANCELLED',
  refundStatus: 'REFUNDED', policyType: 'FULL', refundAmount: 85, cancellationFee: 0,
  currency: 'EUR', message: '', requestedAt: '', processedAt: '', refundedAt: '' } as CancellationStatusDto;

describe('Phase 51 cancellation client contract', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => apiClient.setAccessToken('phase51-demo-jwt'));
  afterEach(() => { globalThis.fetch = originalFetch; apiClient.setAccessToken(null); });

  it('reads owner policy and status through Gateway', async () => {
    const urls: string[] = [];
    globalThis.fetch = async input => { urls.push(String(input)); return new Response('{}', { status: 200 }); };
    await bookingService.getCancellationPolicy(base.bookingReference);
    await bookingService.getCancellation(base.bookingReference);
    assert.match(urls[0], /(?::8888|\/api)\/bookings\/YUD-K7M4P2Q8\/cancellation-policy$/);
    assert.match(urls[1], /(?::8888|\/api)\/bookings\/YUD-K7M4P2Q8\/cancellation$/);
    assert.ok(urls.every(url => !/:8084/.test(url)));
  });

  it('submits only the optional reason, never owner, price, fee or provider state', async () => {
    let body = '';
    let method = '';
    globalThis.fetch = async (_input, init) => { body = String(init?.body); method = init?.method || ''; return new Response('{}', { status: 200 }); };
    await bookingService.cancelBooking(base.bookingReference, '  Changed plans  ');
    assert.equal(method, 'POST');
    assert.deepEqual(JSON.parse(body), { reason: 'Changed plans' });
  });

  it('hides action after a request and distinguishes failure/refund states', () => {
    assert.equal(canRequestCancellation(base), true);
    assert.equal(canRequestCancellation({ ...base, cancellation: outcome }), false);
    assert.equal(canRequestCancellation({ ...base, status: 'EXPIRED' }), false);
    assert.equal(cancellationOutcomeLabel({ ...outcome, refundStatus: 'REFUND_FAILED' }), 'Échec du remboursement');
    assert.equal(cancellationOutcomeLabel({ ...outcome, cancellationStatus: 'PROVIDER_FAILED' }), 'Échec de l’annulation');
    assert.match(cancellationResultCopy({ ...outcome, refundStatus: 'PENDING' }), /en cours/);
    assert.match(cancellationResultCopy({ ...outcome, refundStatus: 'REFUND_FAILED' }), /échoué/);
  });

  it('keeps confirmation gated by server policy and prevents rapid duplicate clicks', () => {
    const dialog = readFileSync(resolve(here, '../../app/(user)/account/bookings/CancellationDialog.tsx'), 'utf8');
    assert.match(dialog, /policy\.data\?\.cancellable/);
    assert.match(dialog, /submitting\.current/);
    assert.match(dialog, /mutation\.isPending/);
    assert.match(dialog, /Vérification des conditions d’annulation/);
    assert.match(dialog, /Remboursement intégral/);
    assert.match(dialog, /Remboursement partiel/);
    assert.match(dialog, /n’est pas remboursable/);
    assert.match(dialog, /ne peuvent pas être déterminées automatiquement/);
    assert.match(dialog, /invalidateQueries\(\{ queryKey: queryKeys\.booking\.my\(\)/);
  });
});
