import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';

interface Case {
  id: string;
  case_number: string;
  product_type: string;
  status: string;
  order_deadline: string | null;
  art_deadline: string | null;
  mail_date: string | null;
}

interface Account {
  id: string;
  account_name: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_timezone: string | null;
  sales_rep_name: string | null;
  sales_rep_email: string | null;
  sales_rep_phone: string | null;
  notes: string | null;
  cases: Case[];
}

@Component({
  selector: 'app-account-workspace',
  standalone: true,
  templateUrl: './account-workspace.html',
})
export class AccountWorkspaceComponent implements OnInit {

  account = signal<Account | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService
  ) {}

  async ngOnInit() {

    const accountId = this.route.snapshot.paramMap.get('id');

    if (!accountId) {
      return;
    }

    try {

      const accounts = await this.accountsService.getAccounts();

      const foundAccount = accounts?.find(
        (account: Account) => account.id === accountId
      );

      if (foundAccount) {
        this.account.set(foundAccount);
      }

    } catch (error) {
      console.error('Error loading account:', error);
    }
  }

  goBack(): void {
    this.router.navigate(['/accounts']);
  }

  openCase(caseItem: Case): void {
    this.router.navigate(['/cases', caseItem.id]);
  }


}