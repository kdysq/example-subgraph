## TheGraph 介绍

假设有一个合约 A 的具备简单的记账功能，对应两个合约方法：

- income，记录收入的方法
- expense，记录支出的方法

合约上已经具备的功能是：

- 用户可以调用 income 方法，传入 amount，表示一次记录的动作
- 针对每次记录收入的动作，合约可以发出 income 事件，订阅该事件的外部应用 B 会接收到通知，从而进行各自细分的工作

合约上不具备（不方便）的功能是：

- 查询以往的操作记录

TheGraph 就是为了解决链上数据查询难的问题，它的位置就类似上述过程中的应用 B：

1. 它作为外部应用，订阅所有合约上的事件
2. 接收合约的事件通知，并将通知的内容进行一些自定义的转换后记录
3. 记录的方式可以理解成，每个事件对应一张表，并不一定是物理表，但是对外呈现出数据库表的形式
4. 对外提供基于 GraphQL 的查询接口，用于组合查询表中的数据

TheGraph 是相对合约而言的外部应用，这样和合约一对一的外部应用，在 TheGraph 中称之为 Subgraph

合约上的时间数据通常需要经过一些转换后再存储。因为从事件发送方的角度，可能的消费方不光是 Subgraph。转换的内容通过 `mapping.ts` 自定自定义，下文会介绍

上面的 4 步内容，需要我们参与的是 2 部分：

- 实现 Subgraph
- 在 `mapping.ts` 编写我们需要的转换

## 实现 Subgraph

我们不必从零实现 Subgraph，可以从 Clone 一个演示项目开始：

```
git clone https://github.com/graphprotocol/example-subgraph.git
```

切换到 `near-receipts-example` 分支

运行 `yarn` 安装依赖

## subgraph.yaml

我们的 Subgraph 将以托管的方式运行，所以需要 `subgraph.yaml` 对 Subgraph 的规格进行描述和说明，方便 TheGraph 帮我们运行服务

```yaml
specVersion: 0.0.4
description: Good Morning NEAR
repository: https://github.com/graphprotocol/example-subgraph/tree/near-receipts-example
schema:
  file: ./schema.graphql # 定义 GraphQL 的数据结构
dataSources:
  - kind: near
    name: receipts
    network: near-mainnet # 1. 当前尚不支持 near 的测试网络
    source:
      account: "app.good-morning.near" # 2. 替换为 ref-finance.near
      startBlock: 50736511 # 3. 其实区块高度，替换为 32010735
    mapping:
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      file: ./src/mapping.ts
      entities: # 4. 增加我们自己的实体，类似数据库表
        - BlockEvent
        - BlockAction
        - WithdrawAction
      blockHandlers: # 5. 接收区块事件
        - handler: handleBlock # 对应 `./src/mapping.ts` 中的方法名
      receiptHandlers: # 6. 接收合约事件
        - handler: handleReceipt # 对应 `./src/mapping.ts` 中的方法名
```

需要做的更改已经通过注释进行了标记和解释

## schema.graphql

上面我们在 `subgraph.yaml` 中列举了我们的实体，接下来我们需要给出实体的定义，实体的定义是写在 `schema.graphql` 中的：

```graphql
type BlockEvent @entity {
  id: ID!
  account: String!
  number: BigInt
  hash: Bytes
  timestampNanosec: BigInt
  gasPrice: BigInt
}

type BlockAction @entity {
  id: ID!
  methodName: String!
}

type WithdrawAction @entity {
  id: ID!
  account: String!
  amount: BigInt!
}

type UserWithdraw @entity {
  id: ID!
  accumulated: BigInt!
}
```

这里和定义数据库的表没有实质的差别，需要注意的是字段的类型，未来在 `mapping.ts` 中需要将数据处理为正确的类型

`!` 表示该字段一定有非空值，更多支持的类型可以参考 [graphql-supported-scalars](https://thegraph.com/docs/developer/create-subgraph-hosted#graphql-supported-scalars)

## yarn codegen

下面会介绍的 `mapping.ts` 文件中包含了接收合约事件，并转换成上面定义的实体所需的数据结构

如何让 `mapping.ts` 能够感知到上面实体定义的数据结构呢？

答案就是根据上面定义的实体信息，生成对应的 TypeScript 代码，这样不论是 JavaScript Runtime 还是 TypeScript 类型系统都可以感知实体的内容了

运行 `yarn codegen` 就可以进行代码的生成

**未来如果对 schema.graphql 的定义有变更，都需要运行 `yarn codegen`**

## mapping.ts

`schema.graphql` 中是我们定义的实体，它的内容是跟随我们对数据的需求而定的，因此会和合约事件携带的时间有所差异。通过在 `mapping.ts` 中编写对数据转换的代码，可以弥补这些差异

我们在 `subgraph.yaml` 中声明了 `handleBlock` 和 `handleReceipt` 分别用于接收新增区块事件，以及合约事件

这两个方法都必须在 `mapping.ts` 中定义，并且导出为外部使用：

```ts
export function handleBlock(block: near.Block): void {}

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {}
```

当接收到链上的事件通知时，上面的两个方法都会被自动调用：

- 执行我们预定的转换逻辑
- 将转换后的数据存储

[handleBlock](/src/mapping.ts#L18) 的内容就是直观的数据转换，就不赘述了。不过注意需要显式地调用 `save` 方法来存储数据

[handleReceipt](/src/mapping.ts#L29) 需要简单解释一下

receipt 中包含的 actions 才是合约上的事件，receipt 可以理解为事件的打包。所以需要有解包逻辑并处理每条事件：

```ts
export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.block.header);
  }
}
```

通过 `for` 循环处理 receipt 中的每条事件，`handleAction` 为实际的处理方法

为了进一步对不同的事件采取不同的处理逻辑，在 `handleAction` 内部还有一段路由逻辑：

```ts
if (call.methodName == "withdraw") {
}
```

> `handleReceipt` 同时演示了将数据保存为实体，和利用 [store api](https://thegraph.com/docs/developer/assemblyscript-api#store-api) 保存中间结果

另一个需要注意的问题是，需要正确的操作合约事件中的参数名和参数类型，比如：

```ts
if (call.methodName == "withdraw") {
  const act = new WithdrawAction(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.account = args.get("token_id")!.toString(); // 如何知道参数名是 `token_id` 以及其类型是 `String`
}
```

可以通过查看合约源码的方式 [ref-contracts](https://github.com/ref-finance/ref-contracts)：

- `call.methodName` 对应合约中的 `#[payable]` 修饰的方法名
- 参数名即为合约的形参名称
- 参数类型对应合约形参的类型，不过需要换成它们在 [graphql-supported-scalars](https://thegraph.com/docs/developer/create-subgraph-hosted#graphql-supported-scalars) 对应的名称

## 部署

可以认为 Subgraph 中需要我们编写的部分，实际就是：

- 实体定义
- 数据转换

编写完 Subgraph 后，需要将其部署到 TheGraph 上，以托管的方式运行

首先申请一个 TheGraph 的账号，打开 [Dashboard](https://thegraph.com/hosted-service/dashboard) 页面点击右上的 `Sign In` 使用 Github 账号登录记录

还是在 [Dashboard](https://thegraph.com/hosted-service/dashboard)，注意下页面中的 `Access Token`，随后的部署会用到

在进行实际的部署动作之前，还行需要完成两件事情：

1. 在 [Dashboard](https://thegraph.com/hosted-service/dashboard) 中新增一个 Subgraph
2. 将我们的 Subgraph 代码上传到 Github

新增 Subgraph 点击页面中的 `Add Subgraph` 后按页面提示填写表单即可，需要注意的是 `Subgraph name`，当输入名称后，输入框下面会有一行小字比如：

> `thegraph.com/hosted-service/your_account_name/your_subgraph_name`

其中 `your_account_name/your_subgraph_name` 就是下文将用到的 `SUBGRAPH_NAME` 的内容

上传代码到 Github 的步骤也不赘述了

下面是实际的部署操作：

在项目中 `package.json` 的 `scripts` 中新增 `deploy:subgraph` 字段：

```json
{
  "deploy:subgraph": "graph deploy SUBGRAPH_NAME --node https://api.thegraph.com/deploy/ --ipfs https://api.thegraph.com/ipfs/ --access-token $GRAPH_TOKEN"
}
```

将 `SUBGRAPH_NAME` 替换为上文提到的 `your_account_name/your_subgraph_name` 内容

运行下面的命令即可部署：

```
export GRAPH_TOKEN=your_access_token && yarn deploy:subgraph
```

> 替换 your_access_token 为实际的令牌内容

## 查询

Subgraph 部署后，需要经过一段时间的索引，然后才能显示出查询结果，在此期间我们需要关注它是否正确

索引操作简单说就是调用 `mapping.ts` 内的方法，因此如果出错也大致在这个文件涉及的范围内

如果下面出现 `indexing_error` 则需要使用下面提到的调试方法，找到问题并重新部署

查询的方式就是在 GraphQL 客户端中输入查询语句即可，有两个途径：

- 直接在 [Dashboard](https://thegraph.com/hosted-service/dashboard) 中找到对应的 Subgraph 的 Playground 中传入查询内容
- 根据 [querying-from-your-app](https://thegraph.com/docs/developer/querying-from-your-app) 中的描述，通过编程的方式查询

查询语句的语法可以参考 [graphql-api](https://thegraph.com/docs/developer/graphql-api#queries)

## 调试

尚未发现很好的本地调试方法，需要将 Subgraph 部署后，查看它的运行日志。运行日志的查看也比较不直观

如果在 dashboard 中显示 `indexing_error` 时，可以使用下面的方法查看报错内容

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

- 将上面查询语句中 `Qm...` 的部分替换为部署后的 subgraph ID，在 [Dashboard](https://thegraph.com/hosted-service/dashboard) 中对应的 Subgraph 详情页面可以找到
- 点击查询按钮即可看到错误内容

## Links

- [在 Graph 上部署 Subgraph](https://thegraph.com/docs/supported-networks/near#subgraph-manifest-definition)，部署前必读的官方指南
- [Near Explore](https://explorer.near.org/)，用于查看区块高度
- [docs.ref.finance](https://docs.ref.finance/)
