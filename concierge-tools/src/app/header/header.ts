
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  WorkdaysApiService,
  Workday,
  HuddleSession
} from '../services/workdays-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly workday = signal<Workday | null>(null);
  readonly loading = signal(true);

  activeHuddle: HuddleSession | null = null;

  readonly elapsedSeconds = signal(0);
  readonly huddleElapsedSeconds = signal(0);

  busy = false;
  errorMessage = '';

  showStartWorkdayModal = false;
  showEndWorkdayConfirmation = false;

  selectedShiftDate = this.getManilaDateString();

  private timerId?: ReturnType<typeof setInterval>;

  constructor(private workdaysApi: WorkdaysApiService) {}

  ngOnInit(): void {
    void this.restoreWorkday();
  }

  ngOnDestroy(): void {
    this.stopDisplayTimer();
  }

  get isWorkdayActive(): boolean {
    return this.workday() !== null;
  }

  get isHuddleActive(): boolean {
    return this.activeHuddle !== null;
  }

  async restoreWorkday(): Promise<void> {
    this.loading.set(true);
    this.errorMessage = '';

    try {
      const workday = await this.workdaysApi.getActiveWorkday();

      this.workday.set(workday);
      this.activeHuddle = workday?.activeHuddle ?? null;

      this.startDisplayTimer();
    } catch (error) {
      this.errorMessage = this.getErrorMessage(
        error,
        'Could not load the current workday.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  requestStartWorkday(): void {
    if (this.busy || this.workday()) return;

    this.errorMessage = '';
    this.selectedShiftDate = this.getManilaDateString();
    this.showStartWorkdayModal = true;
  }

  onShiftDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedShiftDate = input.value;
  }

  cancelStartWorkday(): void {
    if (this.busy) return;

    this.showStartWorkdayModal = false;
  }

  async confirmStartWorkday(): Promise<void> {
    if (
      this.busy ||
      this.workday() ||
      !this.selectedShiftDate
    ) {
      return;
    }

    this.busy = true;
    this.errorMessage = '';

    try {
      // The API service must accept this date and send it to the backend.
      const workday = await this.workdaysApi.startWorkday(
        this.selectedShiftDate
      );

      this.workday.set(workday);
      this.activeHuddle = null;

      this.showStartWorkdayModal = false;
      this.showEndWorkdayConfirmation = false;

      this.startDisplayTimer();
    } catch (error) {
      this.errorMessage = this.getErrorMessage(
        error,
        'Could not start the workday.'
      );
    } finally {
      this.busy = false;
    }
  }

  requestEndWorkday(): void {
    if (!this.workday() || this.busy) return;

    this.errorMessage = '';
    this.showEndWorkdayConfirmation = true;
  }

  cancelEndWorkday(): void {
    if (this.busy) return;

    this.showEndWorkdayConfirmation = false;
  }

  async endWorkday(): Promise<void> {
    if (!this.workday() || this.busy) return;

    this.busy = true;
    this.errorMessage = '';

    try {
      await this.workdaysApi.endWorkday();

      this.workday.set(null);
      this.activeHuddle = null;
      this.showEndWorkdayConfirmation = false;

      this.stopDisplayTimer();
      this.elapsedSeconds.set(0);
      this.huddleElapsedSeconds.set(0);
    } catch (error) {
      this.errorMessage = this.getErrorMessage(
        error,
        'Could not end the workday.'
      );
    } finally {
      this.busy = false;
    }
  }

  async toggleHuddle(): Promise<void> {
    if (!this.workday() || this.busy) return;

    this.busy = true;
    this.errorMessage = '';

    try {
      if (this.activeHuddle) {
        await this.workdaysApi.endHuddle();

        this.activeHuddle = null;
        this.huddleElapsedSeconds.set(0);
      } else {
        this.activeHuddle = await this.workdaysApi.startHuddle();

        this.updateElapsedTime();
      }
    } catch (error) {
      this.errorMessage = this.getErrorMessage(
        error,
        'Could not update the huddle.'
      );
    } finally {
      this.busy = false;
    }
  }

  formatTime(totalSeconds: number): string {
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return [hours, minutes]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }

  private getManilaDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private updateElapsedTime(): void {
    const now = Date.now();
    const workday = this.workday();
    const huddle = this.activeHuddle;

    const workdaySeconds = workday
      ? Math.max(
          0,
          Math.floor(
            (now - new Date(workday.startedAt).getTime()) / 1000
          )
        )
      : 0;

    const huddleSeconds = huddle
      ? Math.max(
          0,
          Math.floor(
            (now - new Date(huddle.startedAt).getTime()) / 1000
          )
        )
      : 0;

    this.elapsedSeconds.set(workdaySeconds);
    this.huddleElapsedSeconds.set(huddleSeconds);
  }

  private startDisplayTimer(): void {
    this.stopDisplayTimer();
    this.updateElapsedTime();

    if (!this.workday()) return;

    this.timerId = setInterval(() => {
      this.updateElapsedTime();
    }, 60_000);
  }

  private stopDisplayTimer(): void {
    if (this.timerId !== undefined) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const response = error as {
      error?: { message?: string };
    };

    return response?.error?.message || fallback;
  }
}
