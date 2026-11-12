
import { Component, OnInit, OnDestroy, HostListener, signal } from '@angular/core';

import { CanDeactivateFn } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AccountsService,
  NewCaseDetails,
  UpdateCaseDetails
} from '../../services/accounts.service';

import { AccountActivitiesService } from '../../services/account-activities.service';

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

interface SelectedActivityCase {
  caseItem: Case;
  endingStatus: string;
}

@Component({
  selector: 'app-account-workspace',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-workspace.html',
  styleUrl: './account-workspace.css'
})
export class AccountWorkspaceComponent implements OnInit, OnDestroy {

  // --------------------------------------------------
  // Account state
  // --------------------------------------------------

  account = signal<Account | null>(null);

  editing = signal(false);
  saving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  addingCase = signal(false);
  caseForm: NewCaseDetails = this.emptyCaseForm();

  editingCaseId = signal<string | null>(null);
  caseEditForm: UpdateCaseDetails = this.emptyCaseEditForm();
  caseSaving = signal(false);
  editForm: UpdateAccountDetails = this.emptyForm();

  copiedLabel = signal('');

  // --------------------------------------------------
  // Case selection
  // --------------------------------------------------

  selectedCaseIds = signal<string[]>([]);

  

  // --------------------------------------------------
  // Activity workspace
  // --------------------------------------------------

  activityCases = signal<SelectedActivityCase[]>([]);
  activityElapsedSeconds = signal(0);

  activityNote = '';

  isActivityRunning = false;
  activitySaving = false;

  activityStartedAt: Date | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  statuses = [
    'Proof Out',
    'Hold',
    'Working',
    'Pending Rep Action',
    'For Approval',
    'Completed',
    'Cancelled',
    'Re-assigned',
    'Crit Change'
  ];

  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private currentRunStartedAt: Date | null = null;
  private activityEndedAt: Date | null = null;
  private accumulatedElapsedSeconds = 0;

  showDiscardConfirmation = signal(false);
  private discardResolver: ((confirmed: boolean) => void) | null = null;

  // --------------------------------------------------
  // Private properties
  // --------------------------------------------------

  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService,
    private accountActivitiesService: AccountActivitiesService
  ) {}

  // --------------------------------------------------
  // Initialization and cleanup
  // --------------------------------------------------

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

        this.syncActivityCases();
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

    this.clearActivityTimer();
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
    if (this.isActivityRunning || this.activitySaving) return;

    this.selectedCaseIds.update(selected =>
      selected.includes(caseId)
        ? selected.filter(id => id !== caseId)
        : [...selected, caseId]
    );

    this.syncActivityCases();
  }

  isCaseSelected(caseId: string): boolean {
    return this.selectedCaseIds().includes(caseId);
  }

  clearCaseSelection(): void {
    if (this.isActivityRunning || this.activitySaving) return;

    this.selectedCaseIds.set([]);
    this.syncActivityCases();
  }

  areAllCasesSelected(): boolean {
    const cases = this.account()?.cases ?? [];
    const selected = this.selectedCaseIds();

    return cases.length > 0 &&
      cases.every(caseItem => selected.includes(caseItem.id));
  }

  toggleSelectAllCases(event: Event): void {
    if (this.isActivityRunning || this.activitySaving) return;

    const checked = (event.target as HTMLInputElement).checked;
    const account = this.account();

    this.selectedCaseIds.set(
      checked && account
        ? account.cases.map(caseItem => caseItem.id)
        : []
    );

    this.syncActivityCases();
  }

  /**
   * Synchronizes the selected cases with the activity workspace.
   * Existing ending statuses are preserved when selection changes.
   */
  private syncActivityCases(): void {
    const account = this.account();

    if (!account) {
      this.activityCases.set([]);
      return;
    }

    const selectedIds = this.selectedCaseIds();
    const currentActivityCases = this.activityCases();

    this.activityCases.set(
      account.cases
        .filter(caseItem => selectedIds.includes(caseItem.id))
        .map(caseItem => {
          const existing = currentActivityCases.find(
            item => item.caseItem.id === caseItem.id
          );

          return {
            caseItem,
            endingStatus: existing?.endingStatus ?? caseItem.status
          };
        })
    );
  }

  // --------------------------------------------------
  // Activity timer
  // --------------------------------------------------

  startActivity(): void {
    if (
      this.isActivityRunning ||
      this.activitySaving ||
      this.activityCases().length === 0
    ) {
      return;
    }

    this.message = '';

    if (!this.activityStartedAt) {
      this.activityStartedAt = new Date();
      this.accumulatedElapsedSeconds = 0;
      this.activityElapsedSeconds.set(0);
    }

    this.startTimerInterval();
  }

  private startTimerInterval(): void {
    if (this.isActivityRunning) return;

    this.activityEndedAt = null;
    this.currentRunStartedAt = new Date();
    this.isActivityRunning = true;

    this.clearActivityTimer();

    this.activityTimer = setInterval(() => {
      if (!this.currentRunStartedAt) return;

      const currentRunSeconds = Math.floor(
        (Date.now() - this.currentRunStartedAt.getTime()) / 1000
      );

      this.activityElapsedSeconds.set(
        this.accumulatedElapsedSeconds + currentRunSeconds
      );
    }, 1000);
  }

  stopActivityTimer(): void {
    if (!this.isActivityRunning || !this.currentRunStartedAt) {
      return;
    }

    const currentRunSeconds = Math.floor(
      (Date.now() - this.currentRunStartedAt.getTime()) / 1000
    );

    this.accumulatedElapsedSeconds += currentRunSeconds;

    this.activityElapsedSeconds.set(
      this.accumulatedElapsedSeconds
    );

    this.activityEndedAt = new Date();
    this.currentRunStartedAt = null;
    this.isActivityRunning = false;

    this.clearActivityTimer();
  }

  resumeActivity(): void {
    if (
      this.isActivityRunning ||
      this.activitySaving ||
      !this.activityStartedAt
    ) {
      return;
    }

    this.startTimerInterval();
  }

  private clearActivityTimer(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  // --------------------------------------------------
  // Activity formatting
  // --------------------------------------------------

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${formattedMinutes}:${formattedSeconds}`;
    }

    return `${formattedMinutes}:${formattedSeconds}`;
  }

  // --------------------------------------------------
  // Save shared activity
  // --------------------------------------------------

  async saveSharedActivity(): Promise<void> {
    if (this.isActivityRunning || this.activitySaving) {
      this.setActivityMessage(
        'Stop the timer before saving the activity.',
        'error'
      );
      return;
    }

    const account = this.account();
    const startedAt = this.activityStartedAt;
    const endedAt = this.activityEndedAt;
    const cases = this.activityCases();

    if (!account || !startedAt || !endedAt) {
      this.setActivityMessage(
        'Start and stop the activity timer before saving.',
        'error'
      );
      return;
    }

    if (!this.activityNote.trim()) {
      this.setActivityMessage(
        'Please describe what you did.',
        'error'
      );
      return;
    }

    if (cases.length === 0) {
      this.setActivityMessage('No cases selected.', 'error');
      return;
    }

    if (cases.some(item => !item.endingStatus.trim())) {
      this.setActivityMessage(
        'Please select an ending status for every case.',
        'error'
      );
      return;
    }

    this.activitySaving = true;
    this.message = '';

    try {
      await this.accountActivitiesService.saveSharedActivity(
        account.id,
        {
          note: this.activityNote.trim(),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSeconds: this.activityElapsedSeconds(),
          cases: cases.map(item => ({
            caseId: item.caseItem.id,
            endingStatus: item.endingStatus
          }))
        }
      );

      // Refresh account and case statuses after saving.
      const accounts = await this.accountsService.getAccounts();

      const updatedAccount = accounts.find(
        item => item.id === account.id
      );

      if (updatedAccount) {
        this.account.set(updatedAccount);

        this.selectedCaseIds.set(
          updatedAccount.cases.map(caseItem => caseItem.id)
        );

        this.activityCases.set([]);
        this.syncActivityCases();
      }

      this.resetActivity();

      this.setActivityMessage(
        'Activity saved successfully.',
        'success'
      );

      await this.router.navigate(['/accounts']);

    } catch (error) {
      console.error('Error saving activity:', error);

      this.setActivityMessage(
        'Could not save activity. You can try saving again.',
        'error'
      );

    } finally {
      this.activitySaving = false;
    }
  }

  private resetActivity(): void {
    this.clearActivityTimer();

    this.isActivityRunning = false;
    this.activityStartedAt = null;
    this.activityEndedAt = null;
    this.currentRunStartedAt = null;
    this.accumulatedElapsedSeconds = 0;

    this.activityElapsedSeconds.set(0);
    this.activityNote = '';
  }

  private setActivityMessage(
    message: string,
    type: 'success' | 'error'
  ): void {
    this.message = message;
    this.messageType = type;
  }

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

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

  formatDeadline(
    value: string,
    includeTime = false,
    adjustOneDay = false
  ): string {
    const datePart = value.slice(0, 10);
    const parts = datePart.split('-');

    if (parts.length !== 3) return value;

    const [year, month, day] = parts.map(Number);

    if (!year || !month || !day) return value;

    const date = new Date(year, month - 1, day);

    if (adjustOneDay) {
      date.setDate(date.getDate() - 1);
    }

    const formattedDate = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (!includeTime) return formattedDate;

    const time = new Date(value);

    if (Number.isNaN(time.getTime())) return formattedDate;

    const formattedTime = time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(':00 ', '').replace(' ', '');

    return `${formattedDate} · ${formattedTime}`;
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
    if (this.isActivityRunning || this.activitySaving) return;

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

      this.activityCases.set([]);
      this.syncActivityCases();

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

  private emptyCaseEditForm(): UpdateCaseDetails {
    return {
      caseNumber: '',
      productType: '',
      status: 'Working',
      orderDeadline: null,
      artDeadline: null,
      mailDate: null,
      notes: ''
    };
  }

  private formatCaseDateForEdit(
    value: string | null | undefined,
    includeTime: boolean
  ): string | null {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    if (!includeTime) {
      return `${month}/${day}/${year}`;
    }

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    return `${month}/${day}/${year} ${hours}:${minutes} ${period}`;
  }

  startEditingCase(caseItem: Case): void {
    if (
      this.isActivityRunning ||
      this.activitySaving ||
      this.activityStartedAt ||
      this.caseSaving()
    ) {
      return;
    }

    this.addingCase.set(false);
    this.caseForm = this.emptyCaseForm();

    this.editingCaseId.set(caseItem.id);

    this.caseEditForm = {
      caseNumber: caseItem.caseNumber ?? '',
      productType: caseItem.productType ?? '',
      status: caseItem.status ?? 'Working',
      orderDeadline: this.formatCaseDateForEdit(
        caseItem.orderDeadline,
        true
      ),
      artDeadline: this.formatCaseDateForEdit(
        caseItem.artDeadline,
        true
      ),
      mailDate: this.formatCaseDateForEdit(
        caseItem.mailDate,
        false
      ),
      notes: caseItem.notes ?? ''
    };

    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelEditingCase(): void {
    this.editingCaseId.set(null);
    this.caseEditForm = this.emptyCaseEditForm();
    this.errorMessage.set('');
  }

  async saveEditedCase(): Promise<void> {
    const account = this.account();
    const caseId = this.editingCaseId();

    if (!account || !caseId || this.caseSaving()) return;

    if (!this.caseEditForm.caseNumber.trim()) {
      this.errorMessage.set('Case number is required.');
      return;
    }

    if (!this.caseEditForm.status.trim()) {
      this.errorMessage.set('Case status is required.');
      return;
    }

    this.caseSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const payload: UpdateCaseDetails = {
        caseNumber: this.caseEditForm.caseNumber.trim(),
        productType: this.cleanValue(this.caseEditForm.productType),
        status: this.caseEditForm.status.trim(),
        orderDeadline: this.toIsoDate(
          this.caseEditForm.orderDeadline,
          true
        ),
        artDeadline: this.toIsoDate(
          this.caseEditForm.artDeadline,
          true
        ),
        mailDate: this.toIsoDate(
          this.caseEditForm.mailDate,
          false
        ),
        notes: this.cleanValue(this.caseEditForm.notes)
      };

      await this.accountsService.updateCase(caseId, payload);

      const accounts = await this.accountsService.getAccounts();

      const updatedAccount = accounts.find(
        item => item.id === account.id
      );

      if (!updatedAccount) {
        throw new Error(
          'The case was updated, but the account could not be refreshed. Please reload the page.'
        );
      }

      this.account.set(updatedAccount);
      this.syncActivityCases();

      this.editingCaseId.set(null);
      this.caseEditForm = this.emptyCaseEditForm();

      this.successMessage.set('Case updated successfully.');
    } catch (error: any) {
      console.error('Error updating case:', error);

      this.errorMessage.set(
        error?.error?.message ??
        error?.message ??
        'Unable to update the case. Please try again.'
      );
    } finally {
      this.caseSaving.set(false);
    }
  }

  // --------------------------------------------------
  // Unsaved activity protection
  // --------------------------------------------------

  hasUnfinishedActivity(): boolean {
    return this.activityStartedAt !== null &&
      !this.activitySaving;
  }

  requestDiscardActivity(): void {
    if (!this.hasUnfinishedActivity()) {
      this.resetActivity();
      return;
    }

    this.showDiscardConfirmation.set(true);
  }

  confirmDiscardActivity(): void {
    this.resetActivity();

    // Restore each case's original status in the activity panel.
    this.activityCases.update(items =>
      items.map(item => ({
        ...item,
        endingStatus: item.caseItem.status
      }))
    );

    this.activityNote = '';
    this.message = '';

    this.showDiscardConfirmation.set(false);

    const resolver = this.discardResolver;
    this.discardResolver = null;

    resolver?.(false);
  }

  keepWorking(): void {
    this.showDiscardConfirmation.set(false);

    const resolver = this.discardResolver;
    this.discardResolver = null;

    resolver?.(false);
  }

  // Used by Angular's CanDeactivate route guard.
  canDeactivate(): Promise<boolean> {
    if (!this.hasUnfinishedActivity()) {
      return Promise.resolve(true);
    }

    this.showDiscardConfirmation.set(true);

    return new Promise<boolean>(resolve => {
      this.discardResolver = resolve;
    });
  }

  // Native browser warning for refresh, tab close, or leaving the site.
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnfinishedActivity()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

}

export const pendingActivityGuard: CanDeactivateFn<AccountWorkspaceComponent> = component => component.canDeactivate();
