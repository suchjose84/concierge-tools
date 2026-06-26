import { Injectable } from '@angular/core';
import { EmailTemplate } from '../models/email-template.model';

@Injectable({
  providedIn: 'root',
})
export class EmailTemplateService {
  private templates: EmailTemplate[] = [
    {
      id: 'email-template1',
      category: 'Concierge',
      title: 'Valpak Engage Email',
      subject: 'Let’s design your Valpak Clipp ad',
      body: `Hi [Name],

I’ll be the concierge assisting you in building your first Valpak Clipp ad campaign. Consider me your personal guide and go-to contact throughout the creative process. Together, we’ll handle:

• Collecting your logos, images, and any assets you’d like to feature  
• Fine-tuning your offers based on decades of research  
• Collaborating with our expert design team to create a compelling ad  
• Reviewing and proofing your artwork to ensure it’s exactly what you want  

My goal is simple: to design an ad that speaks to your audience, drives response, and delivers strong results from day one.

I’ll be giving you a call shortly to discuss the above. If you have any questions before then, please reach out!

Talk soon,

Best,  
Joe Such  
Arts Concierge Specialist  
717-294-0273`

},
    {
      id: 'email-template2',
      category: 'Concierge',
      title: 'Clipp Engage Email',
      subject: 'Let’s design your Clipp ad',
      body: `Hi [Name],

I’ll be the concierge assisting you in building your first Clipp ad campaign. Consider me your personal guide and go-to contact throughout the creative process. Together, we’ll handle:

• Collecting your logos, images, and any assets you’d like to feature  
• Fine-tuning your offers based on decades of research  
• Collaborating with our expert design team to create a compelling ad  
• Reviewing and proofing your artwork to ensure it’s exactly what you want  

My goal is simple: to design an ad that speaks to your audience, drives response, and delivers strong results from day one.

I’ll be giving you a call shortly to discuss the above. If you have any questions before then, please reach out!

Talk soon,


Best,
Joe Such
Arts Concierge Specialist`

},
{
      id: 'email-template3',
      category: 'Concierge',
      title: 'Ad Design Details',
      subject: 'Ad Design Details - [Account Name]',
      body: `Hi [Name],

Congrats on your recent sale for [Account Name]!

I’ve been assigned to this account on the Concierge Team and will be helping your client with their initial ad setup. To get things moving, please share any available assets—such as images, logos, or creative direction. If you don’t have anything yet, that’s totally fine; I’ll be connecting with your client directly to get started.

Just a couple of quick details to confirm:
• Has the advertiser requested a Call Tracking number?
• If this is a CCO ad, could you provide the Deal Title (for example, $15 for $30 worth of casual dining)?

You can reply here or reach me at 717-294-0273. I’m here to make the process as smooth as possible for you and your client.

Thanks,`,
    },
{
      id: 'email-template4',
      category: 'Concierge',
      title: 'Ad Proof For Review',
      subject: 'Ad Proof For Review',
      body: `Hi [Name],

I have a proof ready for your review.

Please take a moment to review the attached ad and confirm that all details are correct and that you’re happy with the design. If you have any changes or revisions, feel free to let me know.

Once approved, we can move forward with sending it to print.

Looking forward to your feedback!`

},

{
      id: 'email-template5',
      category: 'Concierge',
      title: 'Ad Approved to Print',
      subject: 'Final Proof Approved to Print',
      body: `Hi [Name],

Thanks for your approval. I’ll go ahead and finalize it for print. Your ad is scheduled to mail on [Date].

Your Valpak Clipp representative, [Sales Rep], will be in touch soon to assist you with your next ad for the upcoming mail cycle.

I’ve attached the final version for your reference. It’s been a pleasure working with you!`

},



  ];

  getTemplates(): EmailTemplate[] {
    return this.templates;
  }
}
