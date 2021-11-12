import { near, BigInt, Bytes, log, json, JSONValueKind, JSONValue } from "@graphprotocol/graph-ts";
import { BlockAction, BlockEvent, WithdrawAction } from "../generated/schema";

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

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    // FIXME: log not work on dashboard web-ui
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  const call = action.toFunctionCall();

  const event = new BlockAction(blockHeader.hash.toHexString());
  event.methodName = call.methodName;

  if (call.methodName == "withdraw") {
    const act = new WithdrawAction(receipt.id.toHexString());
    const args = json.fromBytes(action.toFunctionCall().args).toObject();
    act.accountId = args.get("token")!.toString();
    act.amount = args.get("amount")!.toBigInt()
    act.save();
  }

  event.save();
}
