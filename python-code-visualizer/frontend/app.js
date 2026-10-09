const codeEl=document.getElementById('code');
const examples={
 basic:"x = 5\ny = 10\n\nif x < y:\n    result = x + y\nelse:\n    result = x - y\n\nprint(result)",
 loop:"total = 0\nfor number in [1, 2, 3, 4]:\n    total = total + number\nprint(total)",
 function:"def greet(name):\n    message = 'Hello, ' + name\n    return message\n\nperson = 'Python'\nresult = greet(person)\nprint(result)",
 list:"scores = [70, 85, 90]\naverage = sum(scores) / len(scores)\nprint(average)"
};
let trace=[],index=-1,lastRun=null;
const $=id=>document.getElementById(id);
$('exampleSelect').addEventListener('change',e=>{codeEl.value=examples[e.target.value];resetView();});
$('runBtn').addEventListener('click',runCode);
$('resetBtn').addEventListener('click',()=>{resetView();$('runMessage').textContent='Ready to run';});
$('prevBtn').addEventListener('click',()=>showStep(index-1));
$('nextBtn').addEventListener('click',()=>showStep(index+1));
$('clearOutput').addEventListener('click',()=>{$('output').textContent='(Output cleared)';});
$('compareBtn').addEventListener('click',()=>{
 if(!lastRun){$('comparison').textContent='Run your code twice to compare output and final variables.';return;}
 const now={output:$('output').textContent,variables:[...document.querySelectorAll('.var-row')].map(r=>r.innerText).join('\\n')};
 $('comparison').textContent='Previous output:\\n'+lastRun.output+'\\n\\nCurrent output:\\n'+now.output+'\\n\\nFinal variables:\\n'+now.variables;
});
document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-answer]').forEach(x=>x.classList.remove('correct','wrong'));
 const ok=b.dataset.answer==='12';b.classList.add(ok?'correct':'wrong');
 $('quizFeedback').textContent=ok?'Correct! The * operator multiplies 3 by 4.':'Not quite. Multiplication happens before printing, so the answer is 12.';
}));
async function runCode(){
 $('runBtn').disabled=true;$('runMessage').textContent='Tracing code…';
 try{
  const r=await fetch('http://127.0.0.1:8000/trace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:codeEl.value})});
  const data=await r.json();if(!r.ok)throw new Error(data.detail||'Could not trace code');
  trace=data.steps||[];index=trace.length?0:-1;
  $('output').textContent=data.output||'(No output)';$('runMessage').textContent=data.error?'Execution finished with an error':'Trace ready';
  if(data.error)$('output').textContent+='\\n'+data.error;
  if(trace.length)showStep(0);else resetView();
  lastRun={output:$('output').textContent};
 }catch(e){$('runMessage').textContent='Backend not connected';$('explanation').textContent='Start the backend with run.bat, then click Run & visualize. Details: '+e.message;}
 finally{$('runBtn').disabled=false;}
}
function showStep(i){
 if(i<0||i>=trace.length)return;index=i;const s=trace[index];
 $('stepCount').textContent=`Step ${index+1} of ${trace.length}`;
 $('prevBtn').disabled=index===0;$('nextBtn').disabled=index===trace.length-1;
 $('progressBar').style.width=((index+1)/trace.length*100)+'%';
 $('explanation').textContent=s.explanation||`Executed line ${s.line}.`;
 $('variables').innerHTML='';
 const vars=s.locals||{};
 if(!Object.keys(vars).length)$('variables').innerHTML='<div class="empty">No variables in this step.</div>';
 Object.entries(vars).forEach(([k,v])=>{const row=document.createElement('div');row.className='var-row';const n=document.createElement('span');n.className='var-name';n.textContent=k;const val=document.createElement('span');val.className='var-value';val.textContent=JSON.stringify(v);row.append(n,val);$('variables').append(row);});
 $('callstack').innerHTML='';
 (s.stack||['global scope']).slice().reverse().forEach(name=>{const d=document.createElement('div');d.className='stack-frame';d.textContent=name;$('callstack').append(d);});
}
function resetView(){trace=[];index=-1;$('stepCount').textContent='Step 0 of 0';$('prevBtn').disabled=true;$('nextBtn').disabled=true;$('progressBar').style.width='0';$('variables').innerHTML='<div class="empty">Variables will appear here.</div>';$('output').textContent='(No output yet)';$('callstack').innerHTML='<div class="stack-frame">global scope <span>main</span></div>';$('explanation').textContent='Press Run & visualize to trace your code.';}
