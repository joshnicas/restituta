import { Component } from '@angular/core';
import { Sidebar } from "./sidebar/sidebar";
import { RouterOutlet } from '@angular/router';
import { MobileNavigation } from './mobile-navigation/mobile-navigation';

@Component({
  imports: [Sidebar, MobileNavigation, RouterOutlet],
  selector: 'app-player-layout',
  styleUrl: './player-layout.css',
  templateUrl: './player-layout.html',
})
export class PlayerLayout {}