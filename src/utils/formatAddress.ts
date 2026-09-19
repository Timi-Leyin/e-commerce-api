export type AddressRecord = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  additional_phone?: string | null;
  additionalPhone?: string | null;
  country?: string;
  region?: string;
  city?: string;
  street?: string | null;
  landmark?: string | null;
  label?: string | null;
  isDefault?: boolean;
};

const clean = (value: any) => {
  const text = String(value ?? "").trim();
  return text || null;
};

/** Normalize Nigerian-style phones to +234... when possible. */
export const normalizePhone = (phone: any) => {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("234") && digits.length >= 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 11) {
    return `+234${digits.slice(1)}`;
  }
  if (/^\d{10}$/.test(digits)) return `+234${digits}`;
  return raw;
};

export const formatAddress = (raw: any) => {
  const data =
    raw && typeof raw.get === "function" ? raw.get({ plain: true }) : { ...raw };

  const firstName = clean(data.firstName) || "";
  const lastName = clean(data.lastName) || "";
  const city = clean(data.city) || "";
  const region = clean(data.region) || "";
  const country = clean(data.country) || "Nigeria";
  const street = clean(data.street);
  const landmark = clean(data.landmark);
  const label = clean(data.label);
  const additionalPhone = clean(
    data.additionalPhone ?? data.additional_phone,
  );

  const lineParts = [street, city, region, country].filter(Boolean);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    id: data.id,
    firstName,
    lastName,
    fullName: fullName || null,
    phone: normalizePhone(data.phone),
    additionalPhone,
    country,
    region,
    city,
    street,
    landmark,
    label,
    isDefault: Boolean(data.isDefault),
    formatted: lineParts.join(", "),
  };
};

export const formatAddressList = (rows: any[]) =>
  (rows || []).map((row) => formatAddress(row));
