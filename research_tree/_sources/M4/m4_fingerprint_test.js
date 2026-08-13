/**
 * M4 原型实测 — rdf-canonize@5.0.0 RDFC-1.0 在 921 锚点 N-Quads 上的指纹实测
 *
 * 用法:
 *   node m4_fingerprint_test.js [anchors_921.nq 路径] [输出 canonical.nq 路径]
 *   默认输入: ../P1/anchors_921.nq
 *   默认输出: anchors_921_c14n_rdfcanonize.nq
 *
 * 环境: node v25.6.1, npm rdf-canonize@5.0.0
 * 目的: 验证
 *   1) rdf-canonize 5.0.0 是否真正实现 RDFC-1.0（对照 P1: rdflib canonicalize 是 no-op）
 *   2) canonical 指纹是否不随三元组插入顺序漂移、是否可复现
 *   3) 指纹比对能否替代全量重读（等价性/差异敏感性）
 *
 * 指纹定义: canonical N-Quads 全文的 SHA-256（hex, 64 字符）
 * 边界: 只验指纹稳定性与可复现性，不做性能基准。
 */
'use strict';
const rdf = require('rdf-canonize');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || path.join(__dirname, '..', 'P1', 'anchors_921.nq');
const OUT_C14N = process.argv[3] || path.join(__dirname, 'anchors_921_c14n_rdfcanonize.nq');

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// 可复现的伪随机数（mulberry32），保证排列可复现
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function canonizeNQ(nqString) {
  return await rdf.canonize(nqString, {
    algorithm: 'RDFC-1.0',
    inputFormat: 'application/n-quads'
  });
}

async function main() {
  console.log('=== M4 原型实测: rdf-canonize@5.0.0 RDFC-1.0 指纹实测 ===');
  console.log('node version:', process.version);
  console.log('rdf-canonize version:', require('rdf-canonize/package.json').version);
  console.log('input file:', INPUT);

  const raw = fs.readFileSync(INPUT, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  console.log('input non-empty lines:', lines.length);

  // 0) 空白节点扫描
  const bnLines = lines.filter(l => /_:/.test(l));
  console.log('lines containing blank-node labels:', bnLines.length);

  // 1) 用 rdf-canonize 自带 NQuads 解析器计数
  const parsed = rdf.NQuads.parse(raw);
  console.log('NQuads.parse quad count:', parsed.length);
  console.log('parse errors: 0 (parse threw would have aborted)');

  // 2) RDFC-1.0 是否真实现: 空白节点重标号 smoke（输入带不同空白标签的同构图）
  const bnodeIn1 = '_:a <urn:p> _:b .\n_:b <urn:q> <urn:x> .\n_:c <urn:r> _:a .\n';
  const bnodeIn2 = '_:z <urn:p> _:y .\n_:y <urn:q> <urn:x> .\n_:w <urn:r> _:z .\n';
  const bn1 = await canonizeNQ(bnodeIn1);
  const bn2 = await canonizeNQ(bnodeIn2);
  console.log('--- RDFC-1.0 blank-node relabel (isomorphism) ---');
  console.log('bnode input1 canonicalized:', JSON.stringify(bn1));
  console.log('bnode input2 canonicalized:', JSON.stringify(bn2));
  console.log('isomorphic datasets canonicalize identically:', bn1 === bn2);
  console.log('blank node labels were relabeled (c14nN prefix present):', /_:c14n\d/.test(bn1));

  // 3) 921 数据 canonical 化
  console.log('--- canonicalize anchors_921.nq ---');
  console.time('canonize-original');
  const canonical = await canonizeNQ(raw);
  console.timeEnd('canonize-original');
  const c14nLines = canonical.split('\n').filter(l => l.trim().length > 0);
  console.log('canonical output quad lines:', c14nLines.length);
  console.log('canonical output bytes (utf8):', Buffer.byteLength(canonical, 'utf8'));
  const fpOriginal = sha256(canonical);
  console.log('fingerprint(original order) sha256:', fpOriginal);
  console.log('fingerprint hex length:', fpOriginal.length);

  // 4) 顺序归一化证明: 输入原样 vs canonical 字节不同
  const inputAsIs = lines.join('\n') + '\n';
  console.log('canonical != raw input serialization (order got normalized):', canonical !== inputAsIs);

  // 保存 canonical 输出供 rdflib oracle 交叉验证
  fs.writeFileSync(OUT_C14N, canonical, 'utf8');
  console.log('canonical output written to:', OUT_C14N);

  // 5) 顺序不敏感性: 10 个种子化排列
  console.log('--- insertion-order independence (10 seeded permutations) ---');
  const PERMS = 10;
  let orderStable = true;
  for (let i = 0; i < PERMS; i++) {
    const rand = mulberry32(0xC0FFEE + i);
    const perm = shuffle([...lines], rand);
    const permStr = perm.join('\n') + '\n';
    console.time('canonize-perm-' + i);
    const c = await canonizeNQ(permStr);
    console.timeEnd('canonize-perm-' + i);
    const f = sha256(c);
    const same = f === fpOriginal;
    if (!same) orderStable = false;
    console.log('perm ' + String(i).padStart(2, '0') + ' fp=' + f.slice(0, 20) + '... equal=' + same);
  }
  console.log('order-independence: all ' + PERMS + ' permutations share the same fingerprint:', orderStable);

  // 6) 可复现性: 同一输入再跑两次
  console.log('--- reproducibility (2 extra runs on same input) ---');
  const r2 = sha256(await canonizeNQ(raw));
  const r3 = sha256(await canonizeNQ(raw));
  console.log('run2 fingerprint equal:', r2 === fpOriginal);
  console.log('run3 fingerprint equal:', r3 === fpOriginal);

  // 7) 差异敏感性: 指纹能否区分"数据集不同"
  console.log('--- diff sensitivity ---');
  // 7a. 删 1 条 quad
  const removeOne = lines.filter((_, idx) => idx !== 0).join('\n') + '\n';
  const fpRemove = sha256(await canonizeNQ(removeOne));
  console.log('remove-1-quad fingerprint differs:', fpRemove !== fpOriginal);
  // 7b. 增 1 条 quad
  const addOne = [...lines, '<urn:anchor:9999> <urn:quote> "M4 added fingerprint probe" .\n'].join('\n');
  const fpAdd = sha256(await canonizeNQ(addOne));
  console.log('add-1-quad fingerprint differs:', fpAdd !== fpOriginal);
  // 7c. 改 1 条 quad 的字面量内容
  const modOne = [...lines];
  modOne[0] = modOne[0].replace('"If S is a finite set', '"If S is a finite SET');
  const fpMod = sha256(await canonizeNQ(modOne.join('\n') + '\n'));
  console.log('modify-1-literal fingerprint differs:', fpMod !== fpOriginal);
  // 7d. 交换两条 quad 的 object（字面量值多重集相同、映射不同）
  const qs = rdf.NQuads.parse(raw);
  const swap = qs.map(q => ({...q}));
  const o0 = swap[0].object;
  swap[0] = {...swap[0], object: swap[1].object};
  swap[1] = {...swap[1], object: o0};
  const swapStr = rdf.NQuads.serialize(swap);
  const fpSwap = sha256(await canonizeNQ(swapStr));
  console.log('swap-2-literals (same value multiset, diff mapping) fingerprint differs:', fpSwap !== fpOriginal);

  // 8) 序列化健壮性: 同一数据集不同空白/换行序列化 -> 同一指纹
  console.log('--- serialization robustness ---');
  const wsVar = lines
    .map(l => l.replace(' <urn:quote> ', '  <urn:quote>\t'))
    .join('\r\n') + '\r\n';
  const fpWs = sha256(await canonizeNQ(wsVar));
  console.log('whitespace/line-ending variant same dataset same fp:', fpWs === fpOriginal);

  // 9) 内存
  const mem = process.memoryUsage();
  console.log('--- memory ---');
  console.log('rss MB:', (mem.rss / 1048576).toFixed(2));
  console.log('heapUsed MB:', (mem.heapUsed / 1048576).toFixed(2));
  console.log('external MB:', (mem.external / 1048576).toFixed(2));
  console.log('=== M4 实测结束 ===');
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
