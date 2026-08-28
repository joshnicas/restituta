import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  selector: 'app-mobile-navigation',
  styleUrl: './mobile-navigation.css',
  templateUrl: './mobile-navigation.html',
})
export class MobileNavigation {}
