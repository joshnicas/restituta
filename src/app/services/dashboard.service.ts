import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Grade,
  GradeSubject,
  Topic,
  GameLevel,
  GameType,
  Question,
  CreateLevelPayload,
  UpdateLevelPayload,
  CreateSubjectPayload,
  QuestionOption,
  MatchPair,
  OrderingItem,
  AcceptedAnswer,
  QuestionMedia,
  CreateQuestionPayload,
  CreateTopicPayload,
  UpdateTopicPayload,
} from '../models/educational.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  private getAdminHeaders(): HttpHeaders | undefined {
    const token = globalThis.localStorage?.getItem('admin_token')
      || globalThis.localStorage?.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private mapResponse<T>(key: string) {
    return map((response: unknown) => {
      if (Array.isArray(response)) return response as T[];
      if (!this.isRecord(response)) return [] as T[];
      if (Array.isArray(response[key])) return response[key] as T[];
      const data = response['data'];
      if (Array.isArray(data)) return data as T[];
      if (this.isRecord(data) && Array.isArray(data[key])) return data[key] as T[];
      return [] as T[];
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users`, { headers: this.getAdminHeaders() });
  }

  getGrades(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grades`);
  }

  getGrade(gradeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grades/${gradeId}`);
  }

  getSubjects(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/subjects`);
  }

  getSubjectsByGrade(gradeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grades/${gradeId}/subjects`);
  }

  getGradeSubject(gradeSubjectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grade-subjects/${gradeSubjectId}`);
  }

  getTopicsByGradeSubject(gradeSubjectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grade-subjects/${gradeSubjectId}/topics`);
  }

  getLevelsByGradeSubject(gradeSubjectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/grade-subjects/${gradeSubjectId}/levels`);
  }

  getQuestionsByLevel(levelId: number, params?: { topicId?: number | null; gameTypeId?: number | null }): Observable<any> {
    const queryParams: Record<string, string> = {};
    if (params?.topicId !== undefined && params.topicId !== null) {
      queryParams['topicId'] = String(params.topicId);
    }
    if (params?.gameTypeId !== undefined && params.gameTypeId !== null) {
      queryParams['gameTypeId'] = String(params.gameTypeId);
    }
    return this.http.get<any>(`${this.baseUrl}/levels/${levelId}/questions`, { params: queryParams });
  }

  getQuestionsByTopic(topicId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/topics/${topicId}/questions`);
  }

  createSubject(data: CreateSubjectPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/subjects`, data, { headers: this.getAdminHeaders() });
  }

  updateSubject(subjectId: number, data: Partial<CreateSubjectPayload>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/subjects/${subjectId}`, data, { headers: this.getAdminHeaders() });
  }

  deleteSubject(subjectId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/subjects/${subjectId}`, { headers: this.getAdminHeaders() });
  }

  getQuestions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/questions`);
  }

  getQuestion(questionId: number, language: 'EN' | 'SW' = 'EN'): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/questions/${questionId}`, { params: { language } });
  }

  getTopics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/topics`);
  }

  createTopic(data: CreateTopicPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/topics`, data, { headers: this.getAdminHeaders() });
  }

  updateTopic(id: number, data: UpdateTopicPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/topics/${id}`, data, { headers: this.getAdminHeaders() });
  }

  deleteTopic(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/topics/${id}`, { headers: this.getAdminHeaders() });
  }

  getLevels(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/levels`);
  }

  getLevel(levelId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/levels/${levelId}`);
  }

  deleteLevel(levelId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/levels/${levelId}`, { headers: this.getAdminHeaders() });
  }

  deleteQuestion(questionId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/questions/${questionId}`, { headers: this.getAdminHeaders() });
  }

  updateLevel(levelId: number, data: UpdateLevelPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/levels/${levelId}`, data, { headers: this.getAdminHeaders() });
  }

  updateQuestion(questionId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/questions/${questionId}`, data, { headers: this.getAdminHeaders() });
  }

  createLevel(data: CreateLevelPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/levels`, data, { headers: this.getAdminHeaders() });
  }

  createQuestion(data: CreateQuestionPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/questions`, data, { headers: this.getAdminHeaders() });
  }

  getGameTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/game-types`);
  }

  getCompetencies(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/competencies`);
  }

  getThemes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/themes`);
  }

  createGrade(data: { curriculumVersionId: number; name: string; code: string; level: number; stage: string; active?: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/grades`, data, { headers: this.getAdminHeaders() });
  }

  updateGrade(id: number, data: { name?: string; code?: string; level?: number; stage?: string; active?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/grades/${id}`, data, { headers: this.getAdminHeaders() });
  }

  deleteGrade(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/grades/${id}`, { headers: this.getAdminHeaders() });
  }

  getImages(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/images`);
  }

  getImageCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/image-categories`);
  }

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/images`, formData, { headers: this.getAdminHeaders() });
  }

  deleteImage(imageId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/images/${imageId}`, { headers: this.getAdminHeaders() });
  }

  getAudios(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/audios`);
  }

  getAudioCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/audio-categories`);
  }

  uploadAudio(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/audios`, formData, { headers: this.getAdminHeaders() });
  }

  deleteAudio(audioId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/audios/${audioId}`, { headers: this.getAdminHeaders() });
  }
}
