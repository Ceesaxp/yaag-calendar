/**
 * UserManualModal.js
 * A custom element that displays the user manual in a modal dialog
 */

export default class UserManualModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --modal-width: 800px;
          --modal-max-height: 80vh;
          --primary-color: #4682B4;
          --border-color: #ced4da;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          width: var(--modal-width);
          max-width: 90%;
          max-height: var(--modal-max-height);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          color: var(--primary-color);
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          color: #666;
        }

        .modal-content {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-footer {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid var(--border-color);
          background-color: #f8f9fa;
        }

        .btn-primary {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        /* User manual specific styles */
        .manual-section {
          margin-bottom: 24px;
        }

        .manual-section h2 {
          color: var(--primary-color);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .manual-section h3 {
          margin-top: 16px;
          color: #333;
        }

        .feature-list {
          list-style-type: disc;
          padding-left: 20px;
        }

        .keyboard-shortcut {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          border: 1px solid #ddd;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        th, td {
          border: 1px solid var(--border-color);
          padding: 8px;
          text-align: left;
        }

        th {
          background-color: #f5f5f5;
        }

        .tip {
          background-color: #e8f4f8;
          border-left: 4px solid var(--primary-color);
          padding: 12px;
          margin: 16px 0;
        }
      </style>

      <div class="modal-backdrop">
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="modal-title">Year-At-A-Glance Calendar User Manual</h2>
            <button class="close-button">&times;</button>
          </div>
          <div class="modal-content">
            <div class="manual-section">
              <h2>Introduction</h2>
              <p>Welcome to the Year-At-A-Glance Calendar, a high-level visual planning tool for annual events and commitments. This application helps you visualize your entire year in one view, making it easier to plan and manage your schedule.</p>
            </div>

            <div class="manual-section">
              <h2>Key Features</h2>
              <ul class="feature-list">
                <li>Annual calendar view showing all 12 months</li>
                <li>Create, edit, and delete events</li>
                <li>Support for multi-day events</li>
                <li>Recurring events (weekly, monthly, annual)</li>
                <li>Export and import data</li>
                <li>Export to PDF</li>
                <li>Works offline (data stored in your browser)</li>
              </ul>
            </div>

            <div class="manual-section">
              <h2>Getting Started</h2>
              <h3>Navigation</h3>
              <p>Use the year navigation controls at the top of the page to switch between years:</p>
              <ul>
                <li><strong>Previous Year</strong> button: Move to the previous year</li>
                <li><strong>Year Dropdown</strong>: Select a specific year</li>
                <li><strong>Next Year</strong> button: Move to the next year</li>
              </ul>

              <h3>Creating Events</h3>
              <p>To create a new event:</p>
              <ol>
                <li>Click the <strong>+ New Event</strong> button or click directly on a day in the calendar</li>
                <li>Fill in the event details in the modal that appears</li>
                <li>Click <strong>Save</strong> to create the event</li>
              </ol>

              <div class="tip">
                <strong>Tip:</strong> You can create events that span multiple days by setting different start and end dates.
              </div>
            </div>

            <div class="manual-section">
              <h2>Event Types and Properties</h2>
              <p>Events can have the following properties:</p>
              <table>
                <tr>
                  <th>Property</th>
                  <th>Description</th>
                </tr>
                <tr>
                  <td>Title</td>
                  <td>The name of the event (required)</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>Additional details about the event (optional)</td>
                </tr>
                <tr>
                  <td>Start Date</td>
                  <td>When the event begins (required)</td>
                </tr>
                <tr>
                  <td>End Date</td>
                  <td>When the event ends (defaults to start date)</td>
                </tr>
                <tr>
                  <td>Starts PM</td>
                  <td>Indicates the event starts in the afternoon</td>
                </tr>
                <tr>
                  <td>Ends AM</td>
                  <td>Indicates the event ends in the morning</td>
                </tr>
                <tr>
                  <td>Public Holiday</td>
                  <td>Marks the event as a public holiday (displayed differently)</td>
                </tr>
                <tr>
                  <td>Recurring</td>
                  <td>Makes the event repeat according to a pattern</td>
                </tr>
              </table>
            </div>

            <div class="manual-section">
              <h2>Managing Events</h2>
              <h3>Editing Events</h3>
              <p>To edit an existing event:</p>
              <ol>
                <li>Click on the event in the calendar</li>
                <li>Modify the event details in the modal</li>
                <li>Click <strong>Save</strong> to update the event</li>
              </ol>

              <h3>Deleting Events</h3>
              <p>To delete an event:</p>
              <ol>
                <li>Click on the event in the calendar</li>
                <li>Click the <strong>Delete</strong> button in the event modal</li>
                <li>Confirm the deletion when prompted</li>
              </ol>
            </div>

            <div class="manual-section">
              <h2>Recurring Events</h2>
              <p>You can create events that repeat automatically:</p>
              <ol>
                <li>Create or edit an event</li>
                <li>Check the <strong>Recurring</strong> checkbox</li>
                <li>Select a recurrence pattern (Weekly, Monthly, or Annual)</li>
                <li>Configure the pattern options</li>
                <li>Save the event</li>
              </ol>
              <p>Recurring events will be displayed with a special indicator and will automatically appear on all relevant dates.</p>
            </div>

            <div class="manual-section">
              <h2>Data Management</h2>
              <h3>Exporting Data</h3>
              <p>To export your calendar data:</p>
              <ol>
                <li>Click the <strong>Export Data</strong> button</li>
                <li>The data will be downloaded as a JSON file</li>
              </ol>

              <h3>Importing Data</h3>
              <p>To import calendar data:</p>
              <ol>
                <li>Click the <strong>Import Data</strong> button</li>
                <li>Select a previously exported JSON file</li>
                <li>The data will be imported and merged with your existing calendar</li>
              </ol>

              <h3>Exporting to PDF</h3>
              <p>To create a PDF of your calendar:</p>
              <ol>
                <li>Click the <strong>Export to PDF</strong> button</li>
                <li>A PDF file will be generated and downloaded</li>
              </ol>

              <h3>Resetting the Calendar</h3>
              <p>To clear all events and reset the calendar:</p>
              <ol>
                <li>Click the <strong>Reset</strong> button</li>
                <li>Confirm the reset when prompted</li>
              </ol>
              <div class="tip">
                <strong>Warning:</strong> Resetting the calendar will permanently delete all your events. Consider exporting your data before resetting.
              </div>
            </div>

            <div class="manual-section">
              <h2>Troubleshooting</h2>
              <h3>Data Not Saving</h3>
              <p>If your events aren't being saved:</p>
              <ul>
                <li>Make sure your browser allows local storage</li>
                <li>Try using a different browser</li>
                <li>Export your data regularly as a backup</li>
              </ul>

              <h3>Display Issues</h3>
              <p>If the calendar doesn't display correctly:</p>
              <ul>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Ensure your browser is up to date</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary close-modal">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Close button in header
    const closeButton = this.shadowRoot.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Close button in footer
    const closeModalButton = this.shadowRoot.querySelector('.close-modal');
    if (closeModalButton) {
      closeModalButton.addEventListener('click', () => this.close());
    }

    // Close when clicking outside the modal
    const modalBackdrop = this.shadowRoot.querySelector('.modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
          this.close();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  open() {
    const modalBackdrop = this.shadowRoot.querySelector('.modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'flex';
      this.isOpen = true;
    }
  }

  close() {
    const modalBackdrop = this.shadowRoot.querySelector('.modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'none';
      this.isOpen = false;
    }
  }
}

// Define the custom element
customElements.define('user-manual-modal', UserManualModal);
