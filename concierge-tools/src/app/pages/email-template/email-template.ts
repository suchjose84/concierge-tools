import { Component, signal } from '@angular/core';
import { EmailTemplate } from '../../models/email-template.model';
import { EmailTemplateService } from '../../services/email-template';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-email-template',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './email-template.html',
  styleUrl: './email-template.css',
})
export class EmailTemplateComponent {
  templates: EmailTemplate[] = [];
  subjectCopied = signal<string | null>(null);
  bodyCopied = signal<string | null>(null);

  constructor(
    private emailTemplateService: EmailTemplateService
  ) {
    this.templates = this.emailTemplateService.getTemplates();
  }

  copy(text: string, type: 'subject' | 'body', templateId: string): void {
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
}