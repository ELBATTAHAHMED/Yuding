"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { adminReviews } from "@/services/admin-reviews.service";
import { parseTravelContext } from "@/lib/admin-travel";
import { Empty, ErrorState, Loading, money, formatDate } from "@/components/admin/OperationsUI";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { OverviewCharts } from "@/components/admin/OverviewCharts";
import { TravelImage } from "@/components/admin/EntityContext";

const intlNumber = new Intl.NumberFormat("fr-FR");

function CurrencyAmounts({
  amounts,
  available,
  emptyLabel = "—",
}: {
  amounts?: Record<string, number>;
  available: boolean;
  emptyLabel?: string;
}) {
  if (!available) return <span className="dashboard-value-empty">—</span>;
  if (!amounts) return <span className="dashboard-value-empty">{emptyLabel}</span>;
  const entries = Object.entries(amounts).filter(([, val]) => val != null);
  const positive = entries.filter(([, val]) => Number(val) > 0);

  if (!positive.length) {
    if (entries.length > 0) {
      return (
        <span className="dashboard-currency-list">
          {entries.map(([curr, val]) => (
            <span className="dashboard-currency" key={curr}>
              {money(val, curr)}
            </span>
          ))}
        </span>
      );
    }
    return <span className="dashboard-value-empty">{emptyLabel}</span>;
  }

  return (
    <span className="dashboard-currency-list">
      {positive.map(([currency, amount]) => (
        <span className="dashboard-currency" key={currency}>
          {money(amount, currency)}
        </span>
      ))}
    </span>
  );
}

export default function AdminOverviewPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.getAdminStats });
  const bookings = useQuery({
    queryKey: ["admin", "bookings", "recent"],
    queryFn: () => adminService.getBookings({ size: 5 }),
  });
  const payments = useQuery({
    queryKey: ["admin", "payments", "recent"],
    queryFn: () => adminService.getPayments({ size: 5 }),
  });
  const reviewQueue = useQuery({
    queryKey: ["admin", "reviews", "overview-pending"],
    queryFn: () => adminReviews.page({ status: "PENDING_MODERATION", size: 1 }),
  });

  const refreshing = stats.isFetching || bookings.isFetching || payments.isFetching || reviewQueue.isFetching;

  const handleRefresh = () => {
    stats.refetch();
    bookings.refetch();
    payments.refetch();
    reviewQueue.refetch();
  };

  return (
    <div className="ops-dashboard dashboard-home">
      {/* 1. En haut : Titre « Vue d’ensemble » et actualisation discrète */}
      <header className="dashboard-top-bar">
        <div>
          <h1 className="dashboard-main-title">Vue d’ensemble</h1>
        </div>
        <button
          type="button"
          className="ops-btn ops-btn-secondary dashboard-refresh-btn"
          disabled={refreshing}
          onClick={handleRefresh}
          aria-label="Actualiser les données du tableau de bord"
        >
          <AdminIcon name="refresh" className={refreshing ? "ops-spin" : ""} />
          <span>Actualiser</span>
        </button>
      </header>

      <ErrorState error={stats.error} retry={() => stats.refetch()} />

      {/* 2. KPI essentiels sur une ligne : dossiers enregistrés, paiements réussis, encaissements, remboursements */}
      {stats.isLoading ? (
        <div className="dashboard-kpi-loading" aria-label="Chargement des chiffres clés" role="status">
          {[0, 1, 2, 3].map((item) => (
            <div className="ops-skeleton" key={item} />
          ))}
        </div>
      ) : (
        <section className="dashboard-summary" aria-label="Chiffres clés">
          <div className="dashboard-summary-item">
            <span className="dashboard-summary-label">Dossiers enregistrés</span>
            <strong className="dashboard-summary-value">
              {stats.data ? intlNumber.format(stats.data.totalReservations) : "—"}
            </strong>
            <small className="dashboard-summary-sub">Toutes prestations</small>
          </div>

          <div className="dashboard-summary-item">
            <span className="dashboard-summary-label">Paiements réussis</span>
            <strong className="dashboard-summary-value">
              {stats.data ? intlNumber.format(stats.data.paymentsByStatus?.SUCCEEDED ?? 0) : "—"}
            </strong>
            <small className="dashboard-summary-sub">Transactions encaissées</small>
          </div>

          <div className="dashboard-summary-item dashboard-summary-money">
            <span className="dashboard-summary-label">Encaissements réussis</span>
            <strong className="dashboard-summary-value">
              <CurrencyAmounts amounts={stats.data?.revenueByCurrency} available={!!stats.data} />
            </strong>
            <small className="dashboard-summary-sub">Par devise</small>
          </div>

          <div className="dashboard-summary-item dashboard-summary-money">
            <span className="dashboard-summary-label">Remboursements effectués</span>
            <strong className="dashboard-summary-value">
              <CurrencyAmounts amounts={stats.data?.refundedByCurrency} available={!!stats.data} />
            </strong>
            <small className="dashboard-summary-sub">Par devise</small>
          </div>
        </section>
      )}

      <section className="dashboard-priorities" aria-labelledby="dashboard-priorities-title">
        <div className="dashboard-priorities-heading">
          <div><h2 id="dashboard-priorities-title">À examiner</h2><p>Les points qui demandent votre attention</p></div>
          <span className="dashboard-priorities-context">Suivi opérationnel</span>
        </div>
        <div className="dashboard-priorities-list">
          <Link href="/admin/bookings?status=PENDING_PAYMENT" className="dashboard-priority-card">
            <span className="dashboard-priority-icon"><AdminIcon name="finance" /></span>
            <span className="dashboard-priority-copy"><strong>Paiements en attente</strong><small>{stats.data?.pendingPaymentsPastDue ? `${intlNumber.format(stats.data.pendingPaymentsPastDue)} échéance${stats.data.pendingPaymentsPastDue > 1 ? "s" : ""} dépassée${stats.data.pendingPaymentsPastDue > 1 ? "s" : ""} à vérifier` : "Suivre les dossiers à régler"}</small></span>
            <span className="dashboard-priority-count">{stats.data?.bookingsByStatus ? intlNumber.format(stats.data.bookingsByStatus.PENDING_PAYMENT ?? 0) : "—"}</span><AdminIcon name="chevron" />
          </Link>
          <Link href="/admin/bookings?status=EXPIRED" className="dashboard-priority-card">
            <span className="dashboard-priority-icon"><AdminIcon name="travel" /></span>
            <span className="dashboard-priority-copy"><strong>Dossiers expirés</strong><small>Consulter les dossiers expirés</small></span>
            <span className="dashboard-priority-count">{stats.data?.bookingsByStatus ? intlNumber.format(stats.data.bookingsByStatus.EXPIRED ?? 0) : "—"}</span><AdminIcon name="chevron" />
          </Link>
          <Link href="/admin/reviews?status=PENDING_MODERATION" className="dashboard-priority-card">
            <span className="dashboard-priority-icon"><AdminIcon name="reviews" /></span>
            <span className="dashboard-priority-copy"><strong>Avis à modérer</strong><small>Ouvrir la file d’attente</small></span>
            <span className="dashboard-priority-count">{reviewQueue.data ? intlNumber.format(reviewQueue.data.totalElements) : "—"}</span><AdminIcon name="chevron" />
          </Link>
        </div>
        {reviewQueue.isError && <p className="dashboard-priorities-error">Le nombre d’avis est indisponible. <button type="button" onClick={() => reviewQueue.refetch()}>Réessayer</button></p>}
      </section>

      {/* 3. Graphiques côte à côte sur grand écran : Voyages par prestation et État des dossiers */}
      {stats.isLoading ? (
        <Loading />
      ) : (
        stats.data && (
          <OverviewCharts
            products={stats.data.bookingsByProduct}
            statuses={stats.data.bookingsByStatus}
          />
        )
      )}

      {/* 4. Activité récente : Derniers dossiers et Derniers paiements */}
      <div className="dashboard-registers">
        <section className="dashboard-register">
          <header>
            <div>
              <h2>Derniers dossiers</h2>
              <p>Les voyages enregistrés récemment</p>
            </div>
            <Link href="/admin/bookings">
              Voir les dossiers <AdminIcon name="arrow" />
            </Link>
          </header>
          <ErrorState error={bookings.error} retry={() => bookings.refetch()} />
          {bookings.isLoading ? (
            <Loading />
          ) : (
            bookings.data?.content.map((booking) => {
              const travel = parseTravelContext(booking);
              return (
                <Link className="dashboard-record" href={`/admin/bookings?booking=${booking.id}`} key={booking.id}>
                  <span className="dashboard-record-icon">
                    <TravelImage src={travel.imageUrl} type={booking.productType} />
                  </span>
                  <span className="dashboard-record-main">
                    <strong>{travel.title}</strong>
                    <small>{booking.bookingReference}</small>
                  </span>
                  <AdminBadge variant={getStatusBadgeVariant(booking.status)}>
                    {adminStatusLabel(booking.status)}
                  </AdminBadge>
                </Link>
              );
            })
          )}
          {bookings.data?.totalElements === 0 && <Empty>Aucun dossier enregistré.</Empty>}
        </section>

        <section className="dashboard-register">
          <header>
            <div>
              <h2>Derniers paiements</h2>
              <p>Activité financière récente</p>
            </div>
            <Link href="/admin/finance">
              Voir la trésorerie <AdminIcon name="arrow" />
            </Link>
          </header>
          <ErrorState error={payments.error} retry={() => payments.refetch()} />
          {payments.isLoading ? (
            <Loading />
          ) : (
            payments.data?.content.map((payment) => (
              <Link
                className="dashboard-record dashboard-payment"
                href={`/admin/finance?payment=${payment.id}`}
                key={payment.id}
              >
                <span className="dashboard-record-main">
                  <strong>{payment.paymentReference}</strong>
                  <small>{formatDate(payment.createdAt)}</small>
                </span>
                <span className="dashboard-payment-value">
                  <strong>{money(payment.amount, payment.currency)}</strong>
                  <AdminBadge variant={getStatusBadgeVariant(payment.status)}>
                    {adminStatusLabel(payment.status)}
                  </AdminBadge>
                </span>
              </Link>
            ))
          )}
          {payments.data?.totalElements === 0 && <Empty>Aucun paiement enregistré.</Empty>}
        </section>
      </div>
    </div>
  );
}
