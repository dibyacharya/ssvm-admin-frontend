export const MODE_OF_DELIVERY = Object.freeze({
  REGULAR: "REGULAR",
  ONLINE: "ONLINE",
  WILP: "WILP",
});

export const MODE_OF_DELIVERY_OPTIONS = [
  { value: MODE_OF_DELIVERY.REGULAR, label: "Regular" },
  { value: MODE_OF_DELIVERY.ONLINE, label: "Online" },
  { value: MODE_OF_DELIVERY.WILP, label: "WILP" },
];

const CANONICAL_BY_TOKEN = {
  REGULAR: MODE_OF_DELIVERY.REGULAR,
  "REGULAR PROGRAM": MODE_OF_DELIVERY.REGULAR,
  OFFLINE: MODE_OF_DELIVERY.REGULAR,
  ONCAMPUS: MODE_OF_DELIVERY.REGULAR,
  "ON CAMPUS": MODE_OF_DELIVERY.REGULAR,
  CAMPUS: MODE_OF_DELIVERY.REGULAR,
  ONLINE: MODE_OF_DELIVERY.ONLINE,
  "ONLINE PROGRAM": MODE_OF_DELIVERY.ONLINE,
  "ONLINE MODE": MODE_OF_DELIVERY.ONLINE,
  ONLINEMODE: MODE_OF_DELIVERY.ONLINE,
  WILP: MODE_OF_DELIVERY.WILP,
};

export const normalizeModeOfDeliveryValue = (value) => {
  const token = String(value || "").trim().toUpperCase();
  if (!token) return "";
  return CANONICAL_BY_TOKEN[token] || "";
};

export const getModeOfDeliveryLabel = (value, fallback = "-") => {
  const normalized = normalizeModeOfDeliveryValue(value);
  if (!normalized) return fallback;
  const match = MODE_OF_DELIVERY_OPTIONS.find((option) => option.value === normalized);
  return match?.label || normalized;
};
