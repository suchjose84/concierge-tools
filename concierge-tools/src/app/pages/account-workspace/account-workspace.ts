
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AccountsService,
  NewCaseDetails
} from '../../services/accounts.service';

import { Account } from '../../models/account.model';
import { Case } from '../../models/case.model';

interface UpdateAccountDetails {
  accountName: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientTimezone: string | null;
  salesRepName: string | null;
  salesRepEmail: string | null;
  salesRepPhone: string | null;
}

@Component({
  selector: 'app-account-workspace',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-workspace.html',
  styleUrl: './account-workspace.css'
})
export class AccountWorkspaceComponent implements OnInit, OnDestroy {
  account = signal<Account | null>(null);

  editing = signal(false);
  saving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  addingCase = signal(false);
  caseForm: NewCaseDetails = this.emptyCaseForm();

  editForm: UpdateAccountDetails = this.emptyForm();

  copiedLabel = signal('');

  // Selected cases for the shared Activity Workspace.
  selectedCaseIds = signal<string[]>([]);

  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService
  ) {}

  async ngOnInit(): Promise<void> {
    const accountId = this.route.snapshot.paramMap.get('id');

    if (!accountId) {
      this.errorMessage.set('Missing account ID.');
      return;
    }

    try {
      const accounts = await this.accountsService.getAccounts();

      const foundAccount = accounts.find(
        item => item.id === accountId
      );

      if (foundAccount) {
        this.account.set(foundAccount);

        // Select all cases by default.
        this.selectedCaseIds.set(
          foundAccount.cases.map(caseItem => caseItem.id)
        );
      } else {
        this.errorMessage.set(
          'Account not found or no longer active.'
        );
      }
    } catch (error) {
      console.error('Error loading account:', error);
      this.errorMessage.set('Unable to load account details.');
    }
  }

  ngOnDestroy(): void {
    if (this.copyResetTimer) {
      clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }
  }

  // --------------------------------------------------
  // Account editing
  // --------------------------------------------------

  startEditing(): void {
    const account = this.account();

    if (!account) return;

    this.editForm = {
      accountName: account.accountName ?? '',
      clientName: account.clientName ?? '',
      clientEmail: account.clientEmail ?? '',
      clientPhone: account.clientPhone ?? '',
      clientTimezone: account.clientTimezone ?? '',
      salesRepName: account.salesRepName ?? '',
      salesRepEmail: account.salesRepEmail ?? '',
      salesRepPhone: account.salesRepPhone ?? ''
    };

    this.errorMessage.set('');
    this.successMessage.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.errorMessage.set('');
  }

  async saveAccount(): Promise<void> {
    const account = this.account();

    if (!account || this.saving()) return;

    if (!this.editForm.accountName.trim()) {
      this.errorMessage.set('Account Name is required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload: UpdateAccountDetails = {
      accountName: this.editForm.accountName.trim(),
      clientName: this.cleanValue(this.editForm.clientName),
      clientEmail: this.cleanValue(this.editForm.clientEmail),
      clientPhone: this.cleanValue(this.editForm.clientPhone),
      clientTimezone: this.cleanValue(this.editForm.clientTimezone),
      salesRepName: this.cleanValue(this.editForm.salesRepName),
      salesRepEmail: this.cleanValue(this.editForm.salesRepEmail),
      salesRepPhone: this.cleanValue(this.editForm.salesRepPhone)
    };

    try {
      await this.accountsService.updateAccount(
        account.id,
        payload
      );

      this.account.set({
        ...account,
        ...payload
      });

      this.editing.set(false);
      this.successMessage.set('Account updated successfully.');
    } catch (error) {
      console.error('Error updating account:', error);

      this.errorMessage.set(
        'Unable to save account changes. Please try again.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  private cleanValue(value: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private emptyForm(): UpdateAccountDetails {
    return {
      accountName: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientTimezone: '',
      salesRepName: '',
      salesRepEmail: '',
      salesRepPhone: ''
    };
  }

  // --------------------------------------------------
  // Case selection
  // --------------------------------------------------

  toggleCaseSelection(caseId: string): void {
    this.selectedCaseIds.update(selected =>
      selected.includes(caseId)
        ? selected.filter(id => id !== caseId)
        : [...selected, caseId]
    );
  }

  isCaseSelected(caseId: string): boolean {
    return this.selectedCaseIds().includes(caseId);
  }

  clearCaseSelection(): void {
    this.selectedCaseIds.set([]);
  }

  /**
   * Opens the same Activity Workspace for one or multiple cases.
   */
  openSharedActivity(): void {
    const account = this.account();
    const selectedIds = this.selectedCaseIds();

    if (!account || selectedIds.length === 0) {
      return;
    }

    this.router.navigate(
      ['/accounts', account.id, 'shared-activity'],
      {
        queryParams: {
          cases: selectedIds.join(',')
        }
      }
    );
  }

  /**
   * Clicking an individual case opens the same Activity Workspace,
   * with only that case selected.
   */
  openCase(caseItem: Case): void {
    const account = this.account();

    if (!account) return;

    this.router.navigate(
      ['/accounts', account.id, 'shared-activity'],
      {
        queryParams: {
          cases: caseItem.id
        }
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/accounts']);
  }

  // --------------------------------------------------
  // Copy to clipboard
  // --------------------------------------------------

  async copyText(value: string, label: string): Promise<void> {
    if (!value?.trim()) return;

    try {
      await navigator.clipboard.writeText(value.trim());

      this.copiedLabel.set(label);

      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
      }

      this.copyResetTimer = setTimeout(() => {
        this.copiedLabel.set('');
        this.copyResetTimer = null;
      }, 1500);
    } catch (error) {
      console.error('Unable to copy text:', error);
    }
  }

  // --------------------------------------------------
  // Deadline formatting
  // --------------------------------------------------

  formatDeadline(value: string): string {
    const datePart = value.slice(0, 10);
    const parts = datePart.split('-');

    if (parts.length !== 3) return value;

    const [year, month, day] = parts.map(Number);

    if (!year || !month || !day) return value;

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // --------------------------------------------------
  // Add Case
  // --------------------------------------------------

  private emptyCaseForm(): NewCaseDetails {
    return {
      caseNumber: '',
      productType: '',
      orderDeadline: null,
      artDeadline: null,
      mailDate: null,
      notes: ''
    };
  }

  startAddingCase(): void {
    this.caseForm = this.emptyCaseForm();
    this.errorMessage.set('');
    this.successMessage.set('');
    this.addingCase.set(true);
  }

  cancelAddingCase(): void {
    this.addingCase.set(false);
    this.caseForm = this.emptyCaseForm();
    this.errorMessage.set('');
  }

  private toIsoDate(
    value: string | null,
    includeTime: boolean
  ): string | null {
    const text = String(value ?? '').trim();

    if (!text) return null;

    const pattern = includeTime
      ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

    const match = text.match(pattern);

    if (!match) {
      throw new Error(
        includeTime
          ? `Invalid date format: "${text}". Use M/D/YYYY h:mm AM/PM, e.g. 10/27/2026 2:00 PM.`
          : `Invalid date format: "${text}". Use M/D/YYYY, e.g. 11/6/2026.`
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

  async saveNewCase(): Promise<void> {
    const account = this.account();

    if (!account || this.saving()) return;

    if (!this.caseForm.caseNumber.trim()) {
      this.errorMessage.set('Case number is required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const payload = {
        accountId: account.id,
        account: null,
        cases: [
          {
            caseNumber: this.caseForm.caseNumber.trim(),
            productType: this.cleanValue(this.caseForm.productType),
            orderDeadline: this.toIsoDate(
              this.caseForm.orderDeadline,
              true
            ),
            artDeadline: this.toIsoDate(
              this.caseForm.artDeadline,
              true
            ),
            mailDate: this.toIsoDate(
              this.caseForm.mailDate,
              false
            ),
            notes: this.cleanValue(this.caseForm.notes)
          }
        ]
      };

      await this.accountsService.createAccountWithCases(payload);

      const accounts = await this.accountsService.getAccounts();

      const updatedAccount = accounts.find(
        item => item.id === account.id
      );

      if (!updatedAccount) {
        throw new Error(
          'The case was saved, but the account could not be refreshed. Please reload the page.'
        );
      }

      this.account.set(updatedAccount);
      // Keep all cases selected after adding a new case.
      this.selectedCaseIds.set(
        updatedAccount.cases.map(caseItem => caseItem.id)
      );
      this.addingCase.set(false);
      this.caseForm = this.emptyCaseForm();

      this.successMessage.set('Case added successfully.');
    } catch (error: any) {
      console.error('Error adding case:', error);

      this.errorMessage.set(
        error?.error?.message ??
        error?.message ??
        'Unable to add the case. Please try again.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  areAllCasesSelected(): boolean {
    const cases = this.account()?.cases ?? [];
    const selected = this.selectedCaseIds();

    return cases.length > 0 &&
      cases.every(caseItem => selected.includes(caseItem.id));
  }

  toggleSelectAllCases(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const account = this.account();

    this.selectedCaseIds.set(
      checked && account
        ? account.cases.map(caseItem => caseItem.id)
        : []
    );
  }



}
