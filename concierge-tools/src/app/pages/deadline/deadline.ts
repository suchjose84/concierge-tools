import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface DeadlineCase {
  deadlineType: string;
  dueDate: string;
  caseBusiness: string;
  status: string;
  escalate: string;
}

@Component({
  selector: 'app-deadline',
  imports: [FormsModule],
  templateUrl: './deadline-template.html',
  styleUrl: './deadline-template.css',
})
export class DeadlineTemplateComponent {

  cases: DeadlineCase[] = [
    this.createCase()
  ];

  copied = false;

  createCase(): DeadlineCase {
    return {
      deadlineType: '',
      dueDate: '',
      caseBusiness: '',
      status: '',
      escalate: ''
    };
  }

  addCase(): void {
    this.cases.push(this.createCase());
  }

  removeCase(index: number): void {
    if (this.cases.length > 1) {
      this.cases.splice(index, 1);
    }
  }

  get generatedText(): string {
    return this.cases
      .map((item, index) => {
        return `Deadline Type: ${item.deadlineType}
Due date: ${this.formatDate(item.dueDate)}
Case Number/Business Name: ${item.caseBusiness}
Status: ${item.status}
Do we need to escalate this to Kelly/Elvin/Uriah?: ${item.escalate}`;
      })
      .join('\n\n');
  }

  async copyToClipboard(): Promise<void> {
    await navigator.clipboard.writeText(this.generatedText);

    this.copied = true;

    setTimeout(() => {
      this.copied = false;
    }, 1500);
  }

  formatDate(date: string): string {
    if (!date) {
      return '';
    }

    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }



}