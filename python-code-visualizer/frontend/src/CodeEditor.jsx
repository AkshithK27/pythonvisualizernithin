import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { Decoration, EditorView, lineNumbers } from '@codemirror/view';

export default function CodeEditor({ code, onChange, theme, activeLine }) {
  const executionHighlight = activeLine > 0
    ? EditorView.decorations.of((view) => {
      const lineNumber = Math.min(activeLine, view.state.doc.lines);
      const line = view.state.doc.line(lineNumber);
      return Decoration.set([
        Decoration.line({ class: 'cm-execution-line' }).range(line.from),
      ]);
    })
    : [];

  return (
    <div className="editor-resize">
      <CodeMirror
        value={code}
        height="100%"
        theme={theme}
        extensions={[python(), lineNumbers(), executionHighlight]}
        onChange={onChange}
        basicSetup={{
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          autocompletion: true,
        }}
        aria-label="Python code editor"
      />
    </div>
  );
}
