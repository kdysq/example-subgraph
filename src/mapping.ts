import { near, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { BlockAction, BlockEvent } from "../generated/schema";

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

  const event = new BlockAction(blockHeader.hash.toHexString());
  event.methodName = action.toFunctionCall().methodName;
  event.save();
}
