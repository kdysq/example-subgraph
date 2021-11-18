## 部署资料

[在 Graph 上部署 Subgraph](https://thegraph.com/docs/supported-networks/near#subgraph-manifest-definition)，部署前必读的官方指南

[Near Explore](https://explorer.near.org/)，用于查看区块高度

[near-receipts-example](https://github.com/graphprotocol/example-subgraph/tree/near-receipts-example)，官方的演示项目，演示了如何收集事件，但未演示如何解析参数，参数的解析可以参考 [mapping.ts#L55](/src/mapping.ts#L55)

### 调试方式

仅有的调试方式如下，如果在 dashboard 中显示 `indexing_error` 时，可以使用下面的方法查看报错内容

- 打开 [graphiql-online](https://graphiql-online.com/)
- Endpoint 输入 `https://api.thegraph.com/index-node/graphql`
- 左边查询内容中输入

  ```graphql
  {
    indexingStatuses(subgraphs: ["Qm..."]) {
      subgraph
      synced
      health
      entityCount
      fatalError {
        handler
        message
        deterministic
        block {
          hash
          number
        }
      }
      chains {
        chainHeadBlock {
          number
        }
        earliestBlock {
          number
        }
        latestBlock {
          number
        }
      }
    }
  }
  ```
- 将上面查询语句中 `Qm...` 的部分替换为部署后的 subgraph ID，在 dashboard 中可以找到
- 点击查询按钮即可看到错误内容

### Sub Account

example.near
sub.example.near

目前 Graph 上不支持同时监听 sub account 的事件，影响范围未知

### Implicit Account

Human readable account 底层依然是公私钥账号，在 near 体系中称之为 implicit account

## Ref finance

[docs.ref.finance](https://docs.ref.finance/)

[Contract on mainnet](https://explorer.near.org/accounts/ref-finance.near)

[The contract source code](https://github.com/ref-finance/ref-contracts)

合约的源码比较重要，其中的 `payable` 方法需要对应到 Graph 上的 Entity

## 一些问题

- 不支持 near testnet
- My dashboard 里面的日志一直显示「Failed to load logs, sorry about that」
