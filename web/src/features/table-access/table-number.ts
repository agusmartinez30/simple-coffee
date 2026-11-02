/** Table number as shown to the customer, padded to two digits: 7 → "07". */
export function formatTableNumber(number: number): string {
  return String(number).padStart(2, "0");
}
