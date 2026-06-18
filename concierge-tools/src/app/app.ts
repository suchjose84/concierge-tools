import { Component, signal } from '@angular/core';
import { EmailTemplateComponent } from '../app/email-template/email-template';

@Component({
  selector: 'app-root',
  imports: [ EmailTemplateComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('concierge-tools');
}