import { near, BigInt, log, json } from "@graphprotocol/graph-ts";
import {
  ActionAct,
  AddLiquidityAct,
  AddSimplePoolAct,
  BlockAct,
  BlockEvent,
  ExecuteActsAct,
  MftRegisterAct,
  MftTransferAct,
  MftTransferCallAct,
  RegisterTokensAct,
  RemoveLiquidityAct,
  StorageDepositAct,
  StorageUnregisterAct,
  StorageWithdrawAct,
  SwapAct,
  UnregisterTokensAct,
  WithdrawAct,
} from "../generated/schema";

export function handleBlock(block: near.Block): void {
  const header = block.header;
  const event = new BlockEvent(header.hash.toHexString());
  event.number = BigInt.fromI32(header.height as i32);
  event.hash = header.hash;
  event.sender = block.author;
  event.timestampNanosec = BigInt.fromU64(header.timestampNanosec);
  event.gasPrice = header.gasPrice;
  event.save();
}

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.block.header);
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  const call = action.toFunctionCall();

  const event = new BlockAct(blockHeader.hash.toHexString());
  event.methodName = call.methodName;
  event.save();

  const fn = handleMap[call.methodName];
  if (!fn) return;

  fn(action, receipt);
}

type Handle = (action: near.ActionValue, receipt: near.ActionReceipt) => void;
const handleMap: {
  [k: string]: Handle;
} = {
  register_tokens,
  unregister_tokens,
  withdraw,

  add_simple_pool,
  execute_actions,
  swap,
  add_liquidity,
  remove_liquidity,

  mft_register,
  mft_transfer,
  mft_transfer_call,

  storage_deposit,
  storage_withdraw,
  storage_unregister,
};

function register_tokens(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const act = new RegisterTokensAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_ids = args
    .get("token_ids")!
    .toArray()
    .map((r) => r.toString());
  act.save();
}

function unregister_tokens(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const act = new UnregisterTokensAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_ids = args
    .get("token_ids")!
    .toArray()
    .map((r) => r.toString());
  act.save();
}

function withdraw(action: near.ActionValue, receipt: near.ActionReceipt) {
  const act = new WithdrawAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (args.isSet("unregister")) {
    act.unregister = args.get("unregister")!.toBool();
  }
  act.save();
}

function add_simple_pool(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const act = new AddSimplePoolAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.tokens = args
    .get("tokens")!
    .toArray()
    .map((r) => r.toString());
  act.fee = BigInt.fromString(args.get("fee")!.toString());
  act.save();
}

function execute_actions(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const actions = args
    .get("actions")!
    .toArray()
    .map((r, i) => {
      const o = r.toObject();
      const a = new ActionAct(receipt.id.toHexString() + i);
      a.pool_id = BigInt.fromString(args.get("pool_id")!.toString());
      a.token_in = args.get("token_in")!.toString();
      if (o.isSet("amount_in")) {
        a.amount_in = BigInt.fromString(args.get("amount_in")!.toString());
      }
      a.token_out = args.get("token_out")!.toString();
      a.min_amount_out = BigInt.fromString(
        args.get("min_amount_out")!.toString()
      );
      a.save();
      return a.id;
    });
  const act = new ExecuteActsAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.actions = actions;
  act.save();
}

function swap(action: near.ActionValue, receipt: near.ActionReceipt) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const actions = args
    .get("actions")!
    .toArray()
    .map((r, i) => {
      const o = r.toObject();
      const a = new ActionAct(receipt.id.toHexString() + i);
      a.pool_id = BigInt.fromString(args.get("pool_id")!.toString());
      a.token_in = args.get("token_in")!.toString();
      if (o.isSet("amount_in")) {
        a.amount_in = BigInt.fromString(args.get("amount_in")!.toString());
      }
      a.token_out = args.get("token_out")!.toString();
      a.min_amount_out = BigInt.fromString(
        args.get("min_amount_out")!.toString()
      );
      a.save();
      return a.id;
    });
  const act = new SwapAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.actions = actions;
  if (args.isSet("referral_id")) {
    act.referral_id = args.get("referral_id")!.toString();
  }
  act.save();
}

function add_liquidity(action: near.ActionValue, receipt: near.ActionReceipt) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new AddLiquidityAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.pool_id = BigInt.fromString(args.get("pool_id")!.toString());
  act.amounts = args
    .get("amounts")!
    .toArray()
    .map((r) => {
      return BigInt.fromString(r.toString());
    });
  if (args.isSet("min_amounts")) {
    act.amounts = args
      .get("min_amounts")!
      .toArray()
      .map((r) => {
        return BigInt.fromString(r.toString());
      });
  }
  act.save();
}

function remove_liquidity(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new RemoveLiquidityAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.pool_id = BigInt.fromString(args.get("pool_id")!.toString());
  act.shares = BigInt.fromString(args.get("shares")!.toString());
  act.min_amounts = args
    .get("min_amounts")!
    .toArray()
    .map((r) => {
      return BigInt.fromString(r.toString());
    });
  act.save();
}

function mft_register(action: near.ActionValue, receipt: near.ActionReceipt) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftRegisterAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.account_id = args.get("account_id")!.toString();
  act.save();
}

function mft_transfer(action: near.ActionValue, receipt: near.ActionReceipt) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftTransferAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.receiver_id = args.get("receiver_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (args.isSet("memo")) {
    act.memo = args
      .get("memo")!
      .toArray()
      .map((r) => {
        return r.toString();
      });
  }
  act.save();
}

function mft_transfer_call(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftTransferCallAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.receiver_id = args.get("receiver_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (args.isSet("memo")) {
    act.memo = args
      .get("memo")!
      .toArray()
      .map((r) => {
        return r.toString();
      });
  }
  act.msg = args.get("msg")!.toString();
  act.save();
}

function storage_deposit(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageDepositAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (args.isSet("account_id")) {
    act.account_id = args.get("account_id")!.toString();
  }
  if (args.isSet("registration_only")) {
    act.registration_only = args.get("registration_only")!.toBool();
  }
  act.save();
}

function storage_withdraw(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageWithdrawAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (args.isSet("amount")) {
    act.amount = BigInt.fromString(args.get("amount")!.toString());
  }
  act.save();
}

function storage_unregister(
  action: near.ActionValue,
  receipt: near.ActionReceipt
) {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageUnregisterAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (args.isSet("force")) {
    act.force = args.get("force")!.toBool();
  }
  act.save();
}
