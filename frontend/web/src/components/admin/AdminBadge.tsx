import React from "react";
export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "error"
  | "info"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "draft"
  | "neutral";
const statusLabels: Record<string, string> = {
  SUCCEEDED: "Réussi", PROCESSING: "En cours", CAPTURED: "Encaissé",
  DRAFT: "Brouillon", PENDING_PAYMENT: "Paiement en attente", PAYMENT_FAILED: "Paiement échoué", PAID: "Payé",
  PENDING_PROVIDER_CONFIRMATION: "Confirmation fournisseur en cours",
  CONFIRMED: "Confirmé", FAILED: "Échoué", EXPIRED: "Expiré",
  CANCELLED: "Annulé", REFUNDED: "Remboursé", ACTIVE: "Actif",
  PENDING: "En attente", SUSPENDED: "Suspendu", DELETED: "Désactivé", LOCKED: "Verrouillé",
  APPROVED: "Approuvé", REJECTED: "Rejeté", NOT_APPLICABLE: "Non applicable",
  NON_REFUNDABLE: "Non remboursable", FULL: "Remboursement total", PARTIAL: "Remboursement partiel",
  REFUND_FAILED: "Échec du remboursement", REQUIRES_ACTION: "Action requise",
  PENDING_MODERATION: "En attente de modération", TEST_ACTION: "Action de test",
  RECORDED: "Enregistré", PAYMENT_SUCCEEDED: "Paiement réussi",
  PAYMENT_REFUNDED: "Paiement remboursé",
  PAYMENT_PROCESSING: "Paiement en cours", PAYMENT_RECORDED: "Paiement enregistré",
  ROLE_CHANGE: "Modification des rôles", USER_STATUS_CHANGE: "Modification du compte", ACCOUNT_UNLOCK: "Déverrouillage du compte", USER_DELETE: "Suppression du compte",
  ACCOMMODATION: "Hébergement", FLIGHT: "Vol", ACTIVITY: "Activité", TRANSFER: "Transfert", TRAIN: "Train", PLATFORM: "Plateforme", EXPERIENCE: "Expérience",
};
export const adminStatusLabel = (status: string) => statusLabels[status] || status.replace(/_/g, " ").toLocaleLowerCase("fr-FR").replace(/^./, (letter) => letter.toLocaleUpperCase("fr-FR"));
export function getStatusBadgeVariant(s: string): BadgeVariant {
  const distinctStatuses: Record<string, BadgeVariant> = {
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
    REFUNDED: "refunded",
    DRAFT: "draft",
  };
  if (distinctStatuses[s]) return distinctStatuses[s];
  if (
    [
      "PAID",
      "SUCCEEDED",
      "CAPTURED",
      "APPROVED",
      "ACTIVE",
    ].includes(s)
  )
    return "success";
  if (
    [
      "FAILED",
      "PAYMENT_FAILED",
      "REFUND_FAILED",
      "REJECTED",
      "SUSPENDED",
      "DELETED",
      "DOWN",
    ].includes(s)
  )
    return "danger";
  if (
    [
      "PENDING",
      "PENDING_PAYMENT",
      "PROCESSING",
      "PENDING_MODERATION",
      "LOCKED",
      "CANCELLING",
    ].includes(s)
  )
    return "warning";
  return "neutral";
}
export function AdminBadge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={`ops-status ops-status-${variant} ${className}`}>
      <span aria-hidden="true" />
      {typeof children === "string" && /^[A-Z][A-Z_]+$/.test(children) ? adminStatusLabel(children) : children}
    </span>
  );
}
