import { Component } from '@angular/core';
import { EmailTemplate } from '../models/email-template.model';
import { EmailTemplateService } from '../services/email-template';

@Component({
  selector: 'app-email-template',
  standalone: true,
  imports: [],
  templateUrl: './email-template.html',
  styleUrl: './email-template.css',
})
export class EmailTemplateComponent {
  templates: EmailTemplate[] = [];
  copied = '';

  constructor(
    private emailTemplateService: EmailTemplateService
  ) {
    this.templates = this.emailTemplateService.getTemplates();
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text);

    this.copied = 'Copied!';

    setTimeout(() => {
      this.copied = '';
    }, 2000);
  }
}