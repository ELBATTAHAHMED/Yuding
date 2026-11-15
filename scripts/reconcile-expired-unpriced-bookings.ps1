<#
Reconcile old, expired pending bookings that have neither an offer snapshot nor
any payment. Dry-run by default. The script targets the local Yuding Docker DB;
it never deletes records or fabricates offer details.
#>
[CmdletBinding()]
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$taskContainer = 'yuding-postgres'
function Invoke-TaskSql([string]$sql) {
    $output = @(docker exec $taskContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d yuding -A -t -c $sql)
    if ($LASTEXITCODE -ne 0) { throw 'Database query failed; no further changes were made.' }
    return $output
}

# Queries remain within their respective schemas. A pending booking without a
# snapshot cannot enter the current priced-payment flow, which requires an
# immutable snapshot and quote. We still exclude every historical payment.
$taskCandidates = @(Invoke-TaskSql @'
SELECT b.id FROM booking.bookings b
WHERE b.status = 'PENDING_PAYMENT'
  AND b.expires_at < now() - interval '24 hours'
  AND NOT EXISTS (SELECT 1 FROM booking.offer_snapshots s WHERE s.booking_id = b.id)
ORDER BY b.id;
'@ | Where-Object { $_ -match '^[0-9a-fA-F-]{36}$' })
$taskPaymentIds = @(Invoke-TaskSql 'SELECT DISTINCT booking_id FROM payment.payments;' | Where-Object { $_ -match '^[0-9a-fA-F-]{36}$' })
$taskPayments = [System.Collections.Generic.HashSet[string]]::new([string[]]$taskPaymentIds)
$taskEligible = @($taskCandidates | Where-Object { -not $taskPayments.Contains($_) })
Write-Output "Expired pending bookings without an offer: $($taskCandidates.Count)"
Write-Output "Excluded because a payment exists: $($taskCandidates.Count - $taskEligible.Count)"
Write-Output "Eligible for expiration: $($taskEligible.Count)"
if (-not $Apply) { Write-Output 'Dry run only. Use -Apply to reconcile eligible bookings.'; return }
if ($taskEligible.Count -eq 0) { Write-Output 'No bookings to reconcile.'; return }

$taskIdList = ($taskEligible | ForEach-Object { "'$_'::uuid" }) -join ','
$taskSql = @"
BEGIN;
SET LOCAL lock_timeout = '3s';
-- Stop payment/snapshot inserts while the final eligibility check runs.
LOCK TABLE payment.payments IN SHARE MODE;
LOCK TABLE booking.bookings IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE booking.offer_snapshots IN SHARE MODE;
-- Abort the entire transaction if a payment appeared since the preview.
DO `$reconcile`$ BEGIN
  IF EXISTS (SELECT 1 FROM payment.payments WHERE booking_id IN ($taskIdList)) THEN
    RAISE EXCEPTION 'Payment recorded since preview; reconciliation aborted';
  END IF;
END `$reconcile`$;
WITH changed AS (
  UPDATE booking.bookings b
  SET status = 'EXPIRED', status_changed_at = now(), updated_at = now(), version = b.version + 1
  WHERE b.id IN ($taskIdList)
    AND b.status = 'PENDING_PAYMENT'
    AND b.expires_at < now() - interval '24 hours'
    AND NOT EXISTS (SELECT 1 FROM booking.offer_snapshots s WHERE s.booking_id = b.id)
  RETURNING b.id
), history AS (
  INSERT INTO booking.booking_status_history (booking_id, previous_status, new_status, triggered_by, reason, created_at)
  SELECT id, 'PENDING_PAYMENT', 'EXPIRED', 'local-reconciliation',
         'Expired unpriced booking with no recorded payment', now()
  FROM changed RETURNING booking_id
)
SELECT count(*) FROM history;
COMMIT;
"@
$taskUpdated = @(Invoke-TaskSql $taskSql)
$taskCount = @($taskUpdated | Where-Object { $_ -match '^\d+$' })
Write-Output "Expired and recorded in booking history: $($taskCount[-1])"
