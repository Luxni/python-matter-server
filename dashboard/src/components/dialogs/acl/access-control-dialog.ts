import "@material/web/dialog/dialog";
import "@material/web/button/text-button";
import "@material/web/list/list";
import "@material/web/list/list-item";
import "@material/web/all.js";

import { html, css, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { MatterNode } from "../../../client/models/node";

import { preventDefault } from "../../../util/prevent_default";
import { MatterClient } from "../../../client/client";

import {
  AccessControlEntryDataTransformer,
  AccessControlEntryResponse,
  AccessControlEntryStruct,
  AccessControlEntryRawInput,
} from "./model";

import "./collapsibleBox";
import { MdOutlinedTextField } from "@material/web/all.js";

@customElement("access-control-dialog")
export class AccessControlDialog extends LitElement {
  @property({ attribute: false })
  public client!: MatterClient;

  @property()
  public node!: MatterNode;

  @property({ attribute: false })
  endpoint!: number;

  @state()
  private isConfig = false;

  @query("md-outlined-text-field[label='privilege']")
  private tx_privilege!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='authMode']")
  private tx_authMode!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='fabricIndex']")
  private tx_fabricIndex!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='subjects']")
  private tx_subjects!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='endpoint']")
  private tx_target_endpoint!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='cluster']")
  private tx_target_cluster!: MdOutlinedTextField;

  @query("md-outlined-text-field[label='deviceType']")
  private tx_target_deviceType!: MdOutlinedTextField;

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
      const result = await this.client.setACLEntry(
        this.node.node_id,
        updateEntries,
      ) as AccessControlEntryResponse[];
      if (result[0].Status === 0) {
        this.requestUpdate();
      }
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

  toggleConfig() {
    this.isConfig = !this.isConfig;
  }

  async addACLEntryHandler() {
    const acl_entry: AccessControlEntryStruct = {
      privilege: parseInt(this.tx_privilege.value, 10),
      authMode: parseInt(this.tx_authMode.value, 10),
      fabricIndex: parseInt(this.tx_fabricIndex.value, 10),
      subjects: [parseInt(this.tx_subjects.value, 10)],
      targets: [
        {
          endpoint: this.tx_target_endpoint.value
            ? parseInt(this.tx_target_endpoint.value, 10)
            : undefined,
          cluster: this.tx_target_cluster.value
            ? parseInt(this.tx_target_cluster.value, 10)
            : undefined,
          deviceType: this.tx_target_deviceType.value
            ? parseInt(this.tx_target_deviceType.value, 10)
            : undefined,
        },
      ],
    };
    const updateEntries = [
      ...this._cache.get(this.node.node_id)!.other,
      ...this._cache.get(this.node.node_id)!.local,
      ...[acl_entry],
    ];
    const result = (await this.client.setACLEntry(
      this.node.node_id,
      updateEntries,
    )) as AccessControlEntryResponse[];
    if (result[0].Status === 0) {
      this._cache.get(this.node.node_id)!.local.push(acl_entry);
      this.requestUpdate();
      this.toggleConfig();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.fetchACLEntry();
  }

  _renderAddACLEntry() {
    return html`
      <div>
        <div
          style="display:grid; grid-template-columns:1fr 1fr; gap:18px; padding:0px 8px 16px 8px;"
        >
          <md-outlined-text-field label="privilege"></md-outlined-text-field>
          <md-outlined-text-field label="authMode"></md-outlined-text-field>
          <md-outlined-text-field label="fabricIndex"></md-outlined-text-field>
          <md-outlined-text-field label="subjects"></md-outlined-text-field>
        </div>
        <div class="inline-group">
          <div class="group-label">target</div>
          <md-outlined-text-field
            class="target-item"
            label="endpoint"
          ></md-outlined-text-field>
          <md-outlined-text-field
            class="target-item"
            label="cluster"
          ></md-outlined-text-field>
          <md-outlined-text-field
            class="target-item"
            label="deviceType"
          ></md-outlined-text-field>
        </div>
      </div>
    `;
  }

  _renderACLItem() {
    const acl = this._cache.get(this.node!.node_id);
    return html`
      ${acl
        ? html`
            ${Object.values(acl!.local).map(
              (entry, index) => html`
                <collapse-box>
                  <span slot="title" style="display:flex; width: 100%;">
                    <div
                      style="display:flex; justify-content: space-between; width: 100%;"
                    >
                      <div style="align-self: anchor-center;">
                        ${"index: " + index}
                      </div>
                      <md-text-button
                        @click=${() => this.deleteACLHandler(index)}
                        >delete</md-text-button
                      >
                    </div>
                  </span>
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
                      <div style="display:flex; font-weight: bold;">
                        targets:
                      </div>
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
                </collapse-box>
              `,
            )}
          `
        : nothing}
    `;
  }

  render() {
    const isConfig = this.isConfig;

    return html`
      <md-dialog open @cancel=${preventDefault} @closed=${this._handleClosed}>
        <div slot="headline" style="justify-content: space-between;">
          <div>ACL</div>
          <md-text-button @click=${this.toggleConfig}
            >${isConfig ? "Back" : "Add"}</md-text-button
          >
        </div>
        <div style="padding-top: 4px;padding-bottom: 4px;" slot="content">
          ${isConfig
            ? html`<div>${this._renderAddACLEntry()}</div>`
            : html`<div>${this._renderACLItem()}</div>`}
        </div>
        <div style="padding-top: 4px;padding-bottom: 4px;" slot="actions">
          ${isConfig
            ? html`
                <md-text-button @click=${this.addACLEntryHandler}
                  >OK</md-text-button
                >
              `
            : nothing}
          <md-text-button @click=${this._close}>Cancel</md-text-button>
        </div>
      </md-dialog>
    `;
  }

  static styles = css`
    .inline-group {
      display: flex;
      border: 2px solid #673ab7;
      padding: 1px;
      border-radius: 8px;
      position: relative;
      margin: 8px;
    }

    .target-item {
      display: inline-block;
      padding: 20px 10px 10px 10px;
      border-radius: 4px;
      vertical-align: middle;
      min-width: 80px;
      text-align: center;
    }

    .group-label {
      position: absolute;
      left: 15px;
      top: -12px;
      background: #673ab7;
      color: white;
      padding: 3px 15px;
      border-radius: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "access-control-dialog": AccessControlDialog;
  }
}
