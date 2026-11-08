import { RESORT } from "@/lib/resort";

const digits = RESORT.phone.replace(/[^\d+]/g, "");

export const CONTACT = {
  phoneLabel: RESORT.phone,
  tel: `tel:${digits}`,
  whatsapp: `https://wa.me/${digits.replace("+", "")}`,
  email: RESORT.email,
  mailto: `mailto:${RESORT.email}`,
};
