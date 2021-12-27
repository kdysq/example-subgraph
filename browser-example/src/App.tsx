import React, { useState, useEffect } from "react";
import { ApolloClient, InMemoryCache, gql, DocumentNode } from "@apollo/client";

import "./App.css";

const API_URL = "https://api.thegraph.com/subgraphs/name/hsiaosiyuan0/ref";

const client = new ApolloClient({
  uri: API_URL,
  cache: new InMemoryCache(),
});

function App() {
  const [ql, setQl] = useState(`
  query {
    tokens {
      id
      tokenID
      contentURI
      metadataURI
    }
  }
  `);
  const [query, setQuery] = useState<DocumentNode | null>(null);
  const [res, setRes] = useState("");

  useEffect(() => {
    if (!query) return;

    client
      .query({
        query,
      })
      .then((data) => {
        setRes(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
      });
  }, [query]);

  return (
    <div className="App">
      <textarea
        cols={30}
        rows={10}
        value={ql}
        onChange={(evt) => setQl(evt.target.value)}
      ></textarea>
      <button
        onClick={() => {
          console.log(11);
          setQuery(gql(ql));
        }}
      >
        query
      </button>
      <textarea cols={30} rows={10} value={res}></textarea>
    </div>
  );
}

export default App;
