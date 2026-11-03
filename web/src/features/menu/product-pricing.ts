import type { Ars, Product } from "@/mocks/types";

/** Unit price for a product with the given selected choice ids (unknown ids are ignored). */
export function getUnitPrice(product: Product, choiceIds: readonly string[]): Ars {
  const deltas = (product.optionGroups ?? [])
    .flatMap((group) => group.choices)
    .filter((choice) => choiceIds.includes(choice.id))
    .reduce((sum, choice) => sum + choice.priceDelta, 0);
  return product.price + deltas;
}

/** Choice ids of the default configuration: each group's preselected choice. */
export function getDefaultChoiceIds(product: Product): string[] {
  return (product.optionGroups ?? []).flatMap((group) =>
    group.defaultChoiceId ? [group.defaultChoiceId] : [],
  );
}

/** Labels of the selected choices joined as shown in the designs: "Mediano · Leche de almendras". */
export function describeChoices(product: Product, choiceIds: readonly string[]): string {
  return (product.optionGroups ?? [])
    .flatMap((group) => group.choices)
    .filter((choice) => choiceIds.includes(choice.id))
    .map((choice) => choice.label)
    .join(" · ");
}
