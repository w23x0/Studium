// 练习（批 9）的接口：某段学习的练习、交作答、要提示、先不做、请老师归纳；常犯的错、这类题怎么想、书里的习题。
import type {
  ErrorPatternsResponse,
  ExercisesResponse,
  PracticeSummariesResponse,
  PracticeTaskResponse,
  PracticeTasksResponse,
} from '../shared/protocol.ts';
import { call, qs } from './api.ts';

const base = (loopId: string) => `/loops/${encodeURIComponent(loopId)}/practice`;

export const practiceApi = {
  tasks: (loopId: string) => call<PracticeTasksResponse>(base(loopId)),
  task: (loopId: string, taskId: string) =>
    call<PracticeTaskResponse>(`${base(loopId)}/${encodeURIComponent(taskId)}`),
  /** 写一段作答直接交（进对话，老师会看）。 */
  submitText: (loopId: string, taskId: string, text: string) =>
    call<PracticeTaskResponse>(`${base(loopId)}/${encodeURIComponent(taskId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  /** 把刚才说的几句（行号）认作作答。 */
  submitLines: (loopId: string, taskId: string, lines: number[]) =>
    call<PracticeTaskResponse>(`${base(loopId)}/${encodeURIComponent(taskId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    }),
  hint: (loopId: string, taskId: string) =>
    call<PracticeTaskResponse>(`${base(loopId)}/${encodeURIComponent(taskId)}/hint`, {
      method: 'POST',
      body: '{}',
    }),
  abandon: (loopId: string, taskId: string, note?: string) =>
    call<PracticeTaskResponse>(`${base(loopId)}/${encodeURIComponent(taskId)}/abandon`, {
      method: 'POST',
      body: JSON.stringify(note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}),
    }),
  /** 请老师据这段学习里做完的练习归纳一次。 */
  summarize: (loopId: string) =>
    call<{ taskIds: string[] }>(`${base(loopId)}/summarize`, { method: 'POST', body: '{}' }),
  summaries: (loop?: string) =>
    call<PracticeSummariesResponse>(`/practice/summaries?${qs({ loop })}`),
  errorPatterns: (point?: string) =>
    call<ErrorPatternsResponse>(`/practice/error-patterns?${qs({ point })}`),
  exercises: (p: { book?: string; chapter?: string; project?: string; all?: boolean }) =>
    call<ExercisesResponse>(
      `/practice/exercises?${qs({
        book: p.book,
        chapter: p.chapter,
        project: p.project,
        all: p.all === true ? 1 : undefined,
      })}`,
    ),
};
