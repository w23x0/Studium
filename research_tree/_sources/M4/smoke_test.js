const rdf = require('rdf-canonize');

const input1 = `_:a <http://p> _:b .
_:b <http://q> <http://x> .
_:c <http://r> _:a .
`;
const input2 = `_:z <http://p> _:y .
_:y <http://q> <http://x> .
_:w <http://r> _:z .
`;

(async () => {
  const out1 = await rdf.canonize(input1, {algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads'});
  const out2 = await rdf.canonize(input2, {algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads'});
  console.log('--- input1 canonical ---\n' + out1);
  console.log('--- input2 canonical ---\n' + out2);
  console.log('isomorphic output equal:', out1 === out2);
  const out1b = await rdf.canonize(out1, {algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads'});
  console.log('idempotent:', out1b === out1);
  console.log('output type:', typeof out1);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
