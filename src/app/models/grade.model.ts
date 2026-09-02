export interface Grade {
    id: number;
    curriculumVersionId: number;
    name: string;
    code: string;
    level: number;
    stage: 'PRE_PRIMARY' | 'PRIMARY' | 'SECONDARY';
    active: boolean;
    createdAt: string;
    updatedAt: string;
}