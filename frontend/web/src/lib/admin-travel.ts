import type { AdminBooking } from "@/types/admin.types";
import { formatAdminDay, formatAdminMoment, formatStayDates } from "./admin-date.ts";
export interface ParsedTravelContext {
  productType: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  dates: string;
  route?: string;
  imageUrl?: string;
  details: { label: string; value: string }[];
}
export const travelLabels: Record<string, string> = {
  HOTEL: "Hôtel",
  FLIGHT: "Vol",
  ACTIVITY: "Activité",
  TRANSFER: "Transfert",
  TRAIN: "Train",
};
export function parseTravelContext(booking: AdminBooking): ParsedTravelContext {
  const d = booking.selectedDetails || {};
  const type = booking.productType.toUpperCase();
  const read = (...keys: string[]) =>
    keys.map((k) => d[k]).find((v) => v != null && v !== "");
  const string = (v: unknown) =>
    v == null || v === ""
      ? "—"
      : typeof v === "object"
        ? "—"
        : String(v);
  let title = travelLabels[type] || type;
  let subtitle = "Informations voyage non renseignées";
  let dates = "Dates non renseignées";
  let route: string | undefined;
  let fields: [string, unknown][] = [];
  if (type === "HOTEL") {
    title = string(read("hotelName", "name"));
    subtitle =
      [
        read("city", "destination"),
        d.selectedRoom?.roomName || read("roomSummary"),
      ]
        .filter(Boolean)
        .join(" · ") || subtitle;
    dates = formatStayDates(read("checkIn"), read("checkOut"));
    const a = Date.parse(d.checkIn),
      b = Date.parse(d.checkOut);
    const nights =
      Number.isFinite(a) && Number.isFinite(b) && b > a
        ? Math.round((b - a) / 86400000)
        : undefined;
    fields = [
      ["Établissement", title],
      ["Ville", read("city", "destination")],
      ["Arrivée", d.checkIn],
      ["Départ", d.checkOut],
      ["Nuits", nights],
      ["Chambre", d.selectedRoom?.roomName || d.roomSummary],
      ["Formule", d.selectedRoom?.boardType],
      ["Voyageurs", read("guests", "guestCount", "adults")],
    ];
  } else if (type === "FLIGHT") {
    const origin = read("origin", "departureAirport"),
      destination = read("destination", "arrivalAirport");
    route = [
      origin || "Départ non renseigné",
      destination || "Arrivée non renseignée",
    ].join(" → ");
    title = route;
    subtitle =
      [
        read("airlineName", "airlineCode", "airline"),
        d.flightNumber,
        d.cabinClass,
      ]
        .filter(Boolean)
        .join(" · ") || subtitle;
    dates = formatAdminMoment(read("departureTime", "departureDate"));
    fields = [
      ["Départ", origin],
      ["Arrivée", destination],
      ["Compagnie", read("airlineName", "airlineCode", "airline")],
      ["Vol", d.flightNumber],
      ["Décollage", read("departureTime", "departureDate")],
      ["Atterrissage", d.arrivalTime],
      ["Passagers", read("passengers", "adults")],
      ["Classe", d.cabinClass],
    ];
  } else if (type === "ACTIVITY") {
    title = string(read("title", "activityName", "name"));
    subtitle = string(read("destination", "city"));
    dates = formatAdminDay(read("date", "activityDate", "selectedDate"));
    fields = [
      ["Activité", title],
      ["Destination", read("destination", "city")],
      ["Date", read("date", "activityDate", "selectedDate")],
      ["Horaire", read("time", "startTime")],
      ["Participants", read("participants", "passengers", "adults")],
    ];
  } else if (type === "TRANSFER") {
    const origin = read("pickup", "pickupLocation", "origin"),
      dest = read("dropoff", "dropoffLocation", "destination");
    title = [
      origin || "Prise en charge non renseignée",
      dest || "Dépose non renseignée",
    ].join(" → ");
    subtitle = string(read("vehicleModel", "vehicleType"));
    dates =
      [formatAdminDay(read("date", "pickupDate")), read("time", "pickupTime")]
        .filter(Boolean)
        .join(" · ") || dates;
    fields = [
      ["Prise en charge", origin],
      ["Dépose", dest],
      ["Date", read("date", "pickupDate")],
      ["Horaire", read("time", "pickupTime")],
      ["Véhicule", read("vehicleModel", "vehicleType")],
      ["Voyageurs", read("passengers", "adults")],
    ];
  } else if (type === "TRAIN") {
    const origin = read("originStation", "origin"),
      dest = read("destinationStation", "destination");
    title = [
      origin || "Gare non renseignée",
      dest || "Gare non renseignée",
    ].join(" → ");
    subtitle =
      [d.operator, d.trainNumber, d.seatClass].filter(Boolean).join(" · ") ||
      subtitle;
    dates =
      [formatAdminDay(d.departureDate), d.departureTime].filter(Boolean).join(" · ") || dates;
    fields = [
      ["Gare de départ", origin],
      ["Gare d’arrivée", dest],
      ["Date", d.departureDate],
      ["Horaire", d.departureTime],
      ["Train", d.trainNumber],
      ["Opérateur", d.operator],
      ["Passagers", read("passengers", "adults")],
    ];
  }
  if (title === "—") title = Object.keys(d).length ? (travelLabels[type] || "Voyage") : "Offre indisponible";
  // High-resolution image selection for admin consoles.
  // Filters out small/glitched thumbnail URLs when full-size provider photos exist,
  // and auto-upgrades provider thumbnail paths (e.g. Cupid /thumbnail/ paths) to
  // the canonical full-size photograph, avoiding pixelation at any zoom level.
  const rawCandidates: unknown[] = [
    d.heroImageUrl,
    d.imageUrl,
    d.image_url,
    d.thumbnailUrl,
    d.thumbnail,
    d.pictureUrl,
    d.photo,
    ...(Array.isArray(d.photos) ? d.photos.map((p: any) => (typeof p === 'string' ? p : p?.url || p?.large || p?.medium)) : []),
    ...(Array.isArray(d.galleryUrls) ? d.galleryUrls : []),
    ...(Array.isArray(d.images) ? d.images.map((i: any) => (typeof i === 'string' ? i : i?.url)) : []),
  ];

  const stringCandidates = rawCandidates
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(url => url.trim());

  const upgradeProviderUrl = (url: string) => {
    // Cupid/Hotelbeds /thumbnail/ paths point to downscaled 80x80 or 150x150 variants.
    // The canonical photograph resides at the same URL without the /thumbnail/ segment.
    if (url.includes('cupid.travel') && url.includes('/thumbnail/')) {
      return url.replace('/thumbnail/', '/');
    }
    return url;
  };

  const isLowResThumbnail = (url: string) =>
    /\/thumbnail\//i.test(url) ||
    /_thumb\./i.test(url) ||
    /[-_]80x80\./i.test(url) ||
    /[-_]150x150\./i.test(url) ||
    /_t\.(?:jpg|png|webp)/i.test(url);

  // Prefer high-res non-thumbnail image first, upgrading provider URLs
  const bestCandidate =
    stringCandidates.find(url => !isLowResThumbnail(url)) ||
    stringCandidates[0];

  const image = bestCandidate ? upgradeProviderUrl(bestCandidate) : undefined;

  return {
    productType: type,
    title,
    subtitle,
    badge: travelLabels[type] || type,
    badgeColor: "#087f78",
    dates,
    route,
    imageUrl: image,
    details: fields.map(([label, value]) => ({ label, value: typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatAdminMoment(value) : string(value) })),
  };
}
