
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

interface Case {
  id: string;
  account_id: string;
  case_number: string;
  product_type: string | null;
  status: string;
  order_deadline: string | null;
  art_deadline: string | null;
  mail_date: string | null;
  notes: string | null;
}

interface Activity {
  id: string;
  case_id: string;
  activity_type: string;
  note: string | null;
  starting_status: string | null;
  ending_status: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
}

@Component({
  selector: 'app-case-workspace',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './case-workspace.html',
})
export class CaseWorkspaceComponent implements OnInit, OnDestroy {
  caseItem = signal<Case | null>(null);
  activities = signal<Activity[]>([]);

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
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    const caseId = this.route.snapshot.paramMap.get('id');
    if (!caseId) return;

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
    try {
      const { data, error } = await this.supabaseService.client
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (error) throw error;

      this.caseItem.set(data);
      this.activityEndingStatus = data.status;
    } catch (error) {
      console.error('Error loading case:', error);
      this.setMessage('Unable to load this case.', 'error');
    }
  }

  async loadActivities(): Promise<void> {
    const currentCase = this.caseItem();
    if (!currentCase) return;

    try {
      const { data, error } = await this.supabaseService.client
        .from('activities')
        .select('*')
        .eq('case_id', currentCase.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
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
    if (this.isActivityRunning || this.isSaving || !this.caseItem()) return;

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
    if (!currentCase || !this.activityStartedAt || this.isSaving) return;

    if (!this.activityNote.trim()) {
      this.setMessage('Please describe what you did before saving.', 'error');
      return;
    }

    if (!this.activityEndingStatus) {
      this.setMessage('Please select an ending status.', 'error');
      return;
    }

    this.isSaving = true;
    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - this.activityStartedAt.getTime()) / 1000
    );

    try {
      const { error } = await this.supabaseService.client.rpc(
        'save_case_activity',
        {
          p_case_id: currentCase.id,
          p_ending_status: this.activityEndingStatus,
          p_note: this.activityNote.trim(),
          p_started_at: this.activityStartedAt.toISOString(),
          p_ended_at: endedAt.toISOString(),
          p_duration_seconds: durationSeconds
        }
      );

      if (error) throw error;

      this.caseItem.update(current =>
        current ? { ...current, status: this.activityEndingStatus } : current
      );

      this.setMessage('Activity saved successfully.', 'success');
      this.resetActivity();
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
    const accountId = this.caseItem()?.account_id;
    this.router.navigate(accountId ? ['/accounts', accountId] : ['/accounts']);
  }
}
