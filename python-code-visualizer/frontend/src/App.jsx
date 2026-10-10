import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gateQuestions, gateSubjects, resourceCatalog } from './learningData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const CodeEditor = lazy(() => import('./CodeEditor'));

const examples = {
  starter: {
    label: 'Shop total',
    description: 'A simple purchase calculation in a real checkout flow.',
    code: `items = [30, 45, 25]
subtotal = sum(items)
vat = subtotal * 0.1
final_total = subtotal + vat
print(final_total)`,
  },
  loop: {
    label: 'Student marks',
    description: 'Loop over marks and calculate the average score.',
    code: `marks = [80, 90, 70, 85]
sum_marks = 0
for score in marks:
    sum_marks += score
average = sum_marks / len(marks)
print(round(average, 2))`,
  },
  function: {
    label: 'ATM withdrawal',
    description: 'A function simulates a bank withdrawal with a balance check.',
    code: `def withdraw(balance, amount):
    if amount <= balance:
        return balance - amount
    return 'Insufficient funds'

balance = 500
print(withdraw(balance, 240))`,
  },
  flow: {
    label: 'Attendance check',
    description: 'Conditional logic decides whether a class is considered attended.',
    code: `present = 17
total_classes = 20
attendance = (present / total_classes) * 100
if attendance >= 75:
    status = 'Eligible'
else:
    status = 'Warning'
print(status)`,
  },
};

const initialTrace = { status: 'idle', steps: [], output: '', final_variables: {}, error: null };

function renderValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(renderValue).join(', ')}]`;
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function createQuizFromAnalysis(analysis) {
  const concepts = analysis?.concepts || [];
  const knownLoop = analysis?.loop_details?.find((loop) => Number.isInteger(loop.iteration_count));
  if (knownLoop) {
    const count = knownLoop.iteration_count;
    const choices = [...new Set([count, count + 1, Math.max(0, count - 1), count + 2])].slice(0, 4);
    while (choices.length < 4) choices.push(count + choices.length + 1);
    return {
      topic: 'Iteration tracing',
      difficulty: count <= 5 ? 'Easy' : 'Medium',
      prompt: `How many iterations does ${knownLoop.header} execute?`,
      options: choices.map(String),
      answer: String(count),
      explanation: `The loop iterates ${count} time${count === 1 ? '' : 's'} for the statically known iterable.`,
    };
  }

  const questionByConcept = {
    recursion: { topic: 'Recursion', prompt: 'What prevents a recursive function from calling itself forever?', options: ['A base case', 'A global variable', 'A list index', 'A print statement'], answer: 'A base case', explanation: 'A base case stops further recursive calls and lets the call stack unwind.', difficulty: 'Medium' },
    conditions: { topic: 'Branching', prompt: 'When is an else block executed?', options: ['When its matching condition is false', 'Before the if condition', 'Once per function call', 'Only inside a loop'], answer: 'When its matching condition is false', explanation: 'The else branch runs when its associated if condition is false.', difficulty: 'Easy' },
    dictionaries: { topic: 'Data structures', prompt: 'Which access pattern is used to retrieve a dictionary value?', options: ['By key', 'By memory address', 'By sorting order only', 'By loop count'], answer: 'By key', explanation: 'A dictionary maps keys to values; a key is used for lookup.', difficulty: 'Easy' },
    lists: { topic: 'Arrays and lists', prompt: 'In Python, what is the index of the first element in a list?', options: ['0', '1', '-1', 'It depends on list length'], answer: '0', explanation: 'Python sequences use zero-based indexing.', difficulty: 'Easy' },
    functions: { topic: 'Functions', prompt: 'What does a return statement do in a function?', options: ['Sends a value back to the caller', 'Repeats the function', 'Creates a global variable', 'Prints automatically'], answer: 'Sends a value back to the caller', explanation: 'return ends the function call and provides a value to its caller.', difficulty: 'Easy' },
    sorting: { topic: 'Algorithm analysis', prompt: 'Which operation is the main purpose of a sorting algorithm?', options: ['Arrange items by an ordering rule', 'Remove every duplicate', 'Find one item only', 'Reverse program execution'], answer: 'Arrange items by an ordering rule', explanation: 'Sorting arranges collection elements according to an ordering relation.', difficulty: 'Easy' },
    searching: { topic: 'Searching', prompt: 'What additional precondition does binary search require?', options: ['The data is sorted', 'All values are unique', 'The data is a dictionary', 'The list has even length'], answer: 'The data is sorted', explanation: 'Binary search discards half the search interval based on ordering.', difficulty: 'Medium' },
    loops: { topic: 'Iteration', prompt: 'What is the time complexity of processing each of n items once?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 'O(n)', explanation: 'A constant amount of work per item gives linear total work.', difficulty: 'Easy' },
  };
  const concept = ['recursion', 'conditions', 'dictionaries', 'lists', 'functions', 'sorting', 'searching', 'loops'].find((item) => concepts.includes(item));
  if (concept) return questionByConcept[concept];
  return {
    topic: 'Python concepts', difficulty: 'Easy',
    prompt: concepts.length ? `Which concept is detected in this code: ${concepts[0]}?` : 'Add Python code to receive a concept-specific question.',
    options: concepts.length ? [concepts[0], 'network access', 'file deletion', 'package installation'] : ['Variables', 'Loops', 'Functions', 'Conditions'],
    answer: concepts.length ? concepts[0] : 'Variables',
    explanation: concepts.length ? `Python AST analysis detected ${concepts[0]} in the submitted code.` : 'The question updates as code concepts are analyzed.',
  };
}

function renderDiagramNodes(nodes = [], currentLine, onSelectLine, prefix = 'node') {
  return nodes.map((node, index) => {
    const active = currentLine >= node.line && currentLine <= (node.end_line || node.line);
    return (
      <div className={`diagram-node-wrap ${active ? 'is-active' : ''}`} key={`${prefix}-${node.line}-${index}`}>
        <button className={`diagram-node kind-${node.kind}`} onClick={() => onSelectLine(node.line)}>
          <span className="diagram-kind">{node.kind}</span>
          <code>{node.label}</code>
          <small>line {node.line}{node.recursive ? ' · recursive' : ''}</small>
          {node.phases && <span className="diagram-phases">{node.phases.join(' → ')}</span>}
        </button>
        {node.branches && (
          <div className="diagram-branches">
            {node.branches.map((branch) => {
              const branchIsActive = branch.nodes.some((branchNode) => currentLine >= branchNode.line && currentLine <= (branchNode.end_line || branchNode.line));
              return (
              <div className={`diagram-branch ${branchIsActive ? 'branch-active' : ''}`} key={`${node.line}-${branch.label}`}>
                <strong>{branch.label}</strong>
                {branch.nodes.length ? renderDiagramNodes(branch.nodes, currentLine, onSelectLine, `${prefix}-${branch.label}`) : <span className="empty-state">No statements</span>}
              </div>
              );
            })}
          </div>
        )}
        {node.children?.length > 0 && (
          <div className="diagram-children">
            {renderDiagramNodes(node.children, currentLine, onSelectLine, `${prefix}-child`)}
          </div>
        )}
      </div>
    );
  });
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem('python-visualizer-theme');
    return ['light', 'dark'].includes(savedTheme) ? savedTheme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [selectedExample, setSelectedExample] = useState('starter');
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [code, setCode] = useState(examples.starter.code);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [traceResult, setTraceResult] = useState(initialTrace);
  const [currentStep, setCurrentStep] = useState(-1);
  const [status, setStatus] = useState('Ready to run');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(600);
  const [timeoutSeconds, setTimeoutSeconds] = useState(5);
  const [comparison, setComparison] = useState('Run two versions to compare step-by-step behavior.');
  const [compareLeft, setCompareLeft] = useState(examples.starter.code);
  const [compareRight, setCompareRight] = useState('total = 7\nprint(total)');
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [adaptiveScore, setAdaptiveScore] = useState(() => Number(window.localStorage.getItem('python-visualizer-adaptive-score') || 0));
  const [adaptiveAttempts, setAdaptiveAttempts] = useState(() => Number(window.localStorage.getItem('python-visualizer-adaptive-attempts') || 0));
  const [gateSubject, setGateSubject] = useState(gateSubjects[0]);
  const [gateDifficulty, setGateDifficulty] = useState('All');
  const [gateQuestionIndex, setGateQuestionIndex] = useState(0);
  const [gateAnswer, setGateAnswer] = useState(null);
  const [gateScore, setGateScore] = useState(() => Number(window.localStorage.getItem('python-visualizer-gate-score') || 0));
  const [gateAttempts, setGateAttempts] = useState(() => Number(window.localStorage.getItem('python-visualizer-gate-attempts') || 0));
  const timerRef = useRef(null);
  const analysisTimerRef = useRef(null);

  const quiz = analysis ? createQuizFromAnalysis(analysis) : {
    topic: 'Code analysis',
    difficulty: 'Pending',
    prompt: analysisError || (isAnalyzing ? 'Analyzing the submitted code for a relevant question…' : 'Waiting for valid code analysis.'),
    options: [],
    answer: null,
    explanation: '',
  };
  const gateQuestionPool = gateQuestions[gateSubject] || [];
  const filteredGateQuestions = gateDifficulty === 'All'
    ? gateQuestionPool
    : gateQuestionPool.filter((question) => question.difficulty === gateDifficulty);
  const gateQuestion = filteredGateQuestions[gateQuestionIndex % Math.max(filteredGateQuestions.length, 1)] || gateQuestionPool[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!isPlaying || !traceResult.steps.length) return undefined;
    timerRef.current = setInterval(() => {
      setCurrentStep((previous) => {
        if (previous >= traceResult.steps.length - 1) {
          setIsPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, playSpeed);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, playSpeed, traceResult.steps.length]);

  useEffect(() => {
    clearTimeout(analysisTimerRef.current);
    setQuizAnswer(null);
    setAnalysis(null);
    if (!code.trim()) {
      setAnalysis(null);
      setAnalysisError('Enter Python code to analyze concepts and build its diagram.');
      setIsAnalyzing(false);
      return undefined;
    }

    const controller = new AbortController();
    analysisTimerRef.current = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const response = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Could not analyze this code.');
        setAnalysis(data);
        setAnalysisError('');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setAnalysis(null);
          setAnalysisError(error.message || 'Analysis service is unavailable.');
        }
      } finally {
        if (!controller.signal.aborted) setIsAnalyzing(false);
      }
    }, 300);

    return () => {
      clearTimeout(analysisTimerRef.current);
      controller.abort();
    };
  }, [code]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(analysisTimerRef.current);
    };
  }, []);

  const activeStep = currentStep >= 0 && traceResult.steps.length > 0 ? traceResult.steps[currentStep] : null;
  const allCurrentVariables = activeStep ? { ...activeStep.globals, ...activeStep.locals } : traceResult.final_variables;
  const variablesToDisplay = Object.fromEntries(Object.entries(allCurrentVariables || {}).filter(([name]) => !analysis?.variables || analysis.variables.includes(name)));
  const stepCountLabel = traceResult.steps.length ? `Step ${currentStep + 1} of ${traceResult.steps.length}` : 'Step 0 of 0';
  const currentLine = activeStep?.line || 0;
  const learningResources = [...new Set((analysis?.concepts || []).flatMap((concept) => resourceCatalog[concept] || []))];

  const stopPlayback = () => {
    setIsPlaying(false);
    clearInterval(timerRef.current);
  };

  const handleExampleChange = (event) => {
    const key = event.target.value;
    setSelectedExample(key);
    setIsCustomCode(false);
    setAnalysisError('');
    setCode(examples[key].code);
    setStatus('Example loaded');
    stopPlayback();
    setCurrentStep(-1);
    setTraceResult(initialTrace);
  };

  const handleCodeChange = (value) => {
    setCode(value);
    setAnalysis(null);
    setAnalysisError('');
    setIsCustomCode(value !== examples[selectedExample].code);
    setTraceResult(initialTrace);
    setCurrentStep(-1);
    setStatus('Code changed · analysis updating');
    stopPlayback();
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem('python-visualizer-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleRun = async () => {
    if (!code.trim()) {
      setStatus('Enter Python code before running.');
      setTraceResult({ ...initialTrace, error: 'Code cannot be empty.' });
      return;
    }
    stopPlayback();
    setStatus('Running code…');
    try {
      const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, timeout_seconds: timeoutSeconds }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Execution failed');
      }

      setTraceResult(data);
      const hasSteps = Array.isArray(data.steps) && data.steps.length > 0;
      setCurrentStep(hasSteps ? 0 : -1);
      setStatus(data.error ? 'Execution finished with an error' : 'Execution complete');
    } catch (error) {
      setStatus(error.message || 'Execution service is unavailable.');
      setTraceResult({ ...initialTrace, error: error.message || 'Execution service is unavailable.' });
      setCurrentStep(-1);
    }
  };

  const moveStep = (direction) => {
    if (!traceResult.steps.length) return;
    setCurrentStep((prev) => {
      const next = prev + direction;
      if (next < 0 || next >= traceResult.steps.length) return prev;
      return next;
    });
  };

  const handlePlay = () => {
    if (!traceResult.steps.length) return;
    setIsPlaying(true);
  };

  const handlePause = () => {
    stopPlayback();
  };

  const handleReset = () => {
    stopPlayback();
    setCurrentStep(-1);
    setTraceResult(initialTrace);
    setStatus('Ready to run');
  };

  const handleRestart = () => {
    stopPlayback();
    if (traceResult.steps.length) {
      setCurrentStep(0);
      setStatus('Execution restarted at step 1.');
    } else {
      handleRun();
    }
  };

  const handleCompare = async () => {
    try {
      const response = await fetch(`${API_BASE}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left_code: compareLeft, right_code: compareRight, timeout_seconds: timeoutSeconds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Comparison failed');
      const summary = data.summary || {};
      setComparison(
        `Left output:\n${summary.left_output || 'No output'}\n\nRight output:\n${summary.right_output || 'No output'}\n\nEqual output: ${String(summary.equal_output)}\nEqual final variables: ${String(summary.equal_final_variables)}`
      );
    } catch (error) {
      setComparison(error.message);
    }
  };

  const handleQuizClick = (option) => {
    if (quizAnswer) return;
    setQuizAnswer(option);
    const nextAttempts = adaptiveAttempts + 1;
    const nextScore = adaptiveScore + (option === quiz.answer ? 1 : 0);
    setAdaptiveAttempts(nextAttempts);
    setAdaptiveScore(nextScore);
    window.localStorage.setItem('python-visualizer-adaptive-attempts', String(nextAttempts));
    window.localStorage.setItem('python-visualizer-adaptive-score', String(nextScore));
  };

  const handleGateAnswer = (option) => {
    if (gateAnswer || !gateQuestion) return;
    setGateAnswer(option);
    const nextAttempts = gateAttempts + 1;
    const nextScore = gateScore + (option === gateQuestion.answer ? 1 : 0);
    setGateAttempts(nextAttempts);
    setGateScore(nextScore);
    window.localStorage.setItem('python-visualizer-gate-attempts', String(nextAttempts));
    window.localStorage.setItem('python-visualizer-gate-score', String(nextScore));
  };

  const changeGateSubject = (event) => {
    setGateSubject(event.target.value);
    setGateQuestionIndex(0);
    setGateAnswer(null);
  };

  const changeGateDifficulty = (event) => {
    setGateDifficulty(event.target.value);
    setGateQuestionIndex(0);
    setGateAnswer(null);
  };

  const nextGateQuestion = () => {
    setGateQuestionIndex((index) => index + 1);
    setGateAnswer(null);
  };

  const selectDiagramLine = (line) => {
    const index = traceResult.steps.findIndex((step) => step.line === line);
    if (index >= 0) setCurrentStep(index);
    else setStatus(`Diagram node maps to source line ${line}; run the code to inspect its trace.`);
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">Py</div>
          <div>
            <h1>Python Code Visualizer</h1>
            <p>Learn by watching execution flow</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="language-badge">Python 3</span>
          <details className="settings-menu">
            <summary>Settings</summary>
            <label>Execution timeout
              <select value={timeoutSeconds} onChange={(event) => setTimeoutSeconds(Number(event.target.value))}>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={20}>20 seconds</option>
              </select>
            </label>
          </details>
          <button className="theme-toggle" onClick={handleThemeToggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="editor-panel panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="dot dot-purple" />
              <strong>Code editor</strong>
            </div>
            <select value={isCustomCode ? 'custom' : selectedExample} onChange={handleExampleChange}>
              {isCustomCode && <option value="custom" disabled>Custom code</option>}
              {Object.entries(examples).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          {!isCustomCode && <div className="example-description">
            <strong>{examples[selectedExample].label}</strong>
            <span>{examples[selectedExample].description}</span>
          </div>}

          <Suspense fallback={<div className="editor-loading">Loading Python editor…</div>}>
            <CodeEditor code={code} onChange={handleCodeChange} theme={theme} activeLine={currentLine} />
          </Suspense>

          <div className="analysis-status" aria-live="polite">
            <span className={isAnalyzing ? 'status-pulse' : ''}>{isAnalyzing ? 'Analyzing code…' : analysisError || (analysis ? `${analysis.concepts.length} concepts detected` : 'Waiting for analysis…')}</span>
            {analysis?.concepts?.map((concept) => <span className="concept-chip" key={concept}>{concept}</span>)}
          </div>
          {analysis?.unsupported_constructs?.map((warning) => <div className="policy-warning" key={warning}>{warning} Static analysis is available; execution remains restricted.</div>)}

          <div className="toolbar">
            <button className="primary" onClick={handleRun}>Run &amp; Visualize</button>
            <button className="secondary" onClick={handleReset}>Reset</button>
            <span className="status-pill">{status}</span>
          </div>

          <div className="step-toolbar">
            <button onClick={() => moveStep(-1)} disabled={currentStep <= 0 || !traceResult.steps.length}>Previous</button>
            <button onClick={() => moveStep(1)} disabled={currentStep >= traceResult.steps.length - 1 || !traceResult.steps.length}>Next</button>
            <button onClick={handlePlay} disabled={!traceResult.steps.length || isPlaying}>Play</button>
            <button onClick={handlePause} disabled={!isPlaying}>Pause</button>
            <button onClick={handleRestart}>{traceResult.steps.length ? 'Restart trace' : 'Run from start'}</button>
            <label className="speed-control">Speed
              <select value={playSpeed} onChange={(event) => setPlaySpeed(Number(event.target.value))}>
                <option value={1200}>0.5×</option>
                <option value={600}>1×</option>
                <option value={300}>2×</option>
                <option value={120}>5×</option>
              </select>
            </label>
          </div>

          <div className="status-line">
            <span>{stepCountLabel}</span>
            <span>{currentLine ? `Current line ${currentLine}` : 'No active line'}</span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: traceResult.steps.length ? `${((currentStep + 1) / traceResult.steps.length) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="explanation-box">
            <h3>Execution explanation</h3>
            <p>
              {activeStep ? activeStep.explanation : 'Press Run & Visualize to trace how the code is executed step by step.'}
            </p>
            {activeStep?.event_type === 'return' && <div className="return-value">Return value <code>{renderValue(activeStep.return_value)}</code></div>}
          </div>
        </section>

        <aside className="side-panel">
          <div className="panel diagram-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="dot dot-green" />
                <strong>Variable inspector</strong>
              </div>
            </div>

            <div className="variable-list">
              {Object.keys(variablesToDisplay || {}).length ? (
                Object.entries(variablesToDisplay).map(([key, value]) => (
                  <div key={key} className={`variable-item ${activeStep?.changed_variables?.some((item) => item.name === key) ? 'variable-changed' : ''}`}>
                    <span className="variable-key">{key}</span>
                    <span className="variable-value">{renderValue(value)}</span>
                    <span className="variable-type">{activeStep?.variable_types?.[key] || (value === null ? 'NoneType' : Array.isArray(value) ? 'list' : typeof value === 'object' ? 'dict' : typeof value)}</span>
                    {activeStep?.changed_variables?.some((item) => item.name === key) && (
                      <small className="change-note">Changed after line {activeStep.previous_line ?? activeStep.line} · {renderValue(activeStep.changed_variables.find((item) => item.name === key).before)} → {renderValue(value)}</small>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">No variables in the current step.</div>
              )}
            </div>
            <div className="memory-map">
              {Object.entries(variablesToDisplay || {}).flatMap(([name, value]) => {
                if (Array.isArray(value)) {
                  return [(
                    <div className="memory-collection" key={`${name}-list`}>
                      <strong>{name} <span>list memory</span></strong>
                      <div className="memory-cells">
                        {value.map((item, index) => <div className="memory-cell" key={`${name}-${index}`}><small>[{index}]</small><code>{renderValue(item)}</code></div>)}
                      </div>
                    </div>
                  )];
                }
                if ((activeStep?.variable_types?.[name] === 'dict' || value && typeof value === 'object' && !Array.isArray(value)) && value && typeof value === 'object') {
                  return [(
                    <div className="memory-collection" key={`${name}-dict`}>
                      <strong>{name} <span>dictionary memory</span></strong>
                      <div className="memory-cells">
                        {Object.entries(value).map(([key, item]) => <div className="memory-cell" key={`${name}-${key}`}><small>{key}</small><code>{renderValue(item)}</code></div>)}
                      </div>
                    </div>
                  )];
                }
                return [];
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="dot dot-blue" />
                <strong>Program output</strong>
              </div>
            </div>
            <pre className="console-output">{traceResult.output || 'No output yet.'}</pre>
            {traceResult.error && <div className="error-panel"><strong>Execution error</strong><span>{traceResult.error}</span></div>}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="dot dot-orange" />
                <strong>Call stack</strong>
              </div>
            </div>
            <div className="stack-list">
              {activeStep && activeStep.stack ? (
                activeStep.stack.map((frame, index) => (
                  <div key={`${frame}-${index}`} className="stack-frame">{frame}</div>
                ))
              ) : (
                <div className="empty-state">Global scope</div>
              )}
            </div>
          </div>
        </aside>
      </main>

      <section className="learning-grid">
        <div className="panel visual-diagram-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Live AST map</span>
              <h2>Visual diagram</h2>
            </div>
            <span className="chip">{currentLine ? `Line ${currentLine} active` : 'Waiting for trace'}</span>
          </div>
          {analysisError ? (
            <div className="empty-state error-copy">{analysisError}</div>
          ) : analysis?.diagram?.length ? (
            <div className="diagram-flow">
              {renderDiagramNodes(analysis.diagram, currentLine, selectDiagramLine)}
            </div>
          ) : (
            <div className="empty-state">Enter valid Python code to build its control-flow diagram.</div>
          )}
        </div>

        <div className="panel real-world-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">AST-matched context</span>
              <h2>Real-world application</h2>
            </div>
          </div>
          {analysis?.real_world_examples?.length ? (
            <div className="scenario-list">
              {analysis.real_world_examples.map((scenario) => (
                <article className="scenario-item" key={scenario.concept}>
                  <div className="scenario-title-row">
                    <h3>{scenario.title}</h3>
                    <span className="concept-chip">{scenario.concept}</span>
                  </div>
                  <p>{scenario.mapping}</p>
                  <dl className="scenario-details">
                    <div><dt>Code variables</dt><dd>{scenario.variables.length ? scenario.variables.join(', ') : 'None detected'}</dd></div>
                    <div><dt>Input / state</dt><dd>{scenario.variables.map((name) => `${name}${Object.hasOwn(variablesToDisplay, name) ? ` = ${renderValue(variablesToDisplay[name])}` : ''}`).join(' · ') || 'Run code to inspect its actual state.'}</dd></div>
                    <div><dt>Execution</dt><dd>Follow the active line; the trace records actual assignments, branches, and calls.</dd></div>
                    <div><dt>Actual output</dt><dd>{traceResult.output ? traceResult.output.trim() : 'Run this code to see its real output.'}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">A scenario appears when the analyzer detects a supported Python concept.</div>
          )}
        </div>

        <div className="panel resources-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Based on detected concepts</span>
              <h2>Learn more</h2>
            </div>
          </div>
          {learningResources.length ? (
            <div className="resource-list">
              {learningResources.map((resource) => (
                <a className="resource-link" href={resource.url} target="_blank" rel="noreferrer" key={`${resource.title}-${resource.url}`}>
                  <span><strong>{resource.title}</strong><small>{resource.reason}</small></span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-state">Edit code to receive topic-specific links. General tutorials: <a href="https://www.w3schools.com/python/" target="_blank" rel="noreferrer">W3Schools Python</a> · <a href="https://www.geeksforgeeks.org/python/python-programming-language-tutorial/" target="_blank" rel="noreferrer">GeeksforGeeks Python</a>.</div>
          )}
        </div>

        <div className="panel adaptive-quiz-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Changes with analyzed code</span>
              <h2>Concept practice</h2>
            </div>
            <span className="chip">{adaptiveScore} / {adaptiveAttempts} correct</span>
          </div>
          <div className="quiz-meta"><span>{quiz.topic}</span><span>{quiz.difficulty}</span><span>Original practice</span></div>
          <p className="quiz-question">{quiz.prompt}</p>
          <div className="quiz-options">
            {quiz.options.map((option) => {
              const isCorrect = option === quiz.answer;
              const isSelected = quizAnswer === option;
              const className = ['quiz-option', isSelected && 'selected', quizAnswer && isCorrect && 'correct', quizAnswer && isSelected && !isCorrect && 'wrong'].filter(Boolean).join(' ');
              return <button key={option} className={className} onClick={() => handleQuizClick(option)} disabled={Boolean(quizAnswer)}>{option}</button>;
            })}
          </div>
          {quizAnswer && <div className={`quiz-feedback ${quizAnswer === quiz.answer ? 'success' : 'error'}`}>{quizAnswer === quiz.answer ? 'Correct. ' : 'Review. '}{quiz.explanation}</div>}
          <button className="secondary retry-button" onClick={() => setQuizAnswer(null)} disabled={!analysis}>Try again</button>
        </div>
      </section>

      <section className="panel gate-panel">
        <div className="panel-header gate-header">
          <div>
            <span className="section-kicker">Independent subject practice</span>
            <h2>GATE CS preparation</h2>
            <p>Original practice questions for GATE CS topics; these are not verified previous-year questions.</p>
          </div>
          <div className="gate-score"><strong>{gateScore}</strong><span>correct / {gateAttempts} attempted</span></div>
        </div>
        <div className="gate-controls">
          <label>Subject<select value={gateSubject} onChange={changeGateSubject}>{gateSubjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label>Difficulty<select value={gateDifficulty} onChange={changeGateDifficulty}><option>All</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
        </div>
        {gateQuestion && (
          <div className="gate-question-block">
            <div className="quiz-meta"><span>{gateQuestion.kind}</span><span>{gateQuestion.difficulty}</span><span>Original practice · not an official PYQ</span><span>Question {(gateQuestionIndex % Math.max(filteredGateQuestions.length, 1)) + 1} of {filteredGateQuestions.length || gateQuestionPool.length}</span></div>
            <p className="quiz-question">{gateQuestion.question}</p>
            <div className="quiz-options">
              {gateQuestion.options.map((option) => {
                const correct = option === gateQuestion.answer;
                const selected = gateAnswer === option;
                const className = ['quiz-option', selected && 'selected', gateAnswer && correct && 'correct', gateAnswer && selected && !correct && 'wrong'].filter(Boolean).join(' ');
                return <button key={option} className={className} onClick={() => handleGateAnswer(option)} disabled={Boolean(gateAnswer)}>{option}</button>;
              })}
            </div>
            {gateAnswer && <div className={`quiz-feedback ${gateAnswer === gateQuestion.answer ? 'success' : 'error'}`}>{gateAnswer === gateQuestion.answer ? 'Correct. ' : 'Not quite. '}{gateQuestion.explanation}</div>}
            <div className="gate-actions"><button className="secondary" onClick={() => setGateAnswer(null)}>Try again</button><button className="primary" onClick={nextGateQuestion}>Next question</button></div>
          </div>
        )}
      </section>

      <section className="bottom-row">
        <div className="panel compare-panel">
          <div className="panel-header">
            <strong>What-if simulation</strong>
            <span className="chip">compare versions</span>
          </div>

          <div className="compare-grid">
            <textarea value={compareLeft} onChange={(event) => setCompareLeft(event.target.value)} rows={8} />
            <textarea value={compareRight} onChange={(event) => setCompareRight(event.target.value)} rows={8} />
          </div>

          <button className="secondary" onClick={handleCompare}>Compare programs</button>
          <pre className="comparison-output">{comparison}</pre>
        </div>
      </section>
    </div>
  );
}

export default App;
