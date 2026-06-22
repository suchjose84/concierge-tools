import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class QualityService {
  private sections = [
    {
      title: 'Critical Info',
      expanded: true,
      items: [
        { label: 'Business name', checked: false, note: '' },
        { label: 'Website / QR', checked: false, note: '' },
        { label: 'Phone number', checked: false, note: '' },
        { label: 'Address', checked: false, note: '' },
        { label: 'Business Hours', checked: false, note: '' },
      ],
    },
    {
      title: 'Offer Details',
      expanded: true,
      items: [
        { label: 'Offer wording', checked: false, note: '' },
        { label: 'Expiration', checked: false, note: '' },
        { label: 'Disclaimers', checked: false, note: '' },
        { label: 'Minimum purchase', checked: false, note: '' },
      ],
    },
    {
      title: 'Design Review',
      expanded: true,
      items: [
        { label: 'Correct images', checked: false, note: '' },
        { label: 'Image quality', checked: false, note: '' },
        { label: 'Text readability', checked: false, note: '' },
        { label: 'No typos', checked: false, note: '' },
      ]
    }


  ];

  getSections() {
    return this.sections;
  }
}