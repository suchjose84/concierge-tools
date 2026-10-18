
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CasesApiService } from '../../services/cases-api.service';
import { Case } from '../../models/case.model';
import { Activity } from '../../models/activity.model';


@Component({
  selector: 'app-case-workspace',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './case-workspace.html',
})
export class CaseWorkspaceComponent implements OnInit, OnDestroy {
  caseItem = signal<Case | null>(null);
  activities = signal<Activity[]>([]);

  isLoadingCase = true;
  showStartPrompt = false;
  activityNote = '';
  activityEndingStatus = '';
  isActivityRunning = false;
  isSaving = false;
  activityStartedAt: Date | null = null;
  activityElapsedSeconds = signal(0);
  message = '';
  messageType: 'success' | 'error' = 'success';

  private activityTimer: ReturnType<typeof setInterval> | null = null;

  statuses = [
    'Proof Out',
    'Hold',
    'Working',
    'Pending Rep Action',
    'For Approval',
    'Completed',
    'Cancelled',
    'Re-assigned',
    'Crit Change'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private casesApiService: CasesApiService
  ) {}

  async ngOnInit(): Promise<void> {
    const caseId = this.route.snapshot.paramMap.get('id');

    if (!caseId) {
      this.setMessage('Missing case ID.', 'error');
      return;
    }

    await this.loadCase(caseId);

    if (this.caseItem()) {
      await this.loadActivities();
      this.showStartPrompt = true;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private async loadCase(caseId: string): Promise<void> {
    this.isLoadingCase = true;

    try {
      const data = await this.casesApiService.getCaseById(caseId);

      this.caseItem.set(data);
      this.activityEndingStatus = data.status;
    } catch (error) {
      console.error('Error loading case:', error);
      this.setMessage('Unable to load this case.', 'error');
    } finally {
      this.isLoadingCase = false;
    }
  }

  async loadActivities(): Promise<void> {
    const currentCase = this.caseItem();

    if (!currentCase) return;

    try {
      const data = await this.casesApiService.getActivities(currentCase.id);
      this.activities.set(data ?? []);
    } catch (error) {
      console.error('Error loading activities:', error);
      this.setMessage('Could not load activity history.', 'error');
    }
  }

  startActivityFromPrompt(): void {
    this.showStartPrompt = false;
    this.startActivity();
  }

  startActivity(): void {
    if (this.isActivityRunning || this.isSaving || !this.caseItem()) {
      return;
    }

    this.message = '';
    this.activityEndingStatus = this.caseItem()!.status;
    this.activityStartedAt = new Date();
    this.activityElapsedSeconds.set(0);
    this.isActivityRunning = true;

    this.activityTimer = setInterval(() => {
      if (!this.activityStartedAt) return;

      const elapsed = Math.floor(
        (Date.now() - this.activityStartedAt.getTime()) / 1000
      );

      this.activityElapsedSeconds.set(elapsed);
    }, 1000);
  }

  async stopActivity(): Promise<void> {
    const currentCase = this.caseItem();
    const startedAt = this.activityStartedAt;

    if (!currentCase || !startedAt || this.isSaving) return;

    if (!this.activityNote.trim()) {
      this.setMessage(
        'Please describe what you did before saving.',
        'error'
      );
      return;
    }

    if (!this.activityEndingStatus) {
      this.setMessage('Please select an ending status.', 'error');
      return;
    }

    this.isSaving = true;

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000
    );

    try {
      await this.casesApiService.saveActivity(currentCase.id, {
        endingStatus: this.activityEndingStatus,
        note: this.activityNote.trim(),
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds
      });

      this.setMessage('Activity saved successfully.', 'success');

      this.resetActivity();

      await this.loadCase(currentCase.id);
      await this.loadActivities();
    } catch (error) {
      console.error('Error saving activity:', error);

      this.setMessage(
        'Could not save activity. Your timer is still running; try saving again.',
        'error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  resetActivity(): void {
    this.clearTimer();
    this.isActivityRunning = false;
    this.activityStartedAt = null;
    this.activityElapsedSeconds.set(0);
    this.activityNote = '';
    this.activityEndingStatus = this.caseItem()?.status || '';
  }

  private clearTimer(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  setMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return hours > 0
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  goBack(): void {
    const accountId = this.caseItem()?.accountId;

    this.router.navigate(
      accountId ? ['/accounts', accountId] : ['/accounts']
    );
  }
}
