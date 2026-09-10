export const DELIVERY_COST = 15;
export const FREE_DELIVERY_THRESHOLD = 300;
export const DEFAULT_DELIVERY_ZONE = "zone1";

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDeliveryTotals(productSubtotal, deliveryZone = DEFAULT_DELIVERY_ZONE) {
  const subtotal = roundCurrency(
    Math.max(0, Number(productSubtotal) || 0),
  );
  const isZoneOne = deliveryZone === "zone1";
  const deliveryRequiresCoordination = !isZoneOne;
  const hasFreeDelivery =
    isZoneOne && subtotal >= FREE_DELIVERY_THRESHOLD;
  const delivery =
    subtotal === 0 || hasFreeDelivery || deliveryRequiresCoordination
      ? 0
      : DELIVERY_COST;
  const total = roundCurrency(subtotal + delivery);
  const amountUntilFreeDelivery =
    subtotal > 0 && isZoneOne && !hasFreeDelivery
      ? roundCurrency(FREE_DELIVERY_THRESHOLD - subtotal)
      : 0;

  return {
    subtotal,
    delivery,
    total,
    hasFreeDelivery,
    amountUntilFreeDelivery,
    deliveryRequiresCoordination,
    deliveryZone,
  };
}
