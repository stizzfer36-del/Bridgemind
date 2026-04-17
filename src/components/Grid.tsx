import { useDrag, useDrop } from "react-dnd";
import { useWorkspace, TEMPLATE_GRID, type GridTemplate } from "../state/workspace";
import TerminalPane from "./TerminalPane";
import EditorPane from "./EditorPane";

const TEMPLATE_ORDER: GridTemplate[] = [
  "single",
  "split",
  "stack",
  "quad",
  "six",
  "eight",
  "ten",
  "twelve",
  "fourteen",
  "sixteen",
];

export default function Grid() {
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tab = useWorkspace((s) => s.tabs.find((t) => t.id === activeTabId));
  const setTemplate = useWorkspace((s) => s.setTemplate);

  if (!tab) {
    return (
      <div className="grid empty">
        <pre>{BRIDGESPACE_ASCII}</pre>
        <p>bridgespace .</p>
      </div>
    );
  }

  const { cols, rows } = TEMPLATE_GRID[tab.template];

  return (
    <div className="grid-wrap">
      <div className="grid-toolbar">
        <label>Layout:</label>
        <select
          value={tab.template}
          onChange={(e) => setTemplate(tab.id, e.target.value as GridTemplate)}
        >
          {TEMPLATE_ORDER.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {tab.panes.map((pane, index) => (
          <Cell key={pane.id} index={index} tabId={tab.id}>
            {pane.kind === "terminal" ? (
              <TerminalPane paneId={pane.id} cwd={pane.cwd} />
            ) : (
              <EditorPane paneId={pane.id} filePath={pane.filePath} />
            )}
          </Cell>
        ))}
      </div>
    </div>
  );
}

function Cell(props: { index: number; tabId: string; children: React.ReactNode }) {
  const swap = useWorkspace((s) => s.swapPanes);
  const [, drag] = useDrag(() => ({
    type: "pane",
    item: { index: props.index },
  }));
  const [, drop] = useDrop(() => ({
    accept: "pane",
    drop: (item: { index: number }) => {
      if (item.index !== props.index) swap(props.tabId, item.index, props.index);
    },
  }));
  return (
    <div
      className="cell"
      ref={(el) => {
        drag(drop(el));
      }}
    >
      {props.children}
    </div>
  );
}

const BRIDGESPACE_ASCII = `
 ____       _     _              ____
| __ ) _ __(_) __| | __ _  ___  / ___| _ __   __ _  ___ ___
|  _ \\| '__| |/ _\` |/ _\` |/ _ \\ \\___ \\| '_ \\ / _\` |/ __/ _ \\
| |_) | |  | | (_| | (_| |  __/  ___) | |_) | (_| | (_|  __/
|____/|_|  |_|\\__,_|\\__, |\\___| |____/| .__/ \\__,_|\\___\\___|
                    |___/             |_|
`;
