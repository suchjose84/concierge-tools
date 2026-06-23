import {
  Component,
  signal,
  OnInit
} from '@angular/core';

import {
  CommonModule,
} from '@angular/common';

import { RouterModule } from '@angular/router';

@Component({

  selector: 'app-history',

  standalone: true,

  imports: [
    CommonModule,
    RouterModule
  ],

  templateUrl: './history-page.html',

  styleUrls: [
    './history-page.css'
  ]

})
export class HistoryPageComponent
implements OnInit {

  records = signal<any[]>([]);

  ngOnInit(): void {

    this.loadRecords();

  }

  loadRecords(): void {

    const records =
      JSON.parse(
        localStorage.getItem(
          'savedQcs'
        ) || '[]'
      );

    this.records.set(records);

  }

  deleteRecord(
    id: string
  ): void {

    const records =
      this.records()
        .filter(
          record =>
            record.id !== id
        );

    localStorage.setItem(
      'savedQcs',
      JSON.stringify(records)
    );

    this.records.set(records);

  }

}