"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AdminBadge, adminStatusLabel } from "@/components/admin/AdminBadge";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { Empty, ErrorState, Loading, PageHeading, Section, formatDate, money } from "@/components/admin/OperationsUI";
import { adminService } from "@/services/admin.service";
import { useDeveloperMode } from "@/components/admin/useDeveloperMode";

type Tab = "services" | "providers" | "activity" | "ai";
const tabs: { id: Tab; label: string }[] = [
  { id: "services", label: "Services" }, { id: "providers", label: "Fournisseurs" },
  { id: "activity", label: "Activité" }, { id: "ai", label: "Usage IA" },
];
const number = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("fr-FR").format(value);
const serviceInfo: Record<string, { title: string; description: string; icon: string }> = {
  "gateway-service": { title: "Passerelle API", description: "Point d’entrée des requêtes et contrôle d’accès.", icon: "network" },
  "identity-service": { title: "Identité et accès", description: "Comptes, connexion et sécurité des utilisateurs.", icon: "shield" },
  "travel-service": { title: "Offres de voyage", description: "Recherche et disponibilité des prestations.", icon: "travel" },
  "reservation-service": { title: "Réservations et paiements", description: "Dossiers de voyage et opérations de paiement.", icon: "finance" },
  "commentaire-service": { title: "Avis voyageurs", description: "Collecte et modération des avis.", icon: "reviews" },
  "notification-service": { title: "Notifications", description: "Envoi des messages aux voyageurs.", icon: "mail" },
  "ai-service": { title: "Assistant IA", description: "Conversations et outils de l’assistant.", icon: "assistant" },
  "config-service": { title: "Configuration", description: "Paramètres partagés des services.", icon: "settings" },
  "discovery-service": { title: "Annuaire des services", description: "Enregistrement et découverte des services.", icon: "network" },
};
function ServiceIdentity({ name, brand, icon = "server", technical, tool = false }: { name: string; brand?: string; icon?: string; technical?: string; tool?: boolean }) {
  const [failedBrand, setFailedBrand] = useState<string>();
  const showBrand = !!brand && failedBrand !== brand;
  return <div className="supervision-identity"><span className={`supervision-symbol${showBrand ? " supervision-symbol--brand" : ""}${tool ? " supervision-symbol--tool" : ""}`}>{showBrand ? <img src={brand} alt="" onError={() => setFailedBrand(brand)} /> : <AdminIcon name={icon} />}</span><span className="supervision-identity-copy"><strong>{name}</strong>{technical && <small className="supervision-technical">{technical}</small>}</span></div>;
}
const providerName = (name: string) => name.toLowerCase() === "mock" ? "Simulation de paiement" : name;
const toolIcons: Record<string, string> = {
  searchKnowledge: "toolKnowledge", searchFlights: "toolFlight", planTrip: "toolRoute", getWeather: "toolWeather",
  searchActivities: "toolActivity", convertCurrency: "toolExchange", searchHotels: "toolHotel",
  searchTransfers: "toolTransfer", getBookingStatus: "toolBooking", searchTrains: "train",
};
const brandFor = (name: string) => {
  const key = (name || "").toLowerCase();
  if (key.includes("paypal")) return "/image/admin-brands/paypal.png";
  if (key === "hbx") return "/image/admin-brands/hbx.png";
  if (key === "nuitee") return "/image/admin-brands/nuitee.svg";
  if (key === "scrappa") return "/image/admin-brands/scrappa.png";
  return undefined;
};
const infrastructureInfo = (name: string) => name.toLowerCase().includes("postgres")
  ? { name: "PostgreSQL", brand: "/image/admin-brands/postgresql.svg", description: "Base de données" }
  : name.toLowerCase().includes("redis")
    ? { name: "Redis", brand: "/image/admin-brands/redis.svg", description: "Cache" }
    : { name, brand: undefined, description: "Infrastructure" };

export default function AdminProvidersPage() {
  const developerMode = useDeveloperMode();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("services");
  const supervision = useQuery({ queryKey: ["admin", "supervision"], queryFn: adminService.getSupervision, retry: false, enabled: developerMode.enabled });
  const activity = useQuery({ queryKey: ["admin", "api-usage"], queryFn: adminService.getApiUsage, retry: false, enabled: developerMode.enabled && tab === "activity" });
  const ai = useQuery({ queryKey: ["admin", "ai-usage"], queryFn: adminService.getAiUsage, retry: false, enabled: developerMode.enabled && tab === "ai" });
  const current = tab === "ai" ? ai : tab === "activity" ? activity : supervision;
  const providers = supervision.data?.providers?.filter((provider) => provider.telemetryMode !== "INTERNAL_CATALOG") ?? [];

  useEffect(() => {
    if (developerMode.ready && !developerMode.enabled) router.replace("/admin");
  }, [developerMode.enabled, developerMode.ready, router]);

  if (!developerMode.ready || !developerMode.enabled) return null;

  return <div className="ops-supervision-page ops-new-admin">
    <PageHeading title="Supervision plateforme">
      <button type="button" className="ops-btn" onClick={() => current.refetch()} disabled={current.isFetching}>
        <AdminIcon name="refresh" /> Actualiser
      </button>
    </PageHeading>
    {(tab === "services" || tab === "providers") && supervision.data?.timestamp && <p className="ops-supervision-updated">Mis à jour le {formatDate(supervision.data.timestamp)}</p>}
    <nav className="ops-new-tabs" aria-label="Rubriques de supervision">
      {tabs.map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>

    {current.isLoading ? <Loading /> : current.isError ? <ErrorState error={current.error} retry={() => current.refetch()} /> : <>
      {tab === "services" && supervision.data && <>

        <div className="ops-supervision-layout"><Section title="Services enregistrés" aside={<span className="ops-section-meta">Annuaire Eureka</span>}>
          {!(supervision.data.services ?? []).length ? <Empty>Aucun service enregistré.</Empty> : <div className="supervision-services">
            {(supervision.data.services ?? []).map((service) => { const info = serviceInfo[service.serviceName?.toLowerCase()] ?? { title: service.serviceName || "Service inconnu", icon: "server", description: "Service enregistré dans l’annuaire." }; return <div className="supervision-service" key={service.serviceName}>
              <ServiceIdentity name={info.title} icon={info.icon} technical={service.serviceName} />
              <div className="supervision-service-meta"><AdminBadge variant={service.instanceCount > 0 ? "confirmed" : "neutral"}>{service.instanceCount > 0 ? "Enregistré" : "Non enregistré"}</AdminBadge><small>{number(service.instanceCount)} instance{service.instanceCount === 1 ? "" : "s"}</small></div>
            </div>; })}
          </div>}
        </Section>
        <Section title="Infrastructure" aside={<span className="ops-section-meta">Sondes locales</span>}>{!(supervision.data.infrastructure ?? []).filter((item) => !item.component?.toLowerCase().includes("eureka")).length ? <Empty>Aucune sonde disponible.</Empty> : <div className="supervision-services">{(supervision.data.infrastructure ?? []).filter((item) => !item.component?.toLowerCase().includes("eureka")).map((item) => { const info = infrastructureInfo(item.component); return <div className="supervision-infrastructure" key={item.component}><ServiceIdentity name={info.name} brand={info.brand} icon="database" technical={info.description} /><div className="supervision-infrastructure-meta"><AdminBadge variant={item.status === "HEALTHY" ? "confirmed" : "warning"}>{item.status === "HEALTHY" ? "Accessible" : item.status === "DEGRADED" ? "Dégradé" : item.status === "UNAVAILABLE" ? "Non accessible" : "État inconnu"}</AdminBadge><small>{item.latencyMs == null ? "Latence indisponible" : `${number(item.latencyMs)} ms`}</small></div></div>; })}</div>}</Section></div>
      </>}
      {tab === "providers" && supervision.data && <Section title="Activité des fournisseurs">
        {!providers.length ? <Empty>Aucune activité fournisseur enregistrée.</Empty> : <div className="supervision-services">{providers.map((provider) => <div className="supervision-service" key={`${provider.domain}-${provider.providerCode}`}><ServiceIdentity name={provider.providerCode?.toLowerCase() === "mock" ? "Simulation de paiement" : provider.providerName} brand={brandFor(provider.providerCode)} icon={provider.domain === "TRAVEL" ? "travel" : "finance"} technical={`Dernière activité : ${provider.lastSeenAt ? formatDate(provider.lastSeenAt) : "inconnue"}`} /><div className="supervision-service-meta"><AdminBadge>Disponibilité non mesurée</AdminBadge><small>{number(provider.totalOperations)} enregistrement{provider.totalOperations === 1 ? "" : "s"}</small></div></div>)}</div>}
      </Section>}
      {tab === "activity" && activity.data && <div className="supervision-activity-grid">
        <Section title="Dossiers par fournisseur">{!activity.data.bookingsByProvider.length ? <Empty>Aucun dossier enregistré.</Empty> : <div className="ops-register ops-new-register"><div className="ops-table-responsive"><table className="ops-table"><thead><tr><th>Fournisseur</th><th>Prestation</th><th>Dossiers</th><th>Dernier enregistrement</th></tr></thead><tbody>{activity.data.bookingsByProvider.map((row) => <tr key={`${row.provider}-${row.productType}`}><td data-label="Fournisseur"><ServiceIdentity name={providerName(row.provider)} brand={brandFor(row.provider)} icon="travel" /></td><td data-label="Prestation">{adminStatusLabel(row.productType)}</td><td data-label="Dossiers">{number(row.total)}</td><td data-label="Dernier enregistrement">{formatDate(row.lastSeen)}</td></tr>)}</tbody></table></div></div>}</Section>
        <Section title="Paiements par fournisseur">{!activity.data.paymentsByProvider.length ? <Empty>Aucun paiement enregistré.</Empty> : <div className="ops-register ops-new-register"><div className="ops-table-responsive"><table className="ops-table"><thead><tr><th>Fournisseur</th><th>État</th><th>Paiements</th><th>Montant</th></tr></thead><tbody>{activity.data.paymentsByProvider.map((row) => <tr key={`${row.providerName}-${row.status}-${row.currency}`}><td data-label="Fournisseur"><ServiceIdentity name={providerName(row.providerName)} brand={brandFor(row.providerName)} icon="finance" /></td><td data-label="État"><AdminBadge>{adminStatusLabel(row.status)}</AdminBadge></td><td data-label="Paiements">{number(row.total)}</td><td data-label="Montant" className="ops-numeric" style={{ textAlign: "right" }}>{money(row.totalAmount, row.currency)}</td></tr>)}</tbody></table></div></div>}</Section>
        <Section title="Événements de paiement">{!activity.data.webhookEvents.length ? <Empty>Aucun paiement ni événement fournisseur enregistré.</Empty> : <div className="ops-register ops-new-register"><div className="ops-table-responsive"><table className="ops-table"><thead><tr><th>Fournisseur</th><th>Événement</th><th>État</th><th>Nombre</th></tr></thead><tbody>{activity.data.webhookEvents.map((row) => <tr key={`${row.provider}-${row.eventType}-${row.status}`}><td data-label="Fournisseur"><ServiceIdentity name={providerName(row.provider)} brand={brandFor(row.provider)} icon="finance" /></td><td data-label="Événement">{adminStatusLabel(row.eventType)}</td><td data-label="État"><AdminBadge>{adminStatusLabel(row.status)}</AdminBadge></td><td data-label="Nombre">{number(row.total)}</td></tr>)}</tbody></table></div></div>}</Section>
      </div>}
      {tab === "ai" && ai.data && <>
        <div className="ops-new-metrics"><div><span>Conversations</span><strong>{number(ai.data.volume.totalConversations)}</strong></div><div><span>Messages</span><strong>{number(ai.data.volume.totalMessages)}</strong></div><div><span>Tokens enregistrés · collecte partielle</span><strong>{number(ai.data.tokens.totalTokens)}</strong></div><div><span>7 derniers jours · collecte partielle</span><strong>{number(ai.data.tokens.tokensLast7Days)}</strong></div></div>
        <Section title="Utilisation des outils">{!ai.data.toolCalls.length ? <Empty>Aucun appel d’outil enregistré.</Empty> : <div className="ops-register ops-new-register"><div className="ops-table-responsive"><table className="ops-table"><thead><tr><th>Outil</th><th>Appels</th><th>Échecs</th><th>Durée moyenne</th></tr></thead><tbody>{ai.data.toolCalls.map((tool) => <tr key={tool.tool_name}><td data-label="Outil"><ServiceIdentity name={tool.tool_name} icon={toolIcons[tool.tool_name] || "settings"} tool /></td><td data-label="Appels">{number(tool.total_calls)}</td><td data-label="Échecs">{number(tool.failed_calls)}</td><td data-label="Durée moyenne">{tool.avg_duration_ms == null ? "—" : `${number(tool.avg_duration_ms)} ms`}</td></tr>)}</tbody></table></div></div>}</Section>
      </>}
    </>}
  </div>;
}
