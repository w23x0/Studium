export type Engine = 'claude' | 'codex';
export interface ModelChoice {
  id: string;
  label: string;
  resolvedModel?: string;
  isDefault?: boolean;
  efforts: string[];
}
export interface ModelSelection {
  model?: string | undefined;
  effort?: string | undefined;
}
export interface AccountState {
  loggedIn: boolean;
  label?: string;
  login?: { url: string; code?: string };
  error?: string;
}
export interface ConnectionView {
  mode: 'login' | 'api';
  baseUrl: string;
  keySet: boolean;
  revision: string;
}
export interface ConnectionInput {
  mode: 'login' | 'api';
  revision: string;
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  clear?: boolean | undefined;
}
export interface EngineSettings {
  connections: Record<Engine, ConnectionView>;
  engine: Engine;
  accounts: Record<Engine, AccountState>;
}
export interface ConversationModelSettings {
  connection: ConnectionView;
  efforts: string[];
  engine: Engine;
  selection: ModelSelection;
  models: ModelChoice[];
  current?: { engine: Engine; model?: string };
  pending: boolean;
  error?: string;
}
