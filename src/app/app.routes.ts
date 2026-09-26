import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard'

export const routes: Routes = [{
    path: '',
    canActivate: [authGuard],
    pathMatch: 'full',
    loadComponent: () => {
        return import('./home/home').then((m) => m.Home);
    }
},{
    path: 'users',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./users/users').then((m) => m.Users);
    }
},{
    path: 'user-game-profile',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./user-game-profile/user-game-profile').then((m) => m.UserGameProfile);
    }
},{
    path: 'rank',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./rank/rank').then((m) => m.Rank);
    }
},{
    path: 'grades',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./grades/grades').then((m) => m.Grades);
    }
},{
    path: 'subjects',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./subjects/subjects').then((m) => m.Subjects);
    }
},{
    path: 'subjects/add',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./subjects/add-subject/add-subject').then((m) => m.AddSubject);
    }
},{
    path: 'subjects/:id',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./subjects/subject-detail/subject-detail').then((m) => m.SubjectDetail);
    }
},{
    path: 'subjects/:subjectId/levels/:levelId/questions',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./subjects/level-questions/level-questions').then((m) => m.LevelQuestions);
    }
},{
    path: 'questions/add',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./subjects/add-questions/add-questions').then((m) => m.AddQuestionComponent);
    }
},{
    path: 'questions/manage',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./questions/manage-questions').then((m) => m.ManageQuestions);
    }
},{
    path: 'levels',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./levels/levels').then((m) => m.Levels);
    }
},{
    path: 'levels-detail',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./levels/levels-detail/levels-detail').then((m) => m.LevelsDetail);
    }
},{
    path: 'topics',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./topics/topics').then((m) => m.Topics);
    }
},{
    path: 'topics-detail',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./topics/topics-detail/topics-detail').then((m) => m.TopicsDetail);
    }
},{
    path: 'images',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./images/images').then((m) => m.Images);
    }
},{
    path: 'audios',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => {
        return import('./audios/audios').then((m) => m.Audios);
    }
},{
    path: 'auth',
    pathMatch: 'full',
    loadComponent: () => {
        return import('./auth/auth').then((m) => m.AuthComponent);
    }
}


];
