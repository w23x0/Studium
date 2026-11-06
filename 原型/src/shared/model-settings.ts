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
export interface EngineSettings {
  engine: Engine;
  accounts: Record<Engine, AccountState>;
}
export interface ConversationModelSettings {
  engine: Engine;
  selection: ModelSelection;
  models: ModelChoice[];
  current?: { engine: Engine; model?: string };
  pending: boolean;
  error?: string;
}
