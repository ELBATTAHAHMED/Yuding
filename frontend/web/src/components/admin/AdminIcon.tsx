import React from "react";
const paths: Record<string, React.ReactNode> = {
  overview: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  travel: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V3h8v4M8 7v14M16 7v14" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5" />
    </>
  ),
  reviews: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM7 7h10M7 11h7" />
  ),
  audit: (
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6" />
  ),
  health: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  toolKnowledge: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21zM4 5.5V21M8 7h7M8 11h7"/></>,
  toolFlight: <path d="M3 12.5 21 4l-5.8 17-3.4-6-5.3 1 2.1-3.1zM11.8 15 21 4"/>,
  toolRoute: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8"/></>,
  toolWeather: <><path d="M7.5 18H17a3.5 3.5 0 0 0 .1-7A5 5 0 0 0 7.5 10a4 4 0 0 0 0 8ZM12 3v2M4.5 5.5 6 7M19.5 5.5 18 7"/></>,
  toolActivity: <><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></>,
  toolExchange: <path d="M4 8h14m-3-3 3 3-3 3M20 16H6m3-3-3 3 3 3"/>,
  toolHotel: <><path d="M4 20V8h16v12M8 8V4h8v4M4 13h16M8 10h.01M12 10h.01M16 10h.01M10 20v-4h4v4"/></>,
  toolTransfer: <><path d="m5 10 1.5-4h11L19 10M4 10h16v7H4zM7 17v2m10-2v2M7.5 13.5h.01m9 0h.01"/></>,
  toolBooking: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M8 10h8M8 14h5"/></>,
  weather: <><path d="M8 18h9a4 4 0 0 0 .3-8A5.5 5.5 0 0 0 7 9a4.5 4.5 0 0 0 1 9Z"/><path d="M12 3v2M4 6l1.5 1.5M20 6l-1.5 1.5"/></>,
  exchange: <><path d="M3 8h15m-4-4 4 4-4 4M21 16H6m4-4-4 4 4 4"/></>,
  route: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8"/></>,
  server: <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  network: <><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M5 17v-2a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2" /></>,
  shield: <><path d="M12 3 4 6v5c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  brain: <><path d="M12 5a3 3 0 0 0-5.7-1.2 3.5 3.5 0 0 0-2 6.4 3.5 3.5 0 0 0 1.3 6.1A3.5 3.5 0 0 0 12 19zM12 5a3 3 0 0 1 5.7-1.2 3.5 3.5 0 0 1 2 6.4 3.5 3.5 0 0 1-1.3 6.1A3.5 3.5 0 0 1 12 19z"/><path d="M8 8c2 0 2 2 4 2m4 3c-2 0-2 2-4 2"/></>,
  assistant: <><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  panelCollapse: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16m7-11-3 3 3 3" /></>,
  left: <path d="m15 5-7 7 7 7" />,
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 6 6" />
    </>
  ),
  refresh: <path d="M20 7a9 9 0 1 0 1 8M20 2v6h-6" />,
  hotel: <path d="M3 21V3h18v18M8 7h1M15 7h1M8 11h1M15 11h1M9 21v-6h6v6" />,
  flight: <path d="m22 2-7 20-4-9-9-4Z M11 13 22 2" />,
  activity: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-3 5-5 3 3-5Z" />
    </>
  ),
  transfer: (
    <path d="m5 7 2-4h10l2 4 2 4v7H3v-7ZM3 11h18M7 14h1M16 14h1M5 18v3M19 18v3" />
  ),
  train: (
    <>
      <rect x="5" y="2" width="14" height="16" rx="3" />
      <path d="M5 9h14M9 14h.01M15 14h.01M8 18l-3 4M16 18l3 4" />
    </>
  ),
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  portal: <><path d="M3 10 12 3l9 7v10H3z" /><path d="M9 20v-6h6v6" /></>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  alert: <path d="m12 3 10 18H2Z M12 9v5M12 17h.01" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  content: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10M6 10h10M6 14h6" />
    </>
  ),
};
export function AdminIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`ops-icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.travel}
    </svg>
  );
}
