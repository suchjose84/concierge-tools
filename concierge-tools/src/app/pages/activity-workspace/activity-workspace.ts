
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CasesApiService } from '../../services/cases-api.service';
import { AccountActivitiesService } from '../../services/account-activities.service';

import { Case } from '../../models/case.model';
import { Activity } from '../../models/activity.model';

interface SelectedActivityCase {
  caseItem: Case;
  endingStatus: string;
}

@Component({
  selector: 'app-activity-workspace',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './activity-workspace.html',
  styleUrl: './activity-workspace.css'
})
export class ActivityWorkspaceComponent implements OnInit, OnDestroy {
  caseItem = signal<Case | null>(null);
  selectedCases = signal<SelectedActivityCase[]>([]);
  activities = signal<Activity[]>([]);
  activityElapsedSeconds = signal(0);

  isLoadingCase = signal(true);

  isSharedMode = false;
  showStartPrompt = false;
  isActivityRunning = false;
  isSaving = false;
  isEditingCase = false;
  isSavingCase = false;

  activityNote = '';
  activityEndingStatus = '';
  activityStartedAt: Date | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  caseEditMessage = '';
  caseEditMessageType: 'success' | 'error' = 'success';

  private accountId = '';

  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private currentRunStartedAt: Date | null = null;
  private activityEndedAt: Date | null = null;
  private accumulatedElapsedSeconds = 0;

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

  editForm = {
    caseNumber: '',
    productType: '',
    status: '',
    orderDeadline: '',
    artDeadline: '',
    mailDate: '',
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private casesApiService: CasesApiService,
    private accountActivitiesService: AccountActivitiesService
  ) {}

  async ngOnInit(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('id');

    this.isSharedMode =
      this.route.snapshot.routeConfig?.path ===
      'accounts/:id/shared-activity';

    if (this.isSharedMode) {
      if (!routeId) {
        this.setMessage('Missing account ID.', 'error');
        this.isLoadingCase.set(false);
        return;
      }

      this.accountId = routeId;

      const ids = (
        this.route.snapshot.queryParamMap.get('cases') ?? ''
      )
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        this.setMessage('Select at least one case first.', 'error');
        this.isLoadingCase.set(false);
        return;
      }

      await this.loadSelectedCases(ids);
      return;
    }

    // Existing single-case workflow: /cases/:id
    if (!routeId) {
      this.setMessage('Missing case ID.', 'error');
      this.isLoadingCase.set(false);
      return;
    }

    await this.loadCase(routeId);

    if (this.caseItem()) {
      await this.loadActivities();
      this.showStartPrompt = true;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // --------------------------------------------------
  // Load cases
  // --------------------------------------------------

  private async loadSelectedCases(ids: string[]): Promise<void> {
    this.isLoadingCase.set(true);

    try {
      const cases = await Promise.all(
        ids.map(id => this.casesApiService.getCaseById(id))
      );

      const invalidCase = cases.some(
        item => item.accountId !== this.accountId
      );

      if (invalidCase) {
        this.setMessage(
          'One or more selected cases do not belong to this account.',
          'error'
        );
        return;
      }

      this.selectedCases.set(
        cases.map(item => ({
          caseItem: item,
          endingStatus: item.status
        }))
      );

      // Prompt once the selected cases are loaded and ready.
      this.showStartPrompt = this.selectedCases().length > 0;
    } catch (error) {
      console.error('Error loading selected cases:', error);
      this.setMessage('Unable to load the selected cases.', 'error');
    } finally {
      this.isLoadingCase.set(false);
    }
  }

  private async loadCase(caseId: string): Promise<void> {
    this.isLoadingCase.set(true);

    try {
      const data = await this.casesApiService.getCaseById(caseId);

      this.caseItem.set(data);
      this.activityEndingStatus = data.status;
      this.accountId = data.accountId;
    } catch (error) {
      console.error('Error loading case:', error);
      this.setMessage('Unable to load this case.', 'error');
    } finally {
      this.isLoadingCase.set(false);
    }
  }

  async loadActivities(): Promise<void> {
    const currentCase = this.caseItem();

    if (!currentCase) return;

    try {
      const data = await this.casesApiService.getActivities(
        currentCase.id
      );

      this.activities.set(data ?? []);
    } catch (error) {
      console.error('Error loading activities:', error);
      this.setMessage('Could not load activity history.', 'error');
    }
  }

  // --------------------------------------------------
  // Activity timer
  // --------------------------------------------------

  startActivityFromPrompt(): void {
    this.showStartPrompt = false;
    this.startActivity();
  }

  dismissStartPrompt(): void {
    this.showStartPrompt = false;
  }

  startActivity(): void {
    if (
      this.isActivityRunning ||
      this.isSaving ||
      (!this.isSharedMode && !this.caseItem()) ||
      (this.isSharedMode && this.selectedCases().length === 0)
    ) {
      return;
    }

    this.message = '';

    if (!this.activityStartedAt) {
      this.activityStartedAt = new Date();
      this.accumulatedElapsedSeconds = 0;
      this.activityElapsedSeconds.set(0);

      if (!this.isSharedMode) {
        this.activityEndingStatus = this.caseItem()?.status ?? '';
      }
    }

    this.startTimerInterval();
  }

  private startTimerInterval(): void {
    if (this.isActivityRunning) return;

    this.activityEndedAt = null;
    this.currentRunStartedAt = new Date();
    this.isActivityRunning = true;

    this.clearTimer();

    this.activityTimer = setInterval(() => {
      if (!this.currentRunStartedAt) return;

      const currentRunSeconds = Math.floor(
        (Date.now() - this.currentRunStartedAt.getTime()) / 1000
      );

      this.activityElapsedSeconds.set(
        this.accumulatedElapsedSeconds + currentRunSeconds
      );
    }, 1000);
  }

  /**
   * Stops the timer without saving the activity.
   * Used by the shared activity workspace.
   */
  stopActivityTimer(): void {
    if (!this.isActivityRunning || !this.currentRunStartedAt) {
      return;
    }

    const currentRunSeconds = Math.floor(
      (Date.now() - this.currentRunStartedAt.getTime()) / 1000
    );

    this.accumulatedElapsedSeconds += currentRunSeconds;
    this.activityElapsedSeconds.set(this.accumulatedElapsedSeconds);

    this.activityEndedAt = new Date();
    this.currentRunStartedAt = null;
    this.isActivityRunning = false;

    this.clearTimer();
  }

  /**
   * Resumes a previously stopped timer without resetting elapsed time.
   */
  resumeActivity(): void {
    if (
      this.isActivityRunning ||
      this.isSaving ||
      !this.activityStartedAt
    ) {
      return;
    }

    this.startTimerInterval();
  }

  /**
   * Preserves compatibility with the existing single-case workflow,
   * where Stop Activity stops the timer and saves immediately.
   */
  async stopActivity(): Promise<void> {
    if (!this.activityStartedAt || this.isSaving) return;

    if (!this.activityNote.trim()) {
      this.setMessage(
        'Please describe what you did before saving.',
        'error'
      );
      return;
    }

    if (this.isActivityRunning) {
      this.stopActivityTimer();
    }

    if (this.isSharedMode) {
      await this.saveSharedActivity();
    } else {
      await this.saveSingleActivity();
    }
  }

  private clearTimer(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  // --------------------------------------------------
  // Save single-case activity
  // --------------------------------------------------

  private async saveSingleActivity(): Promise<void> {
    const currentCase = this.caseItem();
    const startedAt = this.activityStartedAt;
    const endedAt = this.activityEndedAt;

    if (!currentCase || !startedAt || !endedAt) return;

    if (!this.activityNote.trim()) {
      this.setMessage('Please describe what you did.', 'error');
      return;
    }

    if (!this.activityEndingStatus) {
      this.setMessage('Please select an ending status.', 'error');
      return;
    }

    this.isSaving = true;

    try {
      await this.casesApiService.saveActivity(currentCase.id, {
        endingStatus: this.activityEndingStatus,
        note: this.activityNote.trim(),
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: this.activityElapsedSeconds()
      });

      this.resetActivity();
      await this.router.navigate(['/accounts']);
    } catch (error) {
      console.error('Error saving activity:', error);

      this.setMessage(
        'Could not save activity. You can try saving again.',
        'error'
      );
    } finally {
      this.isSaving = false;
    }
  }

  // --------------------------------------------------
  // Save shared activity
  // --------------------------------------------------

  async saveSharedActivity(): Promise<void> {
    if (this.isActivityRunning || this.isSaving) {
      this.setMessage(
        'Stop the timer before saving the shared activity.',
        'error'
      );
      return;
    }

    const startedAt = this.activityStartedAt;
    const endedAt = this.activityEndedAt;
    const cases = this.selectedCases();

    if (!this.activityNote.trim()) {
      this.setMessage('Please describe what you did.', 'error');
      return;
    }

    if (!startedAt || !endedAt) {
      this.setMessage(
        'Start and stop the activity timer before saving.',
        'error'
      );
      return;
    }

    if (cases.length === 0) {
      this.setMessage('No cases selected.', 'error');
      return;
    }

    const missingStatus = cases.some(
      item => !item.endingStatus.trim()
    );

    if (missingStatus) {
      this.setMessage(
        'Please select an ending status for every case.',
        'error'
      );
      return;
    }

    this.isSaving = true;
    this.message = '';

    try {
      await this.accountActivitiesService.saveSharedActivity(
        this.accountId,
        {
          note: this.activityNote.trim(),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSeconds: this.activityElapsedSeconds(),
          cases: cases.map(item => ({
            caseId: item.caseItem.id,
            endingStatus: item.endingStatus
          }))
        }
      );

      this.setMessage(
        'Shared activity saved successfully.',
        'success'
      );

      this.resetActivity();
      await this.router.navigate(['/accounts']);

    } catch (error) {
      console.error('Error saving shared activity:', error);

      this.setMessage(
        'Could not save shared activity. You can try saving again.',
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
    this.currentRunStartedAt = null;
    this.activityEndedAt = null;
    this.accumulatedElapsedSeconds = 0;

    this.activityElapsedSeconds.set(0);
    this.activityNote = '';
    this.activityEndingStatus = this.caseItem()?.status ?? '';
  }

  // --------------------------------------------------
  // Messages and formatting
  // --------------------------------------------------

  setMessage(
    message: string,
    type: 'success' | 'error'
  ): void {
    this.message = message;
    this.messageType = type;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds
      .toString()
      .padStart(2, '0');

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${formattedMinutes}:${formattedSeconds}`;
    }

    return `${formattedMinutes}:${formattedSeconds}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  goBack(): void {
    if (this.isSharedMode) {
      this.router.navigate(['/accounts', this.accountId]);
      return;
    }

    const accountId = this.caseItem()?.accountId;

    this.router.navigate(
      accountId ? ['/accounts', accountId] : ['/accounts']
    );
  }

  // --------------------------------------------------
  // Existing single-case editing functionality
  // --------------------------------------------------

  startEditingCase(): void {
    const currentCase = this.caseItem();

    if (!currentCase || this.isActivityRunning || this.isSaving) {
      return;
    }

    this.editForm = {
      caseNumber: currentCase.caseNumber,
      productType: currentCase.productType ?? '',
      status: currentCase.status,
      orderDeadline: currentCase.orderDeadline?.slice(0, 10) ?? '',
      artDeadline: currentCase.artDeadline?.slice(0, 10) ?? '',
      mailDate: currentCase.mailDate?.slice(0, 10) ?? '',
      notes: currentCase.notes ?? ''
    };

    this.caseEditMessage = '';
    this.isEditingCase = true;
  }

  cancelEditingCase(): void {
    this.isEditingCase = false;
    this.caseEditMessage = '';
  }

  async saveCase(): Promise<void> {
    const currentCase = this.caseItem();

    if (!currentCase || this.isSavingCase) return;

    if (!this.editForm.caseNumber.trim()) {
      this.caseEditMessage = 'Case number is required.';
      this.caseEditMessageType = 'error';
      return;
    }

    if (!this.editForm.status.trim()) {
      this.caseEditMessage = 'Please select a status.';
      this.caseEditMessageType = 'error';
      return;
    }

    this.isSavingCase = true;
    this.caseEditMessage = '';

    const payload: Case = {
      ...currentCase,
      caseNumber: this.editForm.caseNumber.trim(),
      productType: this.editForm.productType.trim() || null,
      status: this.editForm.status,
      orderDeadline: this.editForm.orderDeadline || null,
      artDeadline: this.editForm.artDeadline || null,
      mailDate: this.editForm.mailDate || null,
      notes: this.editForm.notes.trim() || null
    };

    try {
      await this.casesApiService.updateCase(currentCase.id, payload);

      this.caseItem.set(payload);
      this.activityEndingStatus = payload.status;
      this.isEditingCase = false;

      this.caseEditMessage = 'Case updated successfully.';
      this.caseEditMessageType = 'success';
    } catch (error) {
      console.error('Error updating case:', error);

      this.caseEditMessage =
        'Could not update the case. Please try again.';
      this.caseEditMessageType = 'error';
    } finally {
      this.isSavingCase = false;
    }
  }
}
