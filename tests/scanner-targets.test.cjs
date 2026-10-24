const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function scanner(){
 const calls=[];const exports={};
 const source=fs.readFileSync('lib/audit/scanner.ts','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const context={exports,require:n=>n==='node:dns/promises'?{lookup:async h=>[{address:h==='internal.example'?'10.0.0.1':'93.184.216.34'}]}:require(n),URL,Response,AbortSignal,TextDecoder,setTimeout:fn=>{fn();return 0},fetch:async(url)=>{calls.push(url);return new Response(JSON.stringify({data:{html:'<html>'+ 'public content '.repeat(20)+'</html>'}}),{status:200});}};
 vm.runInNewContext(js,context);return {api:exports,calls};
}
test('private and credential-bearing inputs are rejected before proxy or direct fetch',async()=>{
 for(const url of ['http://localhost','http://127.0.0.1','http://10.0.0.1','http://100.64.0.1','http://169.254.169.254','http://[::1]','http://[::ffff:127.0.0.1]','http://[fe80::1]','http://internal.example','https://user:password@example.com','http://example.com:8080']){
  const s=scanner();await assert.rejects(s.api.fetchPublicWebsite(url));assert.equal(s.calls.length,0,url);
 }
});
test('public site remains eligible for the browser proxy',async()=>{
 const s=scanner();const result=await s.api.fetchPublicWebsite('https://example.com');
 assert.match(result.html,/public content/);assert.equal(s.calls.length,1);assert.match(s.calls[0],/^https:\/\/api.microlink.io/);
});
test('audit findings identify observed evidence separately from suggested actions',()=>{
 const s=scanner();const result=s.api.analyseWebsite('<html><head></head><body><h1>Example service</h1></body></html>','example.com');
 assert.equal(result.url,'example.com');
 assert.ok(result.checks.length>0);
 assert.ok(result.checks.every(check=>check.evidenceClass==='VERIFIED'&&check.sourceUrl==='https://example.com'&&check.collectedAt));
 assert.ok(result.opportunities.length>0);
 assert.ok(result.opportunities.every(item=>item.recommendationClass==='SUGGESTED'&&item.priority.score<=100&&item.priority.score>=0));
 assert.match(result.opportunities[0].priority.methodology,/does not include search demand, rankings or revenue/i);
 assert.equal(Object.hasOwn(result,'searchVolume'),false);
});
test('buyer intent radar returns hypotheses with no fabricated demand metrics',()=>{
 const s=scanner();const result=s.api.analyseWebsite('<html><head><title>Fire Safety</title></head><body><h1>Fire risk assessment</h1></body></html>','example.com',{category:'Fire risk assessment',market:'Ipswich'});
 assert.ok(result.buyerIntentRadar.length>=4);
 assert.ok(result.buyerIntentRadar.every(item=>item.evidenceClass==='SUGGESTED'&&item.searchVolume===null&&item.competition==='not measured'));
 assert.ok(result.buyerIntentRadar.some(item=>item.query.includes('Ipswich')));
 assert.ok(result.buyerIntentRadar.every(item=>/Search Console/.test(item.recommendedAction)));
});
