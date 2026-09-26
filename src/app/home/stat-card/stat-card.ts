import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  users = input.required<number>();
  subjects = input.required<number>();
  questions = input.required<number>();
  images = input.required<number>();
  audios = input.required<number>();

  get stats() {
    return [
      { label: 'Users', value: this.users().toString() },
      { label: 'Subjects', value: this.subjects().toString() },
      { label: 'Notifications', value: '0' },
      { label: 'Questions', value: this.questions().toString() },
      { label: 'Images', value: this.images().toString() },
      { label: 'Audios', value: this.audios().toString() },
    ];
  }
}
