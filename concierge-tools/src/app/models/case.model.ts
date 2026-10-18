export interface Case {
  id: string;
  accountId: string;
  caseNumber: string;
  productType: string | null;
  status: string;
  orderDeadline: string | null;
  artDeadline: string | null;
  mailDate: string | null;
  notes: string | null;
}
