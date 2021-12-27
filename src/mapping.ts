import {
  near,
  BigInt,
  log,
  json,
  JSONValue,
  TypedMap,
} from "@graphprotocol/graph-ts";
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

  if (call.methodName == "register_tokens") {
    register_tokens(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "unregister_tokens") {
    unregister_tokens(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "withdraw") {
    withdraw(action, receipt, blockHeader.timestampNanosec);
    return;
  }

  if (call.methodName == "add_simple_pool") {
    add_simple_pool(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "execute_actions") {
    execute_actions(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "swap") {
    swap(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "add_liquidity") {
    add_liquidity(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "remove_liquidity") {
    remove_liquidity(action, receipt, blockHeader.timestampNanosec);
    return;
  }

  if (call.methodName == "mft_register") {
    mft_register(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "mft_transfer") {
    mft_transfer(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "mft_transfer_call") {
    mft_transfer_call(action, receipt, blockHeader.timestampNanosec);
    return;
  }

  if (call.methodName == "storage_deposit") {
    storage_deposit(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "storage_withdraw") {
    storage_withdraw(action, receipt, blockHeader.timestampNanosec);
    return;
  }
  if (call.methodName == "storage_unregister") {
    storage_unregister(action, receipt, blockHeader.timestampNanosec);
    return;
  }
}

function isset(obj: TypedMap<string, JSONValue>, key: string): boolean {
  if (!obj.isSet(key)) return false;
  if (obj.get(key)!.isNull()) return false;
  return true;
}

function register_tokens(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const act = new RegisterTokensAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_ids = args
    .get("token_ids")!
    .toArray()
    .map<string>((r: JSONValue) => r.toString());
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function unregister_tokens(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const act = new UnregisterTokensAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_ids = args
    .get("token_ids")!
    .toArray()
    .map<string>((r: JSONValue) => r.toString());
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function withdraw(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const act = new WithdrawAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (isset(args, "unregister")) {
    act.unregister = args.get("unregister")!.toBool();
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function add_simple_pool(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const act = new AddSimplePoolAct(receipt.id.toHexString());
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  act.sender = receipt.signerId;
  act.tokens = args
    .get("tokens")!
    .toArray()
    .map<string>((r) => r.toString());
  act.fee = BigInt.fromU64(args.get("fee")!.toU64());
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function execute_actions(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const baseId = receipt.id.toHexString();
  const acts = args.get("actions")!.toArray();
  const actions = new Array<string>(acts.length);
  for (let i = 0, len = acts.length; i < len; i++) {
    const o = acts[i].toObject();
    const a = new ActionAct(baseId + i.toString());
    a.pool_id = BigInt.fromU64(o.get("pool_id")!.toU64());
    a.token_in = o.get("token_in")!.toString();
    if (isset(o, "amount_in")) {
      a.amount_in = BigInt.fromString(o.get("amount_in")!.toString());
    }
    a.token_out = o.get("token_out")!.toString();
    a.min_amount_out = BigInt.fromString(o.get("min_amount_out")!.toString());
    a.timestampNanosec = BigInt.fromU64(timestampNanosec);
    a.save();

    actions[i] = a.id;
  }
  const act = new ExecuteActsAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.actions = actions;
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function swap(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const baseId = receipt.id.toHexString();
  const acts = args.get("actions")!.toArray();
  const actions = new Array<string>(acts.length);
  for (let i = 0, len = acts.length; i < len; i++) {
    const o = acts[i].toObject();
    const a = new ActionAct(baseId + i.toString());
    if (isset(o, "pool_id")) {
      a.pool_id = BigInt.fromU64(o.get("pool_id")!.toU64());
    }
    a.token_in = o.get("token_in")!.toString();
    if (isset(o, "amount_in")) {
      a.amount_in = BigInt.fromString(o.get("amount_in")!.toString());
    }
    a.token_out = o.get("token_out")!.toString();
    a.min_amount_out = BigInt.fromString(o.get("min_amount_out")!.toString());
    a.timestampNanosec = BigInt.fromU64(timestampNanosec);
    a.save();

    actions[i] = a.id;
  }

  const act = new SwapAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.actions = actions;
  if (isset(args, "referral_id")) {
    act.referral_id = args.get("referral_id")!.toString();
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function add_liquidity(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new AddLiquidityAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.pool_id = BigInt.fromU64(args.get("pool_id")!.toU64());
  act.amounts = args
    .get("amounts")!
    .toArray()
    .map<BigInt>((r) => {
      return BigInt.fromString(r.toString());
    });
  if (isset(args, "min_amounts")) {
    act.amounts = args
      .get("min_amounts")!
      .toArray()
      .map<BigInt>((r) => {
        return BigInt.fromString(r.toString());
      });
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function remove_liquidity(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new RemoveLiquidityAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.pool_id = BigInt.fromU64(args.get("pool_id")!.toU64());
  act.shares = BigInt.fromString(args.get("shares")!.toString());
  act.min_amounts = args
    .get("min_amounts")!
    .toArray()
    .map<BigInt>((r) => {
      return BigInt.fromString(r.toString());
    });
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function mft_register(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftRegisterAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.account_id = args.get("account_id")!.toString();
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function mft_transfer(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftTransferAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.receiver_id = args.get("receiver_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (isset(args, "memo")) {
    act.memo = args.get("memo")!.toString();
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function mft_transfer_call(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new MftTransferCallAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  act.token_id = args.get("token_id")!.toString();
  act.receiver_id = args.get("receiver_id")!.toString();
  act.amount = BigInt.fromString(args.get("amount")!.toString());
  if (isset(args, "memo")) {
    act.memo = args.get("memo")!.toString();
  }
  act.msg = args.get("msg")!.toString();
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function storage_deposit(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageDepositAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (isset(args, "account_id")) {
    act.account_id = args.get("account_id")!.toString();
  }
  if (isset(args, "registration_only")) {
    act.registration_only = args.get("registration_only")!.toBool();
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function storage_withdraw(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageWithdrawAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (isset(args, "amount")) {
    act.amount = BigInt.fromString(args.get("amount")!.toString());
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}

function storage_unregister(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  timestampNanosec: u64
): void {
  const args = json.fromBytes(action.toFunctionCall().args).toObject();
  const act = new StorageUnregisterAct(receipt.id.toHexString());
  act.sender = receipt.signerId;
  if (isset(args, "force")) {
    act.force = args.get("force")!.toBool();
  }
  act.timestampNanosec = BigInt.fromU64(timestampNanosec);
  act.save();
}
