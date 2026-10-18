
import { Case } from './case.model';

export interface Account {
  id: string;
  accountName: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientTimezone: string | null;
  salesRepName: string | null;
  salesRepEmail: string | null;
  salesRepPhone: string | null;
  notes?: string | null;
  cases: Case[];
}
