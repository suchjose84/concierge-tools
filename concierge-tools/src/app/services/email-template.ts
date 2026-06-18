import { Injectable } from '@angular/core';
import { EmailTemplate } from '../models/email-template.model';

@Injectable({
  providedIn: 'root',
})
export class EmailTemplateService {
  private templates: EmailTemplate[] = [
    {
      id: 'ad-design-details',
      category: 'Sales Rep',
      title: 'Ad Design Details',
      subject: 'Ad Design Details - [Account Name]',
      body: `Hi [Name],

Congrats on your recent sale for [Account Name]!

I’ve been assigned to this account on the Concierge Team and will be helping your client with their initial ad setup. To get things moving, please share any available assets—such as images, logos, or creative direction. If you don’t have anything yet, that’s totally fine; I’ll be connecting with your client directly to get started.

Just a couple of quick details to confirm:
• Has the advertiser requested a Call Tracking number?
• If this is a CCO ad, could you provide the Deal Title (for example, $15 for $30 worth of casual dining)?

You can reply here or reach me at [phone number]. I’m here to make the process as smooth as possible for you and your client.

Thanks,`,
    },
  ];

  getTemplates(): EmailTemplate[] {
    return this.templates;
  }
}