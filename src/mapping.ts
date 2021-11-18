import {
  near,
  BigInt,
  log,
  json,
  crypto,
  ByteArray,
  store,
  Value,
} from "@graphprotocol/graph-ts";
import {
  BlockAction,
  BlockEvent,
  UserWithdraw,
  WithdrawAction,
} from "../generated/schema";

export function handleBlock(block: near.Block): void {
  const header = block.header;
  const event = new BlockEvent(header.hash.toHexString());
  event.number = BigInt.fromI32(header.height as i32);
  event.hash = header.hash;
  event.account = block.author;
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

function withdrawKey(account: string): string {
  return "withdraw." + account;
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

  const event = new BlockAction(blockHeader.hash.toHexString());
  event.methodName = call.methodName;

  if (call.methodName == "withdraw") {
    const act = new WithdrawAction(receipt.id.toHexString());
    const args = json.fromBytes(action.toFunctionCall().args).toObject();
    act.account = args.get("token_id")!.toString();
    act.amount = BigInt.fromString(args.get("amount")!.toString());
    act.save();

    // test the store api
    const key = crypto
      .keccak256(ByteArray.fromUTF8(withdrawKey(act.account)))
      .toHexString();
    let record = store.get("UserWithdraw", key);
    if (!record) {
      record = new UserWithdraw(key);
    }

    const acc = record.get("accumulated")!.toBigInt();
    record.set("accumulated", Value.fromBigInt(acc.plus(act.amount)));
    store.set("UserWithdraw", key, record);
  }

  event.save();
}
