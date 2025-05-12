import "@material/web/iconbutton/icon-button";
import { mdiChevronUp, mdiChevronDown } from "@mdi/js";

import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("collapse-box")
export class CollapsibleBox extends LitElement {
  @property({ attribute: false })
  private isExpanded = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  render() {
    return html`
      <div class="container">
        <div class="header" @click="${this.toggleExpand}">
          <slot name="title"></slot>
          <md-icon-button>
            <ha-svg-icon
              .path=${this.isExpanded ? mdiChevronUp : mdiChevronDown}
            ></ha-svg-icon>
          </md-icon-button>
        </div>
        <div class="content ${this.isExpanded ? "expanded" : ""}">
          <slot></slot>
        </div>
      </div>
    `;
  }

  static styles = css`
    .container {
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 4px;
      overflow: hidden;
    }

    .header {
      padding: 4px;
      background-color: #f5f5f5;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .content.expanded {
      max-height: 500px; /* 根据内容调整 */
      transition: max-height 0.3s ease-in;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "collapse-box": CollapsibleBox;
  }
}
