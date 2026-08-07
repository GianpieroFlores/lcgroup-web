export const DELIVERY_COST = 15;
export const FREE_DELIVERY_THRESHOLD = 500;

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDeliveryTotals(productSubtotal) {
  const subtotal = roundCurrency(
    Math.max(0, Number(productSubtotal) || 0),
  );
  const hasFreeDelivery = subtotal > FREE_DELIVERY_THRESHOLD;
  const delivery =
    subtotal === 0 || hasFreeDelivery ? 0 : DELIVERY_COST;
  const total = roundCurrency(subtotal + delivery);
  const amountUntilFreeDelivery =
    subtotal > 0 && !hasFreeDelivery
      ? roundCurrency(FREE_DELIVERY_THRESHOLD + 0.01 - subtotal)
      : 0;

  return {
    subtotal,
    delivery,
    total,
    hasFreeDelivery,
    amountUntilFreeDelivery,
  };
}
