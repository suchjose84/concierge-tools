import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../../services/quality.service';
import { ChecklistSection } from '../../models/quality.model';
import { RouterModule, ActivatedRoute } from '@angular/router';



@Component({
  selector: 'app-quality',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule
  ],
  templateUrl: './quality.html',
  styleUrl: './quality.css',
})
export class QualityComponent implements OnInit{

  sections = signal<ChecklistSection[]>([]);

  constructor(
    private qualityService: QualityService,
    private route: ActivatedRoute

  ) {
    this.sections.set(
      this.qualityService.getSections()
    );
  }

  toggle(section: any): void {
    section.expanded = !section.expanded;
  }

  progress = computed(() => {

    console.log('PROGRESS RECALCULATED');

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
  saved = signal(false);
  revisionQc = signal(false);
  auditorSuggestions = signal('');


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

  ngOnInit(): void {

  const id =
    this.route.snapshot
      .queryParamMap
      .get('id');

  if (id) {

    this.loadQc(id);

  }

}

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
  QR Code Scan(s) Correct?: ${getStatus('QR Code')}
  Website is correct and works?: ${getStatus('Website')}

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
      this.getStatus('Distribution'),

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

      this.getStatus('QR Code'),

      this.getStatus('Website'),

      comments,

      this.correctedDate(),

      this.auditorSuggestions(),

    ].join('\t');

  });

  copyExcelOutput(): void {
    navigator.clipboard.writeText(
      this.excelOutput()
    );
    this.excelCopied.set(true);
    setTimeout(() => {

      this.excelCopied.set(false);

    }, 2000);

  }

  reset(): void {

    this.auditor.set('Joe');

    this.caseOwner.set('Gege');

    this.caseNumber.set('');

    this.accountName.set('');

    this.auditDate.set(
      new Date().toISOString().split('T')[0]
    );

    this.sections().forEach(section => {

      section.items.forEach(item => {

        item.checked = false;

        item.note = '';

      });

    });
    this.auditorSuggestions.set('');

    this.sections.set([
      ...this.sections()
    ]);

  }

  saveQc(): void {
    const existing = JSON.parse(
      localStorage.getItem(
        'savedQcs'
      ) || '[]'
    );

    const caseNumber =
      this.caseNumber().trim();

    const existingIndex =
      existing.findIndex(
        (record: any) => record.caseNumber === caseNumber);

    if (
      existingIndex > -1
    ) {

      existing[existingIndex] = {

        ...existing[existingIndex],

        auditor: this.auditor(),

        caseOwner: this.caseOwner(),

        caseNumber,

        accountName: this.accountName(),

        auditDate: this.auditDate(),

        sections: structuredClone(
          this.sections()
        ),

        updatedAt: new Date().toISOString(),
        revisionQc: this.revisionQc(),


      };

    } else {

      existing.unshift({

        id: crypto.randomUUID(),

        auditor: this.auditor(),

        caseOwner: this.caseOwner(),

        caseNumber,

        accountName: this.accountName(),

        auditDate: this.auditDate(),

        sections: structuredClone(
          this.sections()
        ),

        createdAt: new Date().toISOString(),
        revisionQc: this.revisionQc(),
        auditorSuggestions: this.auditorSuggestions(),

      });

    }

    localStorage.setItem(
      'savedQcs',
      JSON.stringify(existing)
    );

    this.saved.set(true);

    setTimeout(() => {

      this.saved.set(false);

    }, 2000);

  }

  loadQc(
    id: string
  ): void {

    const records =
      JSON.parse(
        localStorage.getItem(
          'savedQcs'
        ) || '[]'
      );

    const qc =
      records.find(
        (r: any) =>
          r.id === id
      );

    if (!qc) {
      return;
    }

    this.auditor.set(
      qc.auditor
    );

    this.caseOwner.set(
      qc.caseOwner
    );

    this.caseNumber.set(
      qc.caseNumber
    );

    this.accountName.set(
      qc.accountName
    );

    this.auditDate.set(
      qc.auditDate
    );

    this.sections.set(
      structuredClone(
        qc.sections
      )
    );

    this.revisionQc.set(
      qc.revisionQc ?? false
    );

    this.auditorSuggestions.set(
      qc.auditorSuggestions ?? ''
    );

  }

  correctedDate = computed(() => {
    return this.revisionQc()
      ? this.auditDate()
      : 'N/A';

  });
  

}