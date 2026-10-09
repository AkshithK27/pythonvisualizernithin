import { useEffect, useRef, useState } from 'react';

const examples = {
  starter: {
    label: 'Shop total',
    description: 'A simple purchase calculation in a real checkout flow.',
    code: `items = [30, 45, 25]
subtotal = sum(items)
vat = subtotal * 0.1
final_total = subtotal + vat
print(final_total)`,
    quiz: {
      prompt: 'What does the program print?',
      options: ['110.0', '90', '100', '100.0'],
      answer: '110.0',
      explanation: 'The subtotal is 100, VAT is 10, and the final total is 110.0.'
    }
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
    quiz: {
      prompt: 'What is the average of the marks?',
      options: ['80.25', '81.25', '85.00', '90.00'],
      answer: '81.25',
      explanation: 'The sum is 325 and 325 / 4 equals 81.25.'
    }
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
    quiz: {
      prompt: 'What is printed after withdrawal?',
      options: ['260', 'Insufficient funds', '500', '240'],
      answer: '260',
      explanation: 'The result is 500 - 240 = 260 because the withdrawal is valid.'
    }
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
    quiz: {
      prompt: 'What status is printed?',
      options: ['Eligible', 'Warning', 'Pass', 'Fail'],
      answer: 'Eligible',
      explanation: '17 out of 20 is 85%, which is above the 75% threshold.'
    }
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

function createQuizFromCode(code, exampleKey) {
  if (exampleKey && examples[exampleKey]?.quiz) {
    return examples[exampleKey].quiz;
  }

  if (code.includes('if')) {
    return {
      prompt: 'Which branch is likely chosen?',
      options: ['if branch', 'else branch', 'loop branch', 'function branch'],
      answer: 'if branch',
      explanation: 'The condition is evaluated before the branch runs.'
    };
  }

  if (code.includes('for')) {
    return {
      prompt: 'What changes during the loop?',
      options: ['The result keeps accumulating', 'Nothing changes', 'The program stops immediately', 'A function is skipped'],
      answer: 'The result keeps accumulating',
      explanation: 'Each loop iteration updates the tracked value.'
    };
  }

  return {
    prompt: 'What is the expected program outcome?',
    options: ['The code executes normally', 'The code crashes', 'The loop never runs', 'No output is displayed'],
    answer: 'The code executes normally',
    explanation: 'The program should run and produce output in a normal flow.'
  };
}

function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedExample, setSelectedExample] = useState('starter');
  const [code, setCode] = useState(examples.starter.code);
  const [traceResult, setTraceResult] = useState(initialTrace);
  const [currentStep, setCurrentStep] = useState(-1);
  const [status, setStatus] = useState('Ready to run');
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparison, setComparison] = useState('Run two versions to compare step-by-step behavior.');
  const [compareLeft, setCompareLeft] = useState(examples.starter.code);
  const [compareRight, setCompareRight] = useState('total = 7\nprint(total)');
  const [quiz, setQuiz] = useState(examples.starter.quiz);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const nextQuiz = createQuizFromCode(code, selectedExample);
    setQuiz(nextQuiz);
    setQuizAnswer(null);
  }, [code, selectedExample]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const activeStep = currentStep >= 0 && traceResult.steps.length > 0 ? traceResult.steps[currentStep] : null;
  const variablesToDisplay = activeStep ? { ...activeStep.locals, ...activeStep.globals } : traceResult.final_variables;
  const stepCountLabel = traceResult.steps.length ? `Step ${currentStep + 1} of ${traceResult.steps.length}` : 'Step 0 of 0';

  const stopPlayback = () => {
    setIsPlaying(false);
    clearInterval(timerRef.current);
  };

  const handleExampleChange = (event) => {
    const key = event.target.value;
    setSelectedExample(key);
    setCode(examples[key].code);
    setStatus('Example loaded');
    stopPlayback();
    setCurrentStep(-1);
    setTraceResult(initialTrace);
  };

  const handleRun = async () => {
    stopPlayback();
    setStatus('Running code…');
    try {
      const response = await fetch('http://127.0.0.1:8000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, timeout_seconds: 5 }),
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
      setStatus(error.message);
      setTraceResult({ ...initialTrace, error: error.message });
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
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= traceResult.steps.length - 1) {
          clearInterval(timerRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
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

  const handleCompare = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left_code: compareLeft, right_code: compareRight, timeout_seconds: 5 }),
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
    setQuizAnswer(option);
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
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
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
            <select value={selectedExample} onChange={handleExampleChange}>
              {Object.entries(examples).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          <div className="example-description">
            <strong>{examples[selectedExample].label}</strong>
            <span>{examples[selectedExample].description}</span>
          </div>

          <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />

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
          </div>

          <div className="status-line">
            <span>{stepCountLabel}</span>
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
          </div>
        </section>

        <aside className="side-panel">
          <div className="panel diagram-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="dot dot-green" />
                <strong>Memory & flow</strong>
              </div>
            </div>

            <div className="flow-diagram">
              <div className="flow-node main-node">
                <span>Code</span>
                <small>{activeStep ? `line ${activeStep.line}` : 'ready'}</small>
              </div>

              <div className="flow-connector" />

              <div className="flow-node state-node">
                <span>Variables</span>
                <small>{Object.keys(variablesToDisplay || {}).length} active</small>
              </div>

              <div className="flow-connector" />

              <div className="flow-node result-node">
                <span>Output</span>
                <small>{traceResult.output ? 'ready' : 'waiting'}</small>
              </div>
            </div>

            <div className="variable-list">
              {Object.keys(variablesToDisplay || {}).length ? (
                Object.entries(variablesToDisplay).map(([key, value]) => (
                  <div key={key} className="variable-item">
                    <span className="variable-key">{key}</span>
                    <span className="variable-value">{renderValue(value)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No variables in the current step.</div>
              )}
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

      <section className="bottom-row">
        <div className="panel quiz-panel">
          <div className="panel-header">
            <strong>Predict the output</strong>
            <span className="chip">live quiz</span>
          </div>

          <p className="quiz-question">{quiz.prompt}</p>
          <div className="quiz-options">
            {quiz.options.map((option) => {
              const isCorrect = option === quiz.answer;
              const isSelected = quizAnswer === option;
              const className = [
                'quiz-option',
                isSelected && 'selected',
                quizAnswer && isCorrect && 'correct',
                quizAnswer && isSelected && !isCorrect && 'wrong',
              ].filter(Boolean).join(' ');

              return (
                <button key={option} className={className} onClick={() => handleQuizClick(option)}>
                  {option}
                </button>
              );
            })}
          </div>

          {quizAnswer && (
            <div className={`quiz-feedback ${quizAnswer === quiz.answer ? 'success' : 'error'}`}>
              {quizAnswer === quiz.answer ? 'Correct! ' + quiz.explanation : 'Not quite. ' + quiz.explanation}
            </div>
          )}
        </div>

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
