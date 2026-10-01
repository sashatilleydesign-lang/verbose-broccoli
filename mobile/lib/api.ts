import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("strobe_token");
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync("strobe_token", token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("strobe_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/mobile${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  focus: () => request<FocusData>("/focus"),

  completeTask: (taskId: string) =>
    request<void>(`/tasks/${taskId}/complete`, { method: "POST" }),

  startSession: (taskId: string) =>
    request<{ sessionId: string }>(`/tasks/${taskId}/start-session`, { method: "POST" }),

  endSession: (sessionId: string, taskId: string) =>
    request<void>(`/tasks/${taskId}/end-session`, {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  weekly: () => request<WeeklyData>("/weekly"),

  markAsNext: (taskId: string) =>
    request<void>(`/tasks/${taskId}/mark-next`, { method: "POST" }),

  touchTask: (taskId: string) =>
    request<void>(`/tasks/${taskId}/touch`, { method: "POST" }),

  clients: () => request<ClientSummary[]>("/clients"),

  client: (id: string) => request<ClientDetail>(`/clients/${id}`),

  schedule: () => request<ScheduleData>("/schedule"),

  capture: () => request<CaptureData>("/capture"),

  captureCreate: (text: string) =>
    request<{ id: string }>("/capture", { method: "POST", body: JSON.stringify({ text }) }),

  archiveThread: (threadId: string) =>
    request<void>(`/threads/${threadId}/archive`, { method: "POST" }),

  convertThread: (threadId: string) =>
    request<void>(`/threads/${threadId}/convert`, { method: "POST" }),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type FocusData = {
  task: Task | null;
  upNext: Task[];
};

export type Task = {
  id: string;
  title: string;
  state: string;
  energy: string | null;
  context: string | null;
  pinned: boolean;
  batchSize?: number;
  batchDone?: number;
  clientName: string | null;
  clientColor: string | null;
  dueDate: string | null;
};

export type WeeklyData = {
  pinnedTask: Task | null;
  overdue: Task[];
  inFlight: Task[];
  upcoming: Task[];
  completedThisWeek: Task[];
};

export type ClientSummary = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  projectCount: number;
  pinnedTask: string | null;
};

export type ClientDetail = {
  id: string;
  name: string;
  color: string;
  pinnedTask: Task | null;
  tasks: Task[];
  projects: Project[];
  timeline: TimelineEntry[];
};

export type TimelineEntry = {
  title: string;
  date: string;
  type: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type ScheduleData = {
  today: string;
  days: {
    date: string;
    label: string;
    items: ScheduleItem[];
  }[];
};

export type ScheduleItem = {
  id: string;
  title: string;
  startHour: number;
  durationMins: number;
  clientName: string | null;
  clientColor: string | null;
};

export type EmailThread = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string | null;
};

export type CaptureData = {
  threads: EmailThread[];
  items: CaptureItem[];
};

export type CaptureItem = {
  id: string;
  text: string;
  createdAt: string;
};
