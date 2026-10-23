// 别处的 AI 对话记录（导出的 JSON）→ “学习者：… / AI：…” 逐条 md（工单 W9 §4.3）。
// 认得的：ChatGPT 导出（mapping 树）、Claude 导出（chat_messages）、通用的 [{ role, content }] 或 { messages }。
// 认不出的原样放进代码块，不猜内容。

interface Turn {
  who: '学习者' | 'AI';
  text: string;
}

interface Conversation {
  title: string;
  turns: Turn[];
}

/** 一份导出 → md；认不出就整份原样放进代码块。 */
export function chatExportToMarkdown(raw: string, title: string): string {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback(raw, title);
  }
  const convs = conversations(data);
  if (convs === undefined || convs.every((c) => c.turns.length === 0)) return fallback(raw, title);
  const out = [`# ${title}`, ''];
  for (const c of convs) {
    if (c.turns.length === 0) continue;
    if (convs.length > 1) out.push(`## ${c.title || '（无题）'}`, '');
    for (const t of c.turns) out.push(`**${t.who}**：${t.text.trim()}`, '');
  }
  return out.join('\n');
}

function conversations(data: unknown): Conversation[] | undefined {
  if (Array.isArray(data)) {
    // 一组对话（ChatGPT / Claude 的整份导出），或一组消息
    if (data.length > 0 && data.every((x) => isConversation(x))) {
      return data.map((x) => conversation(x as Record<string, unknown>));
    }
    const turns = messages(data);
    return turns !== undefined ? [{ title: '', turns }] : undefined;
  }
  if (isObject(data)) {
    if (isConversation(data)) return [conversation(data)];
    if (Array.isArray(data.messages)) {
      const turns = messages(data.messages);
      return turns !== undefined ? [{ title: str(data.title), turns }] : undefined;
    }
  }
  return undefined;
}

function isConversation(x: unknown): boolean {
  return isObject(x) && (isObject(x.mapping) || Array.isArray(x.chat_messages));
}

function conversation(c: Record<string, unknown>): Conversation {
  const title = str(c.title) || str(c.name);
  if (Array.isArray(c.chat_messages)) {
    // Claude 导出：{ sender: 'human' | 'assistant', text, content: [{ type: 'text', text }] }
    return { title, turns: messages(c.chat_messages) ?? [] };
  }
  // ChatGPT 导出：mapping 是一棵树，从 current_node 沿 parent 往上走就是显示出来的那条线
  const mapping = c.mapping as Record<string, Record<string, unknown>>;
  const chain: Record<string, unknown>[] = [];
  let node = str(c.current_node) || lastLeaf(mapping);
  for (let i = 0; node !== '' && i < 10_000; i++) {
    const n = mapping[node];
    if (n === undefined) break;
    if (isObject(n.message)) chain.push(n.message);
    node = str(n.parent);
  }
  return { title, turns: messages(chain.reverse()) ?? [] };
}

function lastLeaf(mapping: Record<string, Record<string, unknown>>): string {
  const leaves = Object.entries(mapping).filter(
    ([, n]) => !Array.isArray(n.children) || n.children.length === 0,
  );
  return leaves.at(-1)?.[0] ?? '';
}

/** 一串消息 → 一轮轮；系统、工具消息不要。一条都认不出返回空。 */
function messages(list: unknown[]): Turn[] | undefined {
  const out: Turn[] = [];
  let recognized = false;
  for (const m of list) {
    if (!isObject(m)) continue;
    const role = str(m.role) || str(m.sender) || (isObject(m.author) ? str(m.author.role) : '');
    const who = whoOf(role);
    if (role !== '') recognized = true;
    if (who === undefined) continue;
    const text = textOf(m.content) || str(m.text) || textOf(m.parts);
    if (text.trim() !== '') out.push({ who, text });
  }
  return recognized ? out : undefined;
}

function whoOf(role: string): Turn['who'] | undefined {
  const r = role.toLowerCase();
  if (r === 'user' || r === 'human') return '学习者';
  if (r === 'assistant' || r === 'model' || r === 'ai' || r === 'bot') return 'AI';
  return undefined;
}

/** 消息内容：字符串、{ parts: [...] }（ChatGPT）、[{ type: 'text', text }]（Claude / 通用）。 */
function textOf(c: unknown): string {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .map((p) => (typeof p === 'string' ? p : isObject(p) ? str(p.text) : ''))
      .filter((t) => t !== '')
      .join('\n');
  }
  if (isObject(c)) return textOf(c.parts) || str(c.text);
  return '';
}

function fallback(raw: string, title: string): string {
  return [
    `# ${title}`,
    '',
    '（认不出这份导出的格式，原样放在下面）',
    '',
    '```',
    raw,
    '```',
    '',
  ].join('\n');
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function str(x: unknown): string {
  return typeof x === 'string' ? x : '';
}
