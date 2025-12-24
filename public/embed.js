(function() {
  'use strict';

  // Get API base from the script's own src URL
  // This ensures we always call the CRM domain, not the embedding site's domain
  let API_BASE = 'http://localhost:3001';

  const currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
  if (currentScript && currentScript.src) {
    const scriptUrl = new URL(currentScript.src);
    API_BASE = scriptUrl.origin; // e.g., https://climcrm.com
  }

  // Find all form containers
  const containers = document.querySelectorAll('[id^="bharat-form"]');

  containers.forEach(async (container) => {
    const formSlug = container.getAttribute('data-form-slug');

    if (!formSlug) {
      console.error('Bharat Form: data-form-slug attribute is required');
      return;
    }

    try {
      // Fetch form configuration
      const response = await fetch(`${API_BASE}/api/forms/public/slug/${formSlug}`);

      if (!response.ok) {
        throw new Error('Form not found');
      }

      const formConfig = await response.json();

      // Create form element
      const form = createFormElement(formConfig);
      container.appendChild(form);

      // Add event listener for form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmission(form, formConfig);
      });

    } catch (error) {
      console.error('Bharat Form Error:', error);
      container.innerHTML = `<p style="color: red;">Error loading form</p>`;
    }
  });

  function createFormElement(config) {
    const formWrapper = document.createElement('div');
    formWrapper.className = 'bharat-form-wrapper';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .bharat-form-wrapper {
        max-width: 600px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .bharat-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 2rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .bharat-form-title {
        font-size: 1.75rem;
        font-weight: bold;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
      }
      .bharat-form-description {
        font-size: 1rem;
        color: #6b7280;
        margin: 0 0 1.5rem 0;
      }
      .bharat-form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .bharat-form-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
      .bharat-form-label.required::after {
        content: ' *';
        color: #ef4444;
      }
      .bharat-form-input,
      .bharat-form-textarea {
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.2s;
      }
      .bharat-form-input:focus,
      .bharat-form-textarea:focus {
        outline: none;
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 3px ${config.primaryColor}20;
      }
      .bharat-form-textarea {
        min-height: 120px;
        resize: vertical;
      }
      .bharat-form-button {
        padding: 0.875rem 2rem;
        background-color: ${config.primaryColor};
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .bharat-form-button:hover {
        opacity: 0.9;
      }
      .bharat-form-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .bharat-form-success {
        padding: 1rem;
        background-color: #d1fae5;
        color: #065f46;
        border-radius: 6px;
        text-align: center;
      }
      .bharat-form-error {
        padding: 1rem;
        background-color: #fee2e2;
        color: #991b1b;
        border-radius: 6px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

    // Create form HTML
    const formHTML = `
      <form class="bharat-form" id="bharat-form-${config.slug}">
        <h2 class="bharat-form-title">${config.title}</h2>
        ${config.description ? `<p class="bharat-form-description">${config.description}</p>` : ''}

        ${config.fields.map(field => createFieldHTML(field)).join('')}

        <button type="submit" class="bharat-form-button">
          ${config.buttonText}
        </button>

        <div id="form-message" style="display: none;"></div>
      </form>
    `;

    formWrapper.innerHTML = formHTML;
    return formWrapper;
  }

  function createFieldHTML(field) {
    const isRequired = field.required ? 'required' : '';
    const requiredClass = field.required ? 'required' : '';

    if (field.type === 'textarea') {
      return `
        <div class="bharat-form-group">
          <label class="bharat-form-label ${requiredClass}" for="${field.name}">
            ${field.label}
          </label>
          <textarea
            class="bharat-form-textarea"
            id="${field.name}"
            name="${field.name}"
            ${isRequired}
          ></textarea>
        </div>
      `;
    }

    return `
      <div class="bharat-form-group">
        <label class="bharat-form-label ${requiredClass}" for="${field.name}">
          ${field.label}
        </label>
        <input
          class="bharat-form-input"
          type="${field.type}"
          id="${field.name}"
          name="${field.name}"
          ${isRequired}
        />
      </div>
    `;
  }

  async function handleFormSubmission(form, config) {
    const formMessage = form.querySelector('#form-message');
    const submitButton = form.querySelector('button[type="submit"]');

    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Get form data
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Get UTM parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');

    try {
      const response = await fetch(`${API_BASE}/api/forms/public/submit/${config.slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          utmSource,
          utmMedium,
          utmCampaign
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      // Show success message
      formMessage.className = 'bharat-form-success';
      formMessage.textContent = result.message;
      formMessage.style.display = 'block';

      // Reset form
      form.reset();

      // Redirect if configured
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 2000);
      }

      // Hide success message after 5 seconds
      setTimeout(() => {
        formMessage.style.display = 'none';
      }, 5000);

    } catch (error) {
      // Show error message
      formMessage.className = 'bharat-form-error';
      formMessage.textContent = error.message || 'An error occurred. Please try again.';
      formMessage.style.display = 'block';

      // Hide error message after 5 seconds
      setTimeout(() => {
        formMessage.style.display = 'none';
      }, 5000);
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = config.buttonText;
    }
  }
})();
