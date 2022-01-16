import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import LinearProgress from "@mui/material/LinearProgress";

import { JsonEditor, CodeEditor } from "./editor";

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
  # 列出给定用户调用的方法
  blockActs(first: 5, where: { sender: "cryptoviking.near" }) {
    id
    sender
    methodName
    timestampNanosec
  }

  # 列出给定用户添加的 Pools
  addLiquidityActs(first: 5, where: { sender: "cryptoviking.near" }) {
    id
    sender
    pool_id
    min_amounts
    timestampNanosec
  }

  # 列出给定用户移除的 Pools
  removeLiquidityActs(first: 5, where: { sender: "cryptoviking.near" }) {
    id
    sender
    pool_id
    shares
    min_amounts
    timestampNanosec
  }
}
  `);
  const [query, setQuery] = useState<DocumentNode | null>(null);
  const [res, setRes] = useState({});
  const [resHash, setResHash] = useState(new Date().getTime());
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    client
      .query({
        query,
      })
      .then((data) => {
        setRes(data.data);
        setResHash(new Date().getTime());
      })
      .catch((err) => {
        setMsg(err.message);
        setOpen(true);
        console.log("Error fetching data: ", err);
      })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="App">
      <Box
        sx={{
          display: "flex",
          p: 1,
          gap: 1,
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: 30 }} gutterBottom>
          Ref Subgraph
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          p: 1,
          gap: 1,
          justifyContent: "center",
        }}
      >
        <Card sx={{ width: "40%", p: 1 }} variant="outlined">
          <CardContent>
            {loading && <LinearProgress />}
            <CodeEditor
              value={ql}
              onValueChange={(code: string) => setQl(code)}
            />
          </CardContent>
          <CardActions sx={{ justifyContent: "center" }}>
            <Button
              size="small"
              onClick={() => {
                setQuery(gql(ql));
              }}
            >
              Query
            </Button>
          </CardActions>
        </Card>

        <Card sx={{ width: "40%", p: 1 }} variant="outlined">
          <CardContent>
            <JsonEditor value={res} valueHash={resHash} />
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={() => setOpen(false)}
        message={msg}
      />
    </div>
  );
}
export default App;
