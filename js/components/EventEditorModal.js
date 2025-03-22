class EventEditorModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.event = null;
    this.isOpen = false;
    this.isNewEvent = true;
    this.render();
  }

  static get observedAttributes() {
    return ['open'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this.isOpen = newValue !== null;
      this.updateVisibility();
    }
  }

  connectedCallback() {
    this.shadowRoot
      .querySelector('form')
      .addEventListener('submit', this.handleSubmit.bind(this));
    this.shadowRoot
      .querySelector('.cancel-btn')
      .addEventListener('click', this.handleCancel.bind(this));
    this.shadowRoot
      .querySelector('.delete-btn')
      .addEventListener('click', this.handleDelete.bind(this));
    this.shadowRoot
      .querySelector('#isRecurring')
      .addEventListener('change', this.toggleRecurrenceFields.bind(this));
    
    // Add date validation listeners
    this.shadowRoot
      .querySelector('#startDate')
      .addEventListener('change', this.handleStartDateChange.bind(this));
    this.shadowRoot
      .querySelector('#endDate')
      .addEventListener('change', this.handleEndDateChange.bind(this));
      
    this.updateVisibility();
  }

  disconnectedCallback() {
    this.shadowRoot
      .querySelector('form')
      .removeEventListener('submit', this.handleSubmit.bind(this));
    this.shadowRoot
      .querySelector('.cancel-btn')
      .removeEventListener('click', this.handleCancel.bind(this));
    this.shadowRoot
      .querySelector('.delete-btn')
      .removeEventListener('click', this.handleDelete.bind(this));
    this.shadowRoot
      .querySelector('#isRecurring')
      .removeEventListener('change', this.toggleRecurrenceFields.bind(this));
    
    // Remove date validation listeners
    this.shadowRoot
      .querySelector('#startDate')
      .removeEventListener('change', this.handleStartDateChange.bind(this));
    this.shadowRoot
      .querySelector('#endDate')
      .removeEventListener('change', this.handleEndDateChange.bind(this));
  }
  
  // Handle start date changes - ensure end date is never before start date
  handleStartDateChange(e) {
    const startDateInput = e.target;
    const endDateInput = this.shadowRoot.querySelector('#endDate');
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    // If start date is after end date, set end date to start date
    if (startDate > endDate) {
      endDateInput.value = startDateInput.value;
    }
  }
  
  // Handle end date changes - ensure start date is never after end date
  handleEndDateChange(e) {
    const endDateInput = e.target;
    const startDateInput = this.shadowRoot.querySelector('#startDate');
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    // If end date is before start date, set start date to end date
    if (endDate < startDate) {
      startDateInput.value = endDateInput.value;
    }
  }

  open(event = null, initialDate = null) {
    this.event = event;
    this.isNewEvent = !event;
    this.setAttribute('open', '');

    if (event) {
      // Populate form with event data
      this.populateForm(event);
    } else {
      // Reset form for new event
      this.resetForm();
      
      // If an initial date was provided, set both start and end dates to it
      if (initialDate instanceof Date) {
        const formattedDate = this.formatDateForInput(initialDate);
        this.shadowRoot.querySelector('#startDate').value = formattedDate;
        this.shadowRoot.querySelector('#endDate').value = formattedDate;
      }
    }

    this.toggleRecurrenceFields();
    this.updateDeleteButton();
  }

  close() {
    this.removeAttribute('open');
  }

  updateVisibility() {
    const modalElement = this.shadowRoot.querySelector('.modal-container');
    if (this.isOpen) {
      modalElement.classList.add('visible');
      document.body.style.overflow = 'hidden';
    } else {
      modalElement.classList.remove('visible');
      document.body.style.overflow = '';
    }
  }

  updateDeleteButton() {
    const deleteBtn = this.shadowRoot.querySelector('.delete-btn');
    deleteBtn.style.display = this.isNewEvent ? 'none' : 'block';
  }

  resetForm() {
    const form = this.shadowRoot.querySelector('form');
    form.reset();

    // Set default dates to today
    const today = new Date();
    const formattedDate = this.formatDateForInput(today);

    this.shadowRoot.querySelector('#startDate').value = formattedDate;
    this.shadowRoot.querySelector('#endDate').value = formattedDate;
  }

  populateForm(event) {
    // Set basic fields
    this.shadowRoot.querySelector('#title').value = event.title || '';
    this.shadowRoot.querySelector('#description').value =
      event.description || '';
    this.shadowRoot.querySelector('#startDate').value = this.formatDateForInput(
      new Date(event.startDate),
    );
    this.shadowRoot.querySelector('#endDate').value = this.formatDateForInput(
      new Date(event.endDate),
    );

    // Set boolean fields
    this.shadowRoot.querySelector('#isRecurring').checked =
      event.isRecurring || false;
    this.shadowRoot.querySelector('#startsPM').checked =
      event.startsPM || false;
    this.shadowRoot.querySelector('#endsAM').checked = event.endsAM || false;
    this.shadowRoot.querySelector('#isPublicHoliday').checked =
      event.isPublicHoliday || false;

    // Set recurrence pattern if applicable
    if (event.isRecurring && event.recurrencePattern) {
      this.shadowRoot.querySelector('#recurrenceType').value =
        event.recurrencePattern.type || 'weekly';
    }
  }

  formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleRecurrenceFields() {
    const isRecurringChecked =
      this.shadowRoot.querySelector('#isRecurring').checked;
    const recurrenceFieldset =
      this.shadowRoot.querySelector('.recurrence-fields');

    if (isRecurringChecked) {
      recurrenceFieldset.style.display = 'block';
    } else {
      recurrenceFieldset.style.display = 'none';
    }
  }

  validateForm() {
    const title = this.shadowRoot.querySelector('#title').value.trim();
    const startDate = new Date(
      this.shadowRoot.querySelector('#startDate').value,
    );
    const endDate = new Date(this.shadowRoot.querySelector('#endDate').value);

    if (!title) {
      alert('Title is required');
      return false;
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert('Valid start and end dates are required');
      return false;
    }

    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return false;
    }

    // Validate the event is within the same year
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      alert('Events must be within the same year');
      return false;
    }

    return true;
  }

  collectFormData() {
    const isRecurring = this.shadowRoot.querySelector('#isRecurring').checked;

    const eventData = {
      title: this.shadowRoot.querySelector('#title').value.trim(),
      description: this.shadowRoot.querySelector('#description').value.trim(),
      startDate: new Date(this.shadowRoot.querySelector('#startDate').value),
      endDate: new Date(this.shadowRoot.querySelector('#endDate').value),
      isRecurring: isRecurring,
      startsPM: this.shadowRoot.querySelector('#startsPM').checked,
      endsAM: this.shadowRoot.querySelector('#endsAM').checked,
      isPublicHoliday:
        this.shadowRoot.querySelector('#isPublicHoliday').checked,
    };

    // Add ID if editing an existing event
    if (this.event && this.event.id) {
      eventData.id = this.event.id;
    } else {
      // Generate a new ID for new events
      eventData.id = 'event_' + Date.now().toString();
    }

    // Add recurrence pattern if applicable
    if (isRecurring) {
      eventData.recurrencePattern = {
        type: this.shadowRoot.querySelector('#recurrenceType').value,
      };
    }

    return eventData;
  }

  handleSubmit(event) {
    event.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    const eventData = this.collectFormData();

    // Dispatch custom event with the event data
    const saveEvent = new CustomEvent('event-save', {
      detail: { event: eventData },
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(saveEvent);
    this.close();
  }

  handleCancel() {
    const cancelEvent = new CustomEvent('event-cancel', {
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(cancelEvent);
    this.close();
  }

  handleDelete() {
    if (confirm('Are you sure you want to delete this event?')) {
      const deleteEvent = new CustomEvent('event-delete', {
        detail: { eventId: this.event.id },
        bubbles: true,
        composed: true,
      });

      this.dispatchEvent(deleteEvent);
      this.close();
    }
  }

  showConfirmationDialog(message, onConfirm) {
    const confirmation = confirm(message);
    if (confirmation) {
      const secondConfirmation = prompt('Type "Yes, I understand" to confirm.');
      if (secondConfirmation === 'Yes, I understand') {
        onConfirm();
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #4682B4;
          --danger-color: #dc3545;
          --light-gray: #f8f9fa;
          --dark-gray: #343a40;
          --border-color: #ced4da;
        }

        .modal-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }

        .modal-container.visible {
          opacity: 1;
          visibility: visible;
        }

        .modal-content {
          background-color: white;
          border-radius: 5px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          padding: 15px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-body {
          padding: 15px;
        }

        .modal-footer {
          padding: 15px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
        }

        .form-group {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        input[type="text"],
        textarea,
        input[type="date"],
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          box-sizing: border-box;
        }

        textarea {
          min-height: 80px;
          resize: vertical;
        }

        .checkbox-group {
          margin-bottom: 10px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          font-weight: normal;
        }

        .checkbox-group input[type="checkbox"] {
          margin-right: 8px;
        }

        .recurrence-fields {
          margin-top: 10px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--light-gray);
        }

        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .save-btn {
          background-color: var(--primary-color);
          color: white;
        }

        .cancel-btn {
          background-color: var(--light-gray);
          color: var(--dark-gray);
        }

        .delete-btn {
          background-color: var(--danger-color);
          color: white;
        }

        /* Helper class */
        .hidden {
          display: none;
        }
      </style>

      <div class="modal-container">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Add New Event</h2>
          </div>

          <div class="modal-body">
            <form id="event-form">
              <div class="form-group">
                <label for="title">Title*</label>
                <input type="text" id="title" required>
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description"></textarea>
              </div>

              <div class="form-group">
                <label for="startDate">Start Date*</label>
                <input type="date" id="startDate" required>
              </div>

              <div class="form-group">
                <label for="endDate">End Date*</label>
                <input type="date" id="endDate" required>
              </div>

              <div class="checkbox-group">
                <label>
                  <input type="checkbox" id="startsPM">
                  Starts in the afternoon (PM)
                </label>
              </div>

              <div class="checkbox-group">
                <label>
                  <input type="checkbox" id="endsAM">
                  Ends in the morning (AM)
                </label>
              </div>

              <div class="checkbox-group">
                <label>
                  <input type="checkbox" id="isPublicHoliday">
                  Public Holiday
                </label>
              </div>

              <div class="checkbox-group">
                <label>
                  <input type="checkbox" id="isRecurring">
                  Recurring Event
                </label>
              </div>

              <fieldset class="recurrence-fields" style="display: none;">
                <legend>Recurrence Pattern</legend>
                <div class="form-group">
                  <label for="recurrenceType">Repeat</label>
                  <select id="recurrenceType">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </fieldset>
            </form>
          </div>

          <div class="modal-footer">
            <div>
              <button type="button" class="delete-btn" style="display: none;">Delete</button>
            </div>
            <div>
              <button type="button" class="cancel-btn">Cancel</button>
              <button type="submit" form="event-form" class="save-btn">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('event-editor-modal', EventEditorModal);

// Usage example:
/*
// 1. Create an instance
const modal = document.createElement('event-editor-modal');
document.body.appendChild(modal);

// 2. Open for a new event
modal.open();

// 3. Open for editing an existing event
const existingEvent = {
  id: 'event123',
  title: 'Project Milestone',
  description: 'Complete phase 1 of the project',
  startDate: new Date('2025-06-15'),
  endDate: new Date('2025-06-18'),
  isRecurring: false,
  startsPM: true,
  endsAM: false,
  isPublicHoliday: false
};
modal.open(existingEvent);

// 4. Listen for events
modal.addEventListener('event-save', (e) => {
  console.log('Event saved:', e.detail.event);
  // Update your data storage/state here
});

modal.addEventListener('event-cancel', () => {
  console.log('Edit cancelled');
});

modal.addEventListener('event-delete', (e) => {
  console.log('Event deleted:', e.detail.eventId);
  // Remove from your data storage/state here
});
*/

export default EventEditorModal;
