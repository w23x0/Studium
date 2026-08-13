#!/usr/bin/env node
/**
 * P3 原型实测 — ShEx valueSet '~' 表达 9+other 词表封闭的校验语义
 *
 * 环境: node v25.6.1 + shex meta 1.0.0-alpha.29
 *   = @shexjs/parser (1.0.0-alpha.28) + @shexjs/validator (1.0.0-alpha.29)
 *     + @shexjs/neighborhood-rdfjs + n3
 * 安装: npm install shex   (已在 _sources/P3/ 下完成)
 * 运行: node p3_shex_valueset.js
 *
 * 建模依据: docs/图工程调研/M08实验-第15章分层图谱/data/edges-*.jsonl 的真实 rel 词表
 *   —— 10 个 rel 值: 9 个固定命名关系 (alias-of, applies-to, contrasts, equivalent,
 *      generalizes, implies, is-a, part-of, requires) + 兜底值 other (35 条边)。
 *   —— "9 固定值 + other" = 9 个显式值 + 兜底(other 以及任意未列值)。
 *
 * 本脚本回答:
 *   Q1 值封闭: valueSet 各种写法 (含 '~' / 闭合列表 / '.' 通配) 的接受-拒绝语义
 *   Q2 谓词封闭: CLOSED / EXTRA 与 valueSet 并置时, 9 固定谓词 + 额外谓词的拒绝/允许
 *   (Q3 语法长度对照在 p3_shacl_compare.py 中做)
 */

const { construct } = require("@shexjs/parser");
const { ShExValidator } = require("@shexjs/validator");
const { ctor: RdfJsDb } = require("@shexjs/neighborhood-rdfjs");
const N3 = require("n3");

const REL = "http://s.example/rel/";
const s = (v) => REL + v;

// 真实数据词表
const FIXED_9 = [
  "alias-of", "applies-to", "contrasts", "equivalent", "generalizes",
  "implies", "is-a", "part-of", "requires",
];
const OTHER = "other";

// 被测值
const testValues = [
  ...FIXED_9.map((v) => ({ label: "fixed:" + v, term: N3.DataFactory.namedNode(s(v)) })),
  { label: "other(数据兜底值)", term: N3.DataFactory.namedNode(s(OTHER)) },
  { label: "arbitrary(未列IRI)", term: N3.DataFactory.namedNode(s("custom-unknown-rel")) },
  { label: "literal('part-of')", term: N3.DataFactory.literal("part-of") },
];

function buildSchema(shexStr) {
  const parser = construct();
  return parser.parse(shexStr);
}

function makeStore(quads) {
  const store = new N3.Store();
  for (const q of quads) store.addQuad(q);
  return store;
}

function validateNode(schema, store, nodeIri, shapeIri) {
  const validator = new ShExValidator(schema, RdfJsDb(store), {});
  const results = validator.validateShapeMap([{ node: nodeIri, shape: shapeIri }]);
  const r = results[0];
  const conform = r.status === "conformant";
  const errs = (r.appinfo && r.appinfo.errors || []).map(
    (e) => e.type || e.name || JSON.stringify(e).slice(0, 120)
  );
  return { conform, errs };
}

// ---------- Q1: 值封闭 ----------
function q1() {
  console.log("=== Q1: valueSet 值封闭语义 ===");
  // 4 种 valueSet 写法
  const sets = {
    T1: "[9 固定值 + 末尾 ~] (B5b 原文写法)",   // [rel:a ... rel:i ~]
    T2: "[9 固定值] (闭合 9)",                   // [rel:a ... rel:i]
    T3: "[9 固定值 + rel:other] (闭合 10, 数据词表)",
    T4: "[ . - 9 固定值 ] (通配排除 9 = 补集)",
  };
  const valueSetText = {
    T1: "[" + FIXED_9.map((v) => "rel:" + v).join(" ") + " ~]",
    T2: "[" + FIXED_9.map((v) => "rel:" + v).join(" ") + "]",
    T3: "[" + FIXED_9.map((v) => "rel:" + v).join(" ") + " rel:" + OTHER + "]",
    T4: "[ . " + FIXED_9.map((v) => "- rel:" + v).join(" ") + "]",
  };
  const total = { ACCEPT: 0, REJECT: 0 };
  for (const [name, desc] of Object.entries(sets)) {
    const shex =
      `PREFIX rel: <${REL}>\n` +
      `<http://s.example/EdgeShape> { rel:rel ${valueSetText[name]} }`;
    let schema;
    try {
      schema = buildSchema(shex);
    } catch (e) {
      console.log(`\n-- ${name} ${desc} --`);
      console.log("  valueSet: " + valueSetText[name]);
      console.log("  PARSE ERROR: " + e.message.split("\n")[0]);
      continue;
    }
    const vals = schema.shapes[0].shapeExpr.expression.valueExpr.values;
    console.log(`\n-- ${name} ${desc} --`);
    console.log("  valueSet: " + valueSetText[name]);
    console.log("  解析为: " + JSON.stringify(vals));
    for (const tv of testValues) {
      const nodeIri = "http://s.example/n-q1-" + name;
      const quad = N3.DataFactory.quad(
        N3.DataFactory.namedNode(nodeIri),
        N3.DataFactory.namedNode(s("rel")),
        tv.term
      );
      const r = validateNode(schema, makeStore([quad]), nodeIri, "http://s.example/EdgeShape");
      total[r.conform ? "ACCEPT" : "REJECT"]++;
      console.log(
        `    ${tv.label.padEnd(24)} -> ${r.conform ? "ACCEPT" : "REJECT"}` +
        (r.conform ? "" : "  [" + r.errs.join(", ") + "]")
      );
    }
  }
  // 语法探针: 裸通配
  console.log("\n-- 语法探针: 裸通配写法 --");
  for (const probe of ["[~]", "[ . ]", "[~ - rel:part-of]", "[ . - rel:part-of]"]) {
    try {
      buildSchema(
        `PREFIX rel: <${REL}>\n<http://s.example/EdgeShape> { rel:rel ${probe} }`
      );
      console.log(`  ${probe.padEnd(20)} -> PARSE OK`);
    } catch (e) {
      console.log(`  ${probe.padEnd(20)} -> PARSE ERROR`);
    }
  }
  console.log(`\nQ1 汇总: ${total.ACCEPT} ACCEPT / ${total.REJECT} REJECT (合计 ${total.ACCEPT + total.REJECT})`);
  return total;
}

// ---------- Q2: 谓词封闭 ----------
function q2() {
  console.log("\n=== Q2: CLOSED / EXTRA 与 valueSet 并置 (谓词封闭) ===");
  console.log("注: 规范 §5.5.2 EXTRA 只放行『已在表达式中的谓词(matchables)』的未消费三元组,");
  console.log("    不放行外来谓词; CLOSED 要求 unmatchables 为空。故 EXTRA rel:extra 不豁免外来谓词。");
  const valueSetT3 = "[" + FIXED_9.map((v) => "rel:" + v).join(" ") + " rel:" + OTHER + "]";
  const valueSetT1 = "[" + FIXED_9.map((v) => "rel:" + v).join(" ") + " ~]"; // B5b 形式
  const preds = FIXED_9.map((v) => "rel:" + v);

  const results = [];
  // 2a: CLOSED + 闭合10 valueSet
  const tc10 = preds.map((pp) => pp + " " + valueSetT3).join(" ; ");
  const shexClosed10 =
    `PREFIX rel: <${REL}>\n` +
    `<http://s.example/NodeClosed10> CLOSED { ${tc10} }`;
  // 2b: CLOSED + EXTRA rel:extra (外来谓词 — 按规范不放行)
  const shexExtra10 =
    `PREFIX rel: <${REL}>\n` +
    `<http://s.example/NodeExtra10> CLOSED EXTRA rel:extra { ${tc10} }`;
  // 2c: CLOSED + '~' 形式 valueSet (B5b 原文形式, 与 CLOSED 并置)
  const tc1 = preds.map((pp) => pp + " " + valueSetT1).join(" ; ");
  const shexClosed1 =
    `PREFIX rel: <${REL}>\n` +
    `<http://s.example/NodeClosedTilde> CLOSED { ${tc1} }`;
  // 2d: EXTRA 的正确用法 — rel:extra 同时在表达式里, 超出基数的副本被放行
  const tcExtraInExpr = tc10 + " ; rel:extra [rel:extra]";
  const shexExtraInExpr =
    `PREFIX rel: <${REL}>\n` +
    `<http://s.example/NodeExtraInExpr> CLOSED EXTRA rel:extra { ${tcExtraInExpr} }`;

  const schemas = {
    "CLOSED+闭合10valueSet": { schema: buildSchema(shexClosed10), shape: "http://s.example/NodeClosed10" },
    "CLOSED+EXTRA(外来谓词)": { schema: buildSchema(shexExtra10), shape: "http://s.example/NodeExtra10" },
    "CLOSED+'~'valueSet(并置)": { schema: buildSchema(shexClosed1), shape: "http://s.example/NodeClosedTilde" },
    "EXTRA在表达式中(正例)": { schema: buildSchema(shexExtraInExpr), shape: "http://s.example/NodeExtraInExpr" },
  };

  const nodeCases = [
    {
      name: "仅 9 固定谓词 (值在词表内)",
      quads: FIXED_9.map((p, i) =>
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s(p)),
          N3.DataFactory.namedNode(s(FIXED_9[i]))
        )
      ),
      expect: {
        "CLOSED+闭合10valueSet": "ACCEPT",
        "CLOSED+EXTRA(外来谓词)": "ACCEPT",
        "CLOSED+'~'valueSet(并置)": "ACCEPT",
        "EXTRA在表达式中(正例)": "REJECT", // 该 shape 的 rel:extra 约束为强制基数1, 缺 rel:extra 三元组 → MissingProperty
      },
    },
    {
      name: "9 固定谓词 + 外来谓词 rel:extra",
      quads: FIXED_9.map((p, i) =>
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s(p)),
          N3.DataFactory.namedNode(s(FIXED_9[i]))
        )
      ).concat(
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s("extra")),
          N3.DataFactory.namedNode(s("extra-val"))
        )
      ),
      expect: {
        "CLOSED+闭合10valueSet": "REJECT",
        "CLOSED+EXTRA(外来谓词)": "REJECT", // EXTRA 不放行外来谓词 (规范一致)
        "CLOSED+'~'valueSet(并置)": "REJECT",
        "EXTRA在表达式中(正例)": "REJECT",  // rel:extra 不在本 shape 表达式里 (本 shape 的表达式无 rel:extra)
      },
    },
    {
      name: "9 固定谓词 + 未声明额外谓词 rel:unlisted",
      quads: FIXED_9.map((p, i) =>
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s(p)),
          N3.DataFactory.namedNode(s(FIXED_9[i]))
        )
      ).concat(
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s("unlisted")),
          N3.DataFactory.namedNode(s("unlisted-val"))
        )
      ),
      expect: {
        "CLOSED+闭合10valueSet": "REJECT",
        "CLOSED+EXTRA(外来谓词)": "REJECT",
        "CLOSED+'~'valueSet(并置)": "REJECT",
        "EXTRA在表达式中(正例)": "REJECT",
      },
    },
    {
      name: "EXTRA正例: rel:extra 在表达式中且超出基数",
      quads: FIXED_9.map((p, i) =>
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s(p)),
          N3.DataFactory.namedNode(s(FIXED_9[i]))
        )
      ).concat([
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s("extra")),
          N3.DataFactory.namedNode(s("extra"))
        ),
        N3.DataFactory.quad(
          N3.DataFactory.namedNode("http://s.example/e"),
          N3.DataFactory.namedNode(s("extra")),
          N3.DataFactory.namedNode(s("extra"))
        ),
      ]),
      expect: {
        "CLOSED+闭合10valueSet": "REJECT",
        "CLOSED+EXTRA(外来谓词)": "REJECT",
        "CLOSED+'~'valueSet(并置)": "REJECT",
        "EXTRA在表达式中(正例)": "ACCEPT", // EXTRA 放行 matchable 的未消费副本
      },
    },
  ];

  let n = 0, mismatch = 0;
  for (const c of nodeCases) {
    for (const [sname, { schema, shape: shapeIri }] of Object.entries(schemas)) {
      n++;
      const r = validateNode(schema, makeStore(c.quads), "http://s.example/e", shapeIri);
      const got = r.conform ? "ACCEPT" : "REJECT";
      const exp = c.expect[sname];
      const ok = got === exp;
      if (!ok) mismatch++;
      results.push({ sname, cname: c.name, got, exp, ok, errs: r.errs });
      console.log(
        `  ${sname.padEnd(24)} | ${c.name.padEnd(40)} -> ${got} (预期 ${exp}) ${ok ? "OK" : "** MISMATCH **"}` +
        (r.conform ? "" : "  [" + r.errs.slice(0, 3).join("; ") + "]")
      );
    }
  }
  console.log(`\nQ2 汇总: ${n} 次校验, ${mismatch} 次与预期不符`);
  return { n, mismatch };
}

function main() {
  console.time("总耗时");
  console.log("node " + process.version);
  console.log("shex meta: " + require("shex/package.json").version);
  console.log("validator: " + require("@shexjs/validator/package.json").version);
  console.log("parser: " + require("@shexjs/parser/package.json").version);
  console.log("n3: " + require("n3/package.json").version);
  console.log("9 固定关系: " + FIXED_9.join(", "));
  console.log("兜底值: rel:" + OTHER);
  const r1 = q1();
  const r2 = q2();
  console.timeEnd("总耗时");
  const totalAcc = r1.ACCEPT;
  const totalRej = r1.REJECT;
  console.log(`\n======== 通过率: Q1 ${totalAcc} ACCEPT / ${totalRej} REJECT; Q2 ${r2.n - r2.mismatch}/${r2.n} 与预期一致 ========`);
}

main();
