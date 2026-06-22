import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../../services/quality.service';
import { ChecklistSection } from '../../models/quality.model';



@Component({
  selector: 'app-quality',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quality.html',
  styleUrl: './quality.css',
})
export class QualityComponent {

  sections = signal<ChecklistSection[]>([]);

  constructor(
    private qualityService: QualityService
  ) {
    this.sections.set(
      this.qualityService.getSections()
    );
  }

  toggle(section: any): void {
    section.expanded = !section.expanded;
  }

  progress = computed(() => {
    const items = this.sections().flatMap(
      section => section.items
    );

    const checked = items.filter(
      item => item.checked
    ).length;

    return items.length
      ? Math.round((checked / items.length) * 100)
      : 0;
  });

  auditor = signal('Joe');
  caseOwner = signal('Gege');
  caseNumber = signal('');
  accountName = signal('');
  auditDate = signal(
    new Date().toISOString().split('T')[0]
  );

  notesCopied = signal(false);
  excelCopied = signal(false);


  qcNotes = computed(() => {
    const notes: string[] = [];
    this.sections().forEach(section => {
      section.items.forEach(item => {

        if (item.note.trim()) {

          notes.push(
            `${item.label} - ${item.note}`
          );

        }

      });

    });

    return notes.join('\n');

  });

  copyNotes(): void {
    navigator.clipboard.writeText(
      this.qcNotes()
    );

    this.notesCopied.set(true);

    setTimeout(() => {

      this.notesCopied.set(false);

    }, 2000);

  }

  auditOutput = computed(() => {
    const getStatus = (
      label: string
    ) => {

      const item =
        this.sections()
          .flatMap(
            section => section.items
          )
          .find(
            item =>
              item.label === label
          );

      return item?.checked
        ? 'Yes'
        : 'No';
    };

    const comments =
      this.sections()
        .flatMap(
          section => section.items
        )
        .filter(
          item =>
            item.note.trim()
        )
        .map(
          item =>
            `${item.label}: ${item.note}`
        )
        .join('\n');

    return `
  Auditor: ${this.auditor()}
  Date Audited: ${this.auditDate()}
  Case Owner: ${this.caseOwner()}
  Case #: ${this.caseNumber()}
  Account Name: ${this.accountName()}

  Business Name is correct?: ${getStatus('Business name')}
  Address is correct?: ${getStatus('Address')}
  Phone Number Correct?: ${getStatus('Phone number')}
  Offers are correct with disclaimers?: ${getStatus('Offer wording') === 'Yes' && getStatus('Disclaimers') === 'Yes' ? 'Yes' : 'No'}
  Expiration dates?: ${getStatus('Expiration')}
  No Typos?: ${getStatus('No typos')}
  QR Code Scan(s) Correct?: ${getStatus('Website / QR')}
  Website is correct and works?: ${getStatus('Website / QR')}

  Error Comments:
  ${comments || 'None'}

  Date Error Was Corrected:

  Additional Auditor Suggestions/Kudos:

  `.trim();

  });

  copyOutput(): void {
    navigator.clipboard.writeText(
      this.auditOutput()
    );

  }

  private getStatus(
    label: string
  ): string {

    const item =
      this.sections()
        .flatMap(
          section => section.items
        )
        .find(
          item => item.label === label
        );

    return item?.checked
      ? 'Yes'
      : 'No';

  }

  excelOutput = computed(() => {
    const comments =
      this.sections()
        .flatMap(
          section => section.items
        )
        .filter(
          item =>
            item.note.trim()
        )
        .map(
          item =>
            `${item.label}: ${item.note}`
        )
        .join('; ');

    return [

      this.auditor(),

      this.auditDate(),

      this.caseOwner(),

      this.caseNumber(),

      this.accountName(),

      this.getStatus('Business name'),

      this.getStatus('Address'),

      this.getStatus('Phone number'),

      (
        this.getStatus('Offer wording') === 'Yes' &&
        this.getStatus('Disclaimers') === 'Yes'
      )
        ? 'Yes'
        : 'No',

      this.getStatus('Expiration'),

      this.getStatus('No typos'),

      this.getStatus('Website / QR'),

      this.getStatus('Website / QR'),

      comments,

      '',

      ''

    ].join('\t');

  });

  copyExcelOutput(): void {

    navigator.clipboard.writeText(
      this.excelOutput()
    );

  }

}