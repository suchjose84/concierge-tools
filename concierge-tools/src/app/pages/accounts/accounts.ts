import { Component, OnInit, signal, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { Account } from '../../models/account.model';
@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css',
})
export class AccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  accounts = signal<Account[]>([]);
  showForm = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  timezones = ['Eastern', 'Central', 'Mountain', 'Pacific'];
  form = this.fb.group({
    accountName: ['', Validators.required],
    clientName: [''],
    clientEmail: [''],
    clientPhone: [''],
    clientTimezone: [''],
    salesRepName: [''],
    salesRepEmail: [''],
    salesRepPhone: [''],
    cases: this.fb.array([this.createCaseForm()]),
  });
  statusFilter = 'All Accounts';
  timezoneFilter = 'All Timezones';

  constructor(
    private accountsService: AccountsService,
    private router: Router
  ) {}
  get cases(): FormArray {
    return this.form.get('cases') as FormArray;
  }
  async ngOnInit(): Promise<void> {
    await this.loadAccounts();
  }
  async loadAccounts(): Promise<void> {
    try {
      const data = await this.accountsService.getAccounts();
      const sortedAccounts = [...(data ?? [])].sort((a, b) => {
        const deadlineA = this.getAccountDeadline(a)?.getTime()
          ?? Number.POSITIVE_INFINITY;
        const deadlineB = this.getAccountDeadline(b)?.getTime()
          ?? Number.POSITIVE_INFINITY;
        return deadlineA - deadlineB;
      });
      this.accounts.set(sortedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.errorMessage.set('Unable to load accounts.');
    }
  }

  getRelevantDeadline(
    caseItem: Account['cases'][number]
  ): Date | null {
    const isPendingRepAction =
      caseItem.status?.trim().toLowerCase() === 'pending rep action';

    const deadline = isPendingRepAction
      ? caseItem.orderDeadline
      : caseItem.artDeadline;

    if (!deadline) {
      return null;
    }

    return this.getAdjustedDeadline(deadline);
  }

  private getAdjustedDeadline(value: string | Date): Date | null {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    // Move the deadline one calendar day earlier.
    date.setUTCDate(date.getUTCDate() - 1);

    return date;
  }

getAccountDeadline(account: Account): Date | null {
  const deadlines = account.cases
    .map((caseItem) => this.getRelevantDeadline(caseItem))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return deadlines[0] ?? null;
}

  getDeadlineTone(
    account: Account
  ): 'overdue' | 'urgent' | 'approaching' | 'normal' | 'none' {
    const deadline = this.getAccountDeadline(account);
    if (!deadline) {
      return 'none';
    }
    const businessDaysLeft = this.getBusinessDaysDifference(new Date(), deadline);
    if (businessDaysLeft < 0) return 'overdue';
    if (businessDaysLeft <= 3) return 'urgent';
    if (businessDaysLeft <= 10) return 'approaching';
    return 'normal';
  }

  private getEasternDate(date: Date): Date {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);
    const year = Number(parts.find(part => part.type === 'year')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const day = Number(parts.find(part => part.type === 'day')?.value);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private getBusinessDaysDifference(fromDate: Date, toDate: Date): number {
    const start = this.getEasternDate(fromDate);
    const end = this.getEasternDate(toDate);
    if (start.getTime() === end.getTime()) {
      return 0;
    }
    const direction = start < end ? 1 : -1;
    const cursor = new Date(start);
    let businessDays = 0;
    while (cursor.getTime() !== end.getTime()) {
      cursor.setUTCDate(cursor.getUTCDate() + direction);
      const day = cursor.getUTCDay();
      if (day !== 0 && day !== 6) {
        businessDays += direction;
      }
    }
    return businessDays;
  }

  getCaseDeadlineTypeLabel(caseItem: Account['cases'][number]): string {
    return caseItem.status?.trim().toLowerCase() === 'pending rep action'
      ? 'Order deadline'
      : 'Art deadline';
  }

  getCaseDeadlineDateLabel(deadline: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(deadline);
  }

  getCaseDeadlineLabel(caseItem: Account['cases'][number]): string {
    const deadline = this.getRelevantDeadline(caseItem);
    if (!deadline) {
      return 'No deadline';
    }
    const daysLeft = this.getBusinessDaysDifference(new Date(), deadline);
    if (daysLeft < 0) {
      const daysOverdue = Math.abs(daysLeft);
      return `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
    }
    if (daysLeft === 0) {
      return 'Due today';
    }
    return `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  }

  needsAttention(account: Account): boolean {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return account.cases.some((caseItem) => {
      if (
        caseItem.status?.trim().toLowerCase() !== 'pending rep action' ||
        !caseItem.orderDeadline
      ) {
        return false;
      }
      const deadline = new Date(caseItem.orderDeadline).getTime();
      return (
        !Number.isNaN(deadline) &&
        deadline - now <= threeDays
      );
    });
  }

  getPendingRepActionCount(account: Account): number {
    return account.cases.filter((caseItem) => {
      if (
        caseItem.status?.trim().toLowerCase() !== 'pending rep action' ||
        !caseItem.orderDeadline
      ) {
        return false;
      }
      const deadline = new Date(caseItem.orderDeadline).getTime();
      return (
        !Number.isNaN(deadline) &&
        deadline - Date.now() <= 3 * 24 * 60 * 60 * 1000
      );
    }).length;
  }

  createCaseForm() {
    return this.fb.group({
      caseNumber: ['', Validators.required],
      productType: [''],
      orderDeadline: [''],
      artDeadline: [''],
      mailDate: [''],
      notes: [''],
    });
  }

  addCase(): void {
    this.cases.push(this.createCaseForm());
  }

  removeCase(index: number): void {
    if (this.cases.length > 1) {
      this.cases.removeAt(index);
    }
  }

  openCreateForm(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.form.reset({
      accountName: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientTimezone: '',
      salesRepName: '',
      salesRepEmail: '',
      salesRepPhone: '',
    });
    this.cases.clear();
    this.cases.push(this.createCaseForm());
  }

  private nullableText(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private toIsoDate(
    value: unknown,
    includeTime: boolean
  ): string | null {
    const text = String(value ?? '').trim();
    if (!text) {
      return null;
    }
    const pattern = includeTime
        ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = text.match(pattern);
    if (!match) {
      throw new Error(
        `Invalid date format: "${text}". Please use the Salesforce date format.`
      );
    }
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    let hours = 0;
    let minutes = 0;
    if (includeTime) {
      hours = Number(match[4]);
      minutes = Number(match[5]);
      const period = match[6].toUpperCase();
      if (hours < 1 || hours > 12 || minutes > 59) {
        throw new Error(`Invalid time: "${text}".`);
      }
      hours = hours % 12;
      if (period === 'PM') {
        hours += 12;
      }
    }
    const date = new Date(year, month - 1, day, hours, minutes);
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(`Invalid date: "${text}".`);
    }
    return date.toISOString();
  }
  async saveAccountAndCases(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(
        'Please complete the required fields.'
      );
      return;
    }
    const values = this.form.getRawValue();
    this.saving.set(true);
    try {
      const payload = {
        accountId: null,
        account: {
          accountName: values.accountName!.trim(),
          clientName: this.nullableText(values.clientName),
          clientEmail: this.nullableText(values.clientEmail),
          clientPhone: this.nullableText(values.clientPhone),
          clientTimezone: this.nullableText(values.clientTimezone),
          salesRepName: this.nullableText(values.salesRepName),
          salesRepEmail: this.nullableText(values.salesRepEmail),
          salesRepPhone: this.nullableText(values.salesRepPhone),
        },
        cases: values.cases.map((item) => ({
          caseNumber: item.caseNumber!.trim(),
          productType: this.nullableText(item.productType),
          orderDeadline: this.toIsoDate(
            item.orderDeadline,
            true
          ),
          artDeadline: this.toIsoDate(
            item.artDeadline,
            true
          ),
          mailDate: this.toIsoDate(
            item.mailDate,
            false
          ),
          notes: this.nullableText(item.notes),
        })),
      };
      const result =
        await this.accountsService.createAccountWithCases(payload);
      await this.loadAccounts();
      this.closeForm();
      this.successMessage.set(
        `Successfully created account and saved ${result.casesCreated} case(s).`
      );
    } catch (error: any) {
      console.error('Error creating account and cases:', error);
      this.errorMessage.set(
        error?.error?.message ??
          error?.message ??
          'Unable to create the account and cases. Please check the information and try again.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  openAccount(account: Account): void {
    this.router.navigate(['/accounts', account.id]);
  }
  async closeAccount(account: Account): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to close "${account.accountName}"? This account will no longer appear in the active accounts list.`
    );
    if (!confirmed) {
      return;
    }
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.accountsService.closeAccount(account.id);
      await this.loadAccounts();
      this.successMessage.set(
        `Account "${account.accountName}" has been closed successfully.`
      );
    } catch (error: any) {
      console.error('Error closing account:', error);
      this.errorMessage.set(
        error?.error?.message ?? 'Unable to close account. Please try again.'
      );
    }
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
  }

  setTimezoneFilter(timezone: string): void {
    this.timezoneFilter = timezone;
  }

  resetFilters(): void {
    this.statusFilter = 'All Accounts';
    this.timezoneFilter = 'All Timezones';
  }

  filteredAccounts() {
    return this.accounts().filter(account => {
      const matchesStatus = this.statusFilter === 'All Accounts'
        || account.cases?.some(caseItem => caseItem.status === this.statusFilter);
      const accountTimezone = (account.clientTimezone ?? '').toLowerCase();
      const selectedTimezone = this.timezoneFilter.toLowerCase();
      const matchesTimezone = this.timezoneFilter === 'All Timezones'
        || accountTimezone.includes(selectedTimezone);
      return matchesStatus && matchesTimezone;
    });
  }

  getStatusFilterCount(status: string): number {
    if (status === 'All Accounts') {
      return this.accounts().length;
    }
    return this.accounts().filter(account =>
      account.cases?.some(caseItem => caseItem.status === status)
    ).length;
  }
}
