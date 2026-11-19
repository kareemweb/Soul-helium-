import { Children, Fragment, createContext, isValidElement, memo, useContext, useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

/** When true, text is split into words that fade + blur in as they arrive. */
const StreamCtx = createContext(false);

function Words({ text }: { text: string }) {
  const streaming = useContext(StreamCtx);
  if (!streaming) return <>{text}</>;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) =>
        p === "" ? null : /^\s+$/.test(p) ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <span key={i} className="word">
            {p}
          </span>
        ),
      )}
    </>
  );
}

function fx(children: ReactNode): ReactNode {
  return Children.map(children, (c) => (typeof c === "string" ? <Words text={c} /> : c));
}

const components: Components = {
  p: ({ children }) => <p>{fx(children)}</p>,
  li: ({ children }) => <li>{fx(children)}</li>,
  h1: ({ children }) => <h1>{fx(children)}</h1>,
  h2: ({ children }) => <h2>{fx(children)}</h2>,
  h3: ({ children }) => <h3>{fx(children)}</h3>,
  h4: ({ children }) => <h4>{fx(children)}</h4>,
  strong: ({ children }) => <strong>{fx(children)}</strong>,
  em: ({ children }) => <em>{fx(children)}</em>,
  th: ({ children }) => <th>{fx(children)}</th>,
  td: ({ children }) => <td>{fx(children)}</td>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {fx(children)}
    </a>
  ),
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => {
    const child = Children.toArray(children)[0];
    if (isValidElement(child)) {
      const props = child.props as { className?: string; children?: ReactNode };
      const lang = /language-([\w+#-]+)/.exec(props.className ?? "")?.[1];
      const code = String(props.children ?? "").replace(/\n$/, "");
      return <CodeBlock code={code} lang={lang} />;
    }
    return <pre>{children}</pre>;
  },
};

function Markdown({ content, streaming }: { content: string; streaming?: boolean }) {
  const plugins = useMemo(() => [remarkGfm], []);
  return (
    <div className="prose-soul">
      <StreamCtx.Provider value={!!streaming}>
        <ReactMarkdown remarkPlugins={plugins} components={components}>
          {content}
        </ReactMarkdown>
      </StreamCtx.Provider>
    </div>
  );
}

export default memo(Markdown);
