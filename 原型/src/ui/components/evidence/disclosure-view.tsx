// 内容送往哪里：哪个服务、经什么通道、送出什么、各类对话用什么模型。
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { W } from '../../wording.ts';
import { Card, Field, Loading, Section } from './parts.tsx';

export function DisclosureView() {
  const r = useLoad('disclosure', () => api.disclosure(), false);
  if (!r.data) return <Loading error={r.error} />;
  const d = r.data;
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-lg">{W.disclosure}</h2>
      <Card className="flex flex-col gap-3">
        <Field label={W.disclosureService}>{d.service}</Field>
        <Field label={W.disclosureRoute}>{d.route}</Field>
        <Field label={W.disclosureAdapter}>{d.adapter}</Field>
      </Card>
      <Section title={W.disclosureSends}>
        <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
          {d.sends.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title={W.disclosureSessions}>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium" />
                <th className="px-3 py-1.5 text-left font-medium">{W.modelLabel}</th>
                <th className="px-3 py-1.5 text-left font-medium">{W.effort}</th>
              </tr>
            </thead>
            <tbody>
              {d.sessions.map((s) => (
                <tr key={s.kind} className="border-t">
                  <td className="px-3 py-1.5">{s.label}</td>
                  <td className="px-3 py-1.5">{s.model ?? W.defaultModel}</td>
                  <td className="px-3 py-1.5">{s.effort ?? W.defaultEffort}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">{d.note}</p>
      </Section>
    </div>
  );
}
