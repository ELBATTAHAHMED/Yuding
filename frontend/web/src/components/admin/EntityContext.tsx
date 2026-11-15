"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { apiClient } from "@/lib/api-client";
import { fullName, money } from "./OperationsUI";
import { AdminIcon } from "./AdminIcon";

export function AccountLink({ id }: { id: string }) {
  const account = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => adminService.getUser(id),
    enabled: !!id,
    staleTime: 60000,
  });
  return (
    <Link onClick={(e) => e.stopPropagation()} href={`/admin/users?id=${id}`}>
      {account.data
        ? fullName(account.data)
        : account.isError
          ? "Compte indisponible"
          : "Compte…"}
    </Link>
  );
}
export function BookingContext({ id }: { id: string }) {
  const booking = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: () => adminService.getBooking(id),
    enabled: !!id,
    staleTime: 60000,
  });
  return (
    <div className="ops-cell">
      <Link
        onClick={(e) => e.stopPropagation()}
        href={`/admin/bookings?booking=${id}`}
      >
        {booking.data?.bookingReference ||
          (booking.isError ? "Dossier indisponible" : "Dossier…")}
      </Link>
      {booking.data && (
        <small>
          <AccountLink id={booking.data.userId} />
        </small>
      )}
    </div>
  );
}
export function TravelerBalance({ id }: { id: string }) {
  const summary = useQuery({
    queryKey: ["admin", "traveler-summary", id],
    queryFn: () =>
      apiClient.get<{
        bookingCount: number;
        capturedByCurrency: Record<string, number>;
      }>(`/apir/admin/travelers/${id}/summary`, true),
    staleTime: 60000,
  });
  return (
    <div className="ops-cell">
      {summary.data ? (
        <>
          <strong>
            {summary.data.bookingCount} dossier
            {summary.data.bookingCount === 1 ? "" : "s"}
          </strong>
          <small>
            {Object.entries(summary.data.capturedByCurrency)
              .map(([c, a]) => money(a, c))
              .join(" · ") || "Aucun encaissement"}
          </small>
        </>
      ) : (
        <small>
          {summary.isError ? "Contexte indisponible" : "Chargement…"}
        </small>
      )}
    </div>
  );
}
export function TravelImage({
  src,
  type,
  large = false,
}: {
  src?: string;
  type: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const safe = src && /^(https?:\/\/|\/[^/])/.test(src);
  return safe && !failed ? (
    <img
      className={large ? "ops-travel-image-large" : "ops-travel-image"}
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : large ? null : (
    <span className="ops-travel-placeholder" aria-hidden="true"><AdminIcon name={type.toLowerCase()} /></span>
  );
}
