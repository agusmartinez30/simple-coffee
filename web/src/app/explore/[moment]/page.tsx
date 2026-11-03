import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOMENTS, getMomentById } from "@/mocks/moments";
import type { Moment } from "@/mocks/types";
import { MomentScreen } from "@/features/explore";

/**
 * Moments are local definitions, so their pages are prerendered; their products come from the
 * menu API and load in the browser.
 */
export function generateStaticParams() {
  return MOMENTS.map((moment) => ({ moment: moment.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/explore/[moment]">): Promise<Metadata> {
  const moment = getMomentById((await params).moment);
  return { title: moment ? `${moment.title} · Café Central` : "Café Central" };
}

export default async function ExploreMomentPage({
  params,
  searchParams,
}: PageProps<"/explore/[moment]">) {
  const moment = getMomentById((await params).moment);
  if (!moment) notFound();
  // searchParams is request-time data: the prerendered shell shows the default
  // sub-filter, and `?filter=` streams in behind Suspense (Cache Components).
  return (
    <Suspense fallback={<MomentScreen moment={moment} />}>
      <MomentResults moment={moment} searchParams={searchParams} />
    </Suspense>
  );
}

async function MomentResults({
  moment,
  searchParams,
}: {
  moment: Moment;
  searchParams: PageProps<"/explore/[moment]">["searchParams"];
}) {
  return <MomentScreen moment={moment} requestedFilterId={(await searchParams).filter} />;
}
