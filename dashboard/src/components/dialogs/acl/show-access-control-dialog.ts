import { MatterClient } from "../../../client/client";
import { MatterNode } from "../../../client/models/node";

export const showAccessControlDialog = async (
  client: MatterClient,
  node: MatterNode,
  endpoint: number,
) => {
  await import("./access-control-dialog");
  const dialog = document.createElement("access-control-dialog");
  dialog.client = client;
  dialog.node = node;
  dialog.endpoint = endpoint;
  document
    .querySelector("matter-dashboard-app")
    ?.renderRoot.appendChild(dialog);
};
