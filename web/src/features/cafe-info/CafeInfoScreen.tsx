"use client";

import {
  Clock3,
  FileText,
  Link2Off,
  Map as MapIcon,
  MapPin,
  MapPinOff,
  MessageCircle,
  MessageCircleOff,
  Phone,
  PhoneOff,
} from "lucide-react";
import { useScreenState } from "@/shared/lib/use-screen-state";
import { NAV_BACK, ScreenHeader, StateCard, StatusPill } from "@/shared/ui";
import { CafeActionButton } from "./CafeActionButton";
import { CafeCover } from "./CafeCover";
import { CafeLinkRow } from "./CafeLinkRow";
import { CafeSection } from "./CafeSection";
import { HoursTable } from "./HoursTable";
import { CAFE_INFO_COPY as copy } from "./cafe-info-copy";
import { CAFE_INFO_FORCED_STATES, getCafeDetail, getCafeInfoView } from "./cafe-info-view";

const CHANNEL_META = {
  whatsapp: { label: copy.contact.whatsapp, icon: MessageCircle, offIcon: MessageCircleOff, external: true },
  phone: { label: copy.contact.phone, icon: Phone, offIcon: PhoneOff, external: false },
} as const;

/**
 * "Detalle del negocio": cover, identity, location, contact, links and opening hours. Missing data
 * dims links or shows each section's empty state; `?state=unavailable|empty` forces the sample data
 * of those designs. It reads search params, so it must render inside `<Suspense>`.
 */
export function CafeInfoScreen() {
  const forced = useScreenState(CAFE_INFO_FORCED_STATES);
  const detail = getCafeDetail(forced);
  const { description, location, contact, links, hours } = getCafeInfoView(detail);

  return (
    <>
      <ScreenHeader
        variant="centered"
        title={copy.title}
        backHref="/explore"
        backTransitionTypes={NAV_BACK}
      />
      <CafeCover
        src={detail.coverImage}
        statusLabel={detail.openStatus.open ? copy.openNow : copy.closedNow}
        open={detail.openStatus.open}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 pt-2.5 pb-[30px]">
        <div className="flex flex-col gap-2">
          <p className="font-display text-[30px] leading-[30px] font-bold text-ink">{detail.name}</p>
          {description ? (
            <p className="text-[14px] leading-5 text-muted">{description}</p>
          ) : (
            <StateCard variant="section" icon={FileText} title={copy.description.emptyTitle}>
              {copy.description.emptyText}
            </StateCard>
          )}
        </div>

        <CafeSection title={copy.location.title}>
          {location ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand">
                  <MapPin size={19} aria-hidden="true" />
                </span>
                <address className="flex flex-1 flex-col gap-0.5 not-italic">
                  <span className="text-[13px] font-bold text-ink">{location.street}</span>
                  <span className="text-[11px] text-muted">{location.city}</span>
                </address>
              </div>
              <CafeActionButton
                label={location.mapsHref ? copy.location.maps : copy.location.mapsUnavailable}
                icon={location.mapsHref ? MapIcon : MapPinOff}
                href={location.mapsHref}
                external
              />
            </>
          ) : (
            <StateCard variant="section" icon={MapPin} title={copy.location.emptyTitle}>
              {copy.location.emptyText}
            </StateCard>
          )}
        </CafeSection>

        <CafeSection title={copy.contact.title} hint={contact?.showHint ? copy.contact.hint : undefined}>
          {contact ? (
            <div className="flex gap-2.5">
              {contact.channels.map(({ kind, href, primary }) => {
                const meta = CHANNEL_META[kind];
                return (
                  <CafeActionButton
                    key={kind}
                    label={href ? meta.label : copy.unavailable}
                    icon={href ? meta.icon : meta.offIcon}
                    href={href}
                    tone={primary ? "primary" : "neutral"}
                    external={meta.external}
                    className="flex-1"
                  />
                );
              })}
            </div>
          ) : (
            <StateCard variant="section" icon={PhoneOff} title={copy.contact.emptyTitle}>
              {copy.contact.emptyText}
            </StateCard>
          )}
        </CafeSection>

        {links ? (
          <CafeSection
            title={copy.links.title}
            hint={links.showInactiveHint ? copy.links.inactiveHint : undefined}
            className="gap-1"
          >
            <ul className="flex flex-col gap-1">
              {links.rows.map((row) => (
                <li key={row.network}>
                  <CafeLinkRow {...row} />
                </li>
              ))}
            </ul>
          </CafeSection>
        ) : (
          <CafeSection title={copy.links.title}>
            <StateCard variant="section" icon={Link2Off} title={copy.links.emptyTitle}>
              {copy.links.emptyText}
            </StateCard>
          </CafeSection>
        )}

        <CafeSection
          title={copy.hours.title}
          aside={
            hours?.kind === "week" ? (
              <StatusPill tone="success" className="h-7! rounded-[14px]! px-2.5! text-[10px]!">
                {copy.hours.openUntil(hours.closesAt)}
              </StatusPill>
            ) : null
          }
        >
          {hours?.kind === "week" ? (
            <HoursTable rows={hours.rows} />
          ) : hours?.kind === "closed" ? (
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 outline-1 -outline-offset-[0.5px] outline-line outline-solid">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                <Clock3 size={18} aria-hidden="true" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-[13px] font-bold text-ink">{copy.hours.closedToday}</p>
                <p className="text-[11px] text-muted">{copy.hours.reopens(hours.reopens)}</p>
              </div>
            </div>
          ) : (
            <StateCard variant="section" icon={Clock3} title={copy.hours.emptyTitle}>
              {copy.hours.emptyText}
            </StateCard>
          )}
        </CafeSection>
      </main>
    </>
  );
}
