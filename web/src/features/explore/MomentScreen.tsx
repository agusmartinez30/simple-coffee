"use client";

import type { Moment } from "@/mocks/types";
import { MenuGate } from "@/features/menu/MenuGate";
import { ExploreResults } from "./ExploreResults";

type MomentScreenProps = {
  moment: Moment;
  /** Raw `?filter=` value; undefined in the prerendered shell. */
  requestedFilterId?: string | string[];
};

/** Explore results of a local moment, once the menu (which says its products) is loaded. */
export function MomentScreen({ moment, requestedFilterId }: MomentScreenProps) {
  return (
    <MenuGate screen>
      {/* Keyed so a new `?filter=` on the same moment resets the chip state. */}
      <ExploreResults key={String(requestedFilterId)} moment={moment} requestedFilterId={requestedFilterId} />
    </MenuGate>
  );
}
