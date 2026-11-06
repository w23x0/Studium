#!/usr/bin/env python3
# 用法：run.py <标签> <场景 A|B> <端口> ；在 var 拷贝上起服务，发一句话，等学习对话第一条，存结果，停服务
import json,os,shutil,subprocess,sys,time,urllib.request,glob,signal
label,scene,port=sys.argv[1],sys.argv[2],sys.argv[3]
ROOT='/home/w23x/Studium/原型'; base=os.path.dirname(os.path.abspath(__file__)); data=f'{base}/data/{label}'
shutil.rmtree(data,ignore_errors=True)
shutil.copytree(f'{ROOT}/var',data,ignore=shutil.ignore_patterns('.lock','index.sqlite*','codex-runtime'),symlinks=True)
MAIN,TEXT={'A':('20261104-092108-main-42fcbf','接着学，新开一个对话'),'B':('20261028-073715-main-a5ac96','开始今天的学习')}[scene]
if scene=='A':
    for d in ('sessions','sandbox','screens'):
        for x in glob.glob(f'{data}/{d}/20261106-065946-loop-dab670*'):
            shutil.rmtree(x) if os.path.isdir(x) else os.remove(x)
    p=f'{data}/sessions/{MAIN}.jsonl'; L=open(p,encoding='utf8').read().split('\n')[:147]
    open(p,'w',encoding='utf8').write('\n'.join(L)+'\n')
env=dict(os.environ,STUDIUM_DATA=data,STUDIUM_PORT=port,STUDIUM_TOKEN='trial')
log=open(f'{base}/{label}.server.log','w')
srv=subprocess.Popen(['npx','tsx','src/core/main.ts'],cwd=ROOT,env=env,stdout=log,stderr=log,start_new_session=True)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/',timeout=1); break
        except Exception as e:
            if hasattr(e,'code'): break
            time.sleep(1)
    before=set(os.listdir(f'{data}/sessions'))
    t0=time.time()
    r=urllib.request.Request(f'http://127.0.0.1:{port}/api/sessions/{MAIN}/messages',data=json.dumps({'text':TEXT}).encode(),headers={'authorization':'Bearer trial','content-type':'application/json'},method='POST')
    print(urllib.request.urlopen(r,timeout=30).read()[:200],flush=True)
    found=None;msg=None
    while time.time()-t0<600:
        new=[f for f in set(os.listdir(f'{data}/sessions'))-before if '-loop-' in f]
        if new:
            found=new[0]
            for l in open(f'{data}/sessions/{found}',encoding='utf8'):
                try:d=json.loads(l)
                except: continue
                if d['type']=='assistant_message' and not d.get('interim'): msg=d
            if msg: break
        time.sleep(3)
    time.sleep(2)
    print('found',found,'msg',bool(msg),'elapsed',round(time.time()-t0),flush=True)
    if not found: sys.exit(1)
    recs=[json.loads(l) for l in open(f'{data}/sessions/{found}',encoding='utf8')]
    out={'label':label,'scene':scene,'text':(msg or {}).get('text'),'seconds':None,'tools':[],'components':[],'context':None,'model':None,'errors':[]}
    t1=recs[0]['at']
    for d in recs:
        if d['type']=='model_used': out['model']=d['selection']
        if d['type']=='context_used': out['context']=(d['tokens'],d.get('output'))
        if d['type']=='tool_call':
            out['tools'].append(d['name'])
            if d['name'] in('put_component','reuse_component'): out['components'].append({k:(v if k!='html' else v[:6000]) for k,v in d['args'].items()})
        if d['type']=='sandbox_action': out['tools'].append(d['op'])
        if d['type']=='model_raw':
            c=(d.get('payload') or {}).get('content')
            if isinstance(c,list):
                for b in c:
                    if b.get('type')=='tool_result' and b.get('is_error'): out['errors'].append(json.dumps(b.get('content'),ensure_ascii=False)[:200])
    if msg:
        from datetime import datetime as D
        out['seconds']=round((D.fromisoformat(msg['at'].replace('Z','+00:00'))-D.fromisoformat(t1.replace('Z','+00:00'))).total_seconds())
    json.dump(out,open(f'{base}/{label}.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
    print(json.dumps({k:out[k] for k in('seconds','context','model','errors')},ensure_ascii=False))
finally:
    try: os.killpg(srv.pid,signal.SIGTERM)
    except ProcessLookupError: pass
