
export interface CreateAccountPayload {
  accountName: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientTimezone?: string | null;
  salesRepName?: string | null;
  salesRepEmail?: string | null;
  salesRepPhone?: string | null;
}
