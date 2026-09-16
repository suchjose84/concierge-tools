import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmailTemplate } from '../../models/email-template.model';
import { EmailTemplateService } from '../../services/email-template';

@Component({
  selector: 'app-email-template',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './email-template.html',
  styleUrl: './email-template.css',
})
export class EmailTemplateComponent {

  templates: EmailTemplate[] = [];

  accountName = signal('');

  subjectCopied = signal<string | null>(null);
  bodyCopied = signal<string | null>(null);

  constructor(
    private emailTemplateService: EmailTemplateService
  ) {
    this.templates = this.emailTemplateService.getTemplates();
  }

  copy(
    text: string,
    type: 'subject' | 'body',
    templateId: string
  ): void {

    navigator.clipboard.writeText(text);

    if (type === 'subject') {
      this.subjectCopied.set(templateId);

      setTimeout(() => {
        this.subjectCopied.set(null);
      }, 2000);

    } else {
      this.bodyCopied.set(templateId);

      setTimeout(() => {
        this.bodyCopied.set(null);
      }, 2000);
    }
  }

  openEmail(template: EmailTemplate): void {
    const accountName = this.accountName().trim();

    let subject = template.subject;

    if (accountName) {
      if (template.id === 'email-template1') {
        subject = `Let’s design your Valpak Clipp ad - ${accountName}`;
      }

      if (template.id === 'email-template2') {
        subject = `Let’s design your Clipp ad - ${accountName}`;
      }

      if (template.id === 'email-template3') {
        subject = `Concierge - Ad Design Details | ${accountName}`;
      }
    }

    const body = template.body.replace(
      /\[Account Name\]/g,
      accountName || '[Account Name]'
    );

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    const cc = encodeURIComponent(
      'jown.abrigon@valpakclipp.com'
    );

    window.open(
      `https://outlook.office.com/mail/deeplink/compose?cc=${cc}&subject=${encodedSubject}&body=${encodedBody}`,
      '_blank'
    );
  }
  
}