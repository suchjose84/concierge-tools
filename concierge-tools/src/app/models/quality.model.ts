export interface ChecklistItem {
  label: string;
  checked: boolean;
  note: string;
}

export interface ChecklistSection {
  title: string;
  expanded: boolean;
  items: ChecklistItem[];
}