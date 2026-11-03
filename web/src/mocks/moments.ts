import type { Moment, MomentId } from "./types";

const img = (slug: string) => `/images/moments/${slug}.webp`;

/** Moment definitions (copy and imagery) stay local; their products come from the menu API. */
export const MOMENTS: Moment[] = [
  {
    id: "para-desayunar",
    title: "Para desayunar",
    subtitle: "Empezá bien el día",
    image: img("para-desayunar"),
  },
  {
    id: "para-merendar",
    title: "Para merendar",
    subtitle: "Una pausa rica",
    image: img("para-merendar"),
  },
  {
    id: "para-cenar",
    title: "Para cenar",
    subtitle: "Algo para disfrutar",
    image: img("para-cenar"),
  },
  {
    id: "para-tomar",
    title: "Para tomar",
    subtitle: "Frías, calientes y más",
    image: img("para-tomar"),
  },
];

export function getMomentById(id: string): Moment | undefined {
  return MOMENTS.find((moment) => moment.id === (id as MomentId));
}
