// ESLint 报错一行一条：路径:行:列 规则 说明
module.exports = (results) =>
  results
    .flatMap((r) =>
      r.messages.map(
        (m) => `${r.filePath}:${m.line}:${m.column} ${m.ruleId ?? 'parse'} ${m.message}`,
      ),
    )
    .join('\n');
