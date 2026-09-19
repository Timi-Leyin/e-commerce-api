import { orderStatus } from "../models/Order";

export type DeliveryMethod = "home delivery" | "pick up station";

export const STATUS_META: Record<
  string,
  { key: string; label: string; step: number }
> = {
  [orderStatus.placed]: {
    key: "placed",
    label: "Order placed",
    step: 1,
  },
  [orderStatus.paid]: {
    key: "paid",
    label: "Payment confirmed",
    step: 2,
  },
  [orderStatus.pending]: {
    key: "pending",
    label: "Preparing order",
    step: 3,
  },
  [orderStatus.shipped]: {
    key: "shipped",
    label: "Shipped",
    step: 4,
  },
  [orderStatus.out]: {
    key: "out_for_delivery",
    label: "Out for delivery",
    step: 5,
  },
  [orderStatus.delivered]: {
    key: "delivered",
    label: "Delivered",
    step: 6,
  },
};

const TIMELINE_STEPS = [
  orderStatus.placed,
  orderStatus.paid,
  orderStatus.out,
  orderStatus.delivered,
] as const;

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  "home delivery": "Home delivery",
  "pick up station": "Pickup station",
};

export const normalizeStatus = (status: any) =>
  String(status || orderStatus.placed).toLowerCase().trim();

export const getStatusMeta = (status: any) => {
  const normalized = normalizeStatus(status);
  return (
    STATUS_META[normalized] || {
      key: "unknown",
      label: String(status || "Unknown"),
      step: 0,
    }
  );
};

export const canDispatchOrder = (status: any) => {
  const normalized = normalizeStatus(status);
  return (
    normalized === orderStatus.paid ||
    normalized === orderStatus.pending ||
    normalized === orderStatus.shipped ||
    normalized === orderStatus.out
  );
};

export const canConfirmReceived = (status: any) =>
  normalizeStatus(status) === orderStatus.out;

export const isDelivered = (status: any) =>
  normalizeStatus(status) === orderStatus.delivered;

export const buildDeliveryTimeline = (order: {
  status?: any;
  createdAt?: any;
  updatedAt?: any;
  dispatched_at?: any;
  delivered_at?: any;
}) => {
  const current = getStatusMeta(order.status);
  const createdAt = order.createdAt || null;
  const updatedAt = order.updatedAt || null;

  return TIMELINE_STEPS.map((statusValue) => {
    const meta = STATUS_META[statusValue];
    const completed = current.step >= meta.step;
    const isCurrent = current.key === meta.key;

    let at: string | null = null;
    if (statusValue === orderStatus.placed) {
      at = createdAt ? String(createdAt) : null;
    } else if (statusValue === orderStatus.out) {
      at = order.dispatched_at
        ? String(order.dispatched_at)
        : completed
          ? String(updatedAt || "")
          : null;
    } else if (statusValue === orderStatus.delivered) {
      at = order.delivered_at
        ? String(order.delivered_at)
        : completed
          ? String(updatedAt || "")
          : null;
    } else if (completed) {
      at = updatedAt ? String(updatedAt) : createdAt ? String(createdAt) : null;
    }

    return {
      key: meta.key,
      label: meta.label,
      status: statusValue,
      completed,
      current: isCurrent,
      at: at || null,
    };
  });
};

export const formatDeliveryMethod = (method: any) => {
  const value = String(method || "").toLowerCase().trim();
  return {
    value: value || null,
    label: DELIVERY_METHOD_LABELS[value] || (value ? String(method) : null),
  };
};

export const formatOrderDelivery = (
  orderRaw: any,
  addressRaw?: any | null,
) => {
  const order =
    typeof orderRaw?.get === "function" ? orderRaw.get() : { ...orderRaw };
  const address =
    addressRaw && typeof addressRaw?.get === "function"
      ? addressRaw.get()
      : addressRaw || null;

  const statusMeta = getStatusMeta(order.status);
  const deliveryMethod = formatDeliveryMethod(order.delivery_method);
  const timeline = buildDeliveryTimeline(order);
  const confirmable = canConfirmReceived(order.status);

  return {
    ...order,
    statusKey: statusMeta.key,
    statusLabel: statusMeta.label,
    deliveryMethod: deliveryMethod.value,
    deliveryMethodLabel: deliveryMethod.label,
    canConfirmReceived: confirmable,
    timeline,
    deliveryAddress: address
      ? {
          id: address.id,
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
          additionalPhone: address.additional_phone || null,
          country: address.country,
          region: address.region,
          city: address.city,
          isDefault: Boolean(address.isDefault),
        }
      : null,
  };
};
