
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AccountsService } from '../../services/accounts.service';
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
})
export class AccountWorkspaceComponent implements OnInit {
  account = signal<Account | null>(null);
  editing = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  editForm: UpdateAccountDetails = this.emptyForm();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService
  ) {}

  async ngOnInit(): Promise<void> {
    const accountId = this.route.snapshot.paramMap.get('id');

    if (!accountId) {
      return;
    }

    try {
      const accounts = await this.accountsService.getAccounts();
      const foundAccount = accounts.find(
        item => item.id === accountId
      );

      if (foundAccount) {
        this.account.set(foundAccount);
      } else {
        this.errorMessage.set('Account not found or no longer active.');
      }
    } catch (error) {
      console.error('Error loading account:', error);
      this.errorMessage.set('Unable to load account details.');
    }
  }

  startEditing(): void {
    const account = this.account();

    if (!account) {
      return;
    }

    this.editForm = {
      accountName: account.accountName ?? '',
      clientName: account.clientName ?? '',
      clientEmail: account.clientEmail ?? '',
      clientPhone: account.clientPhone ?? '',
      clientTimezone: account.clientTimezone ?? '',
      salesRepName: account.salesRepName ?? '',
      salesRepEmail: account.salesRepEmail ?? '',
      salesRepPhone: account.salesRepPhone ?? '',
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

    if (!account || this.saving()) {
      return;
    }

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
      await this.accountsService.updateAccount(account.id, payload);

      this.account.set({
        ...account,
        ...payload,
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

  goBack(): void {
    this.router.navigate(['/accounts']);
  }

  openCase(caseItem: Case): void {
    this.router.navigate(['/cases', caseItem.id]);
  }
}
