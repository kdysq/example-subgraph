import { useRef, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-graphql";

import "prismjs/themes/prism.css";

export function JsonEditor(props) {
  const ctor = useRef();
  const editor = useRef();

  useEffect(() => {
    editor.current = new window.JSONEditor(ctor.current, {
      mode: "code",
      enableSort: false,
      enableTransform: false,
    });
  }, []);

  useEffect(() => {
    editor.current.set(props.value);
  }, [props.valueHash]);

  return <div ref={ctor} style={{ height: "500px" }}></div>;
}

export function CodeEditor(props) {
  return (
    <Editor
      highlight={(code) => highlight(code, languages.graphql)}
      padding={10}
      style={{
        height: 500,
        fontFamily: '"Fira code", "Fira Mono", monospace',
        fontSize: 12,
      }}
      {...props}
    />
  );
}
