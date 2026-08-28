import { Routes } from '@angular/router';
import { Play } from './features/play/play';
import { Leaderboard } from './features/leaderboard/leaderboard';
import { Dashboard } from './features/dashboard/dashboard';
import { Profile } from './features/profile/profile';
import { PlayerLayout } from './layout/player-layout/player-layout';


export const routes: Routes = [
    {
        path: '',
        component: PlayerLayout,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: Dashboard
            },
            {
                path: 'play',
                component: Play
            },
            {
                path: 'leaderboard',
                component: Leaderboard
            },
            {
                path: 'profile',
                component: Profile
            }
        ]
    }
];
