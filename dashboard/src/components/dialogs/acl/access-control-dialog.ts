import "@material/web/dialog/dialog";
import "@material/web/button/text-button";
import "@material/web/list/list";
import "@material/web/list/list-item";

import { html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { MatterNode } from "../../../client/models/node";

import { preventDefault } from "../../../util/prevent_default";
import { MatterClient } from "../../../client/client";

import {
  AccessControlEntryDataTransformer,
  AccessControlEntryStruct,
  AccessControlEntryRawInput,
} from "./model";

import "./collapsibleBox";

@customElement("access-control-dialog")
export class AccessControlDialog extends LitElement {
  @property({ attribute: false })
  public client!: MatterClient;

  @property()
  public node!: MatterNode;

  @property({ attribute: false })
  endpoint!: number;

  private _cache = new Map<
    number,
    { local: AccessControlEntryStruct[]; other: AccessControlEntryStruct[] }
  >();

  private _close() {
    this.shadowRoot!.querySelector("md-dialog")!.close();
  }

  private _handleClosed() {
    this.parentNode!.removeChild(this);
  }

  async editACLHandler(_index: number) {}

  async deleteACLHandler(index: number) {
    try {
      if (!this.node) {
        throw new Error("Node is not defined");
      }

      const acl = this._cache.get(this.node.node_id);
      if (!acl) {
        throw new Error("ACL data not found in cache");
      }

      const localACLEntries = acl.local.filter(
        (_entry, _index) => index !== _index,
      );

      // Update cache
      this._cache.set(this.node.node_id, {
        local: localACLEntries,
        other: acl.other,
      });

      const updateEntries = [...acl.other, ...localACLEntries];
      console.log("Updated ACL entries:", updateEntries);
      this.client.setACLEntry(this.node.node_id, updateEntries);
    } catch (error) {
      console.error("Failed to delete ACL entry:", error);
    }
  }

  private fetchACLEntry() {
    try {
      if (this._cache.has(this.node!.node_id)) {
        return;
      }

      const acl_cluster_raw: AccessControlEntryRawInput[] =
        this.client.nodes[this.node!.node_id].attributes["0/31/0"] || [];

      const nodes = Object.keys(this.client.nodes).map((nodeId) =>
        parseInt(nodeId, 10),
      );

      const entries = Object.values(acl_cluster_raw).map(
        (value: AccessControlEntryRawInput) =>
          AccessControlEntryDataTransformer.transform(value),
      );

      const result = {
        local: entries.filter((entry) =>
          Object.values(entry.subjects).some((nodeId) =>
            nodes.includes(nodeId),
          ),
        ),
        other: entries.filter((entry) =>
          Object.values(entry.subjects).every(
            (nodeId) => !nodes.includes(nodeId),
          ),
        ),
      };

      this._cache.set(this.node!.node_id, result);
    } catch (error) {
      console.error("Failed to fetch ACL entry:", error);
    }
  }

  addACLEntryHandler() {}

  connectedCallback(): void {
    super.connectedCallback();
    this.fetchACLEntry();
  }

  render() {
    const acl = this._cache.get(this.node!.node_id);

    return html`
      <md-dialog open @cancel=${preventDefault} @closed=${this._handleClosed}>
        <div slot="headline">
          <div>ACL</div>
        </div>
        <div style="padding-top: 4px;padding-bottom: 4px;" slot="content">
          <md-list>
            ${acl
              ? html`
                  ${Object.values(acl!.local).map(
                    (entry, index) => html`
                      <collapse-box>
                        <span slot="title">${"index: " + index}</span>
                        <div>
                          <div
                            style="display: flex;margin: 2px;gap: 10px;margin-left: 6px;margin-right:6px; "
                          >
                            <div style="display: flex;">
                              <div style="font-weight: bold;">privilege:</div>
                              <div>${entry.privilege}</div>
                            </div>
                            <div style="display: flex;">
                              <div style="font-weight: bold;">authMode:</div>
                              <div>${entry.authMode}</div>
                            </div>
                            <div style="display: flex;">
                              <div style="font-weight: bold;">fabricIndex:</div>
                              <div>${entry.fabricIndex}</div>
                            </div>
                          </div>
                          <div
                            style="display: flex; margin:2px; gap: 10px;margin-left: 6px;"
                          >
                            <div style="font-weight: bold;">subjects:</div>
                            <div style="display: flex;gap: 10px;">
                              ${Object.values(entry.subjects).map(
                                (subject) => html` <div>${subject}</div> `,
                              )}
                            </div>
                          </div>
                          <div
                            style="display:flex; margin:2px; gap: 10px;margin-left: 6px;"
                          >
                            <div style="display:flex; font-weight: bold;">targets:</div>
                            <div style="display:flex; gap: 10px;">
                                ${Object.values(entry.targets!).map(
                                  (target) => html`
                                    <div style="display:flex;">
                                      ${target.endpoint
                                        ? html`
                                            <div style="display:flex;">
                                              <div>endpoint:</div>
                                              <div>${target.endpoint}</div>
                                            </div>
                                          `
                                        : nothing}
                                      ${target.cluster
                                        ? html`
                                            <div style="display:flex;">
                                              <div>cluster:</div>
                                              <div>${target.cluster}</div>
                                            </div>
                                          `
                                        : nothing}
                                      ${target.deviceType
                                        ? html`
                                            <div style="display:flex;">
                                              <div>deviceType:</div>
                                              <div>${target.deviceType}</div>
                                            </div>
                                          `
                                        : nothing}
                                    </div>
                                  `,
                                )}
                            </div>
                          </div>
                          </div>
                        </div>
                      </collapse-box>
                    `,
                  )}
                `
              : nothing}
          </md-list>
        </div>
        <div style="padding-top: 4px;padding-bottom: 4px;" slot="actions">
          <md-text-button @click=${this._close}>Cancel</md-text-button>
        </div>
      </md-dialog>
    `;
  }

  _render() {
    return html`
      <md-dialog open @cancel=${preventDefault} @closed=${this._handleClosed}>
        <div slot="headline">
          <div>ACL</div>
        </div>
        <div slot="content">
          <collapse-box>
            <span slot="title">1111</span>
            <p>2222222222222222222222222222222222222222222</p>
          </collapse-box>
        </div>

        <div slot="actions">
          <md-text-button @click=${this._close}>Cancel</md-text-button>
        </div>
      </md-dialog>
    `;
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "access-control-dialog": AccessControlDialog;
  }
}
