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

  // yoyoyo
}