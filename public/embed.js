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

  // Main initialization function
  function initializeForms() {
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
      const formWrapper = createFormElement(formConfig);
      container.appendChild(formWrapper);

      // Get the actual form element from the wrapper
      const actualForm = formWrapper.querySelector('form');

      // Add event listener for form submission
      actualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmission(actualForm, formConfig);
      });

    } catch (error) {
      console.error('Bharat Form Error:', error);
      container.innerHTML = `<p style="color: red;">Error loading form</p>`;
    }
  });
  }

  // Initialize forms when DOM is ready
  if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initializeForms);
  } else {
    // DOM is already ready, initialize immediately
    initializeForms();
  }

  function createFormElement(config) {
    const formWrapper = document.createElement('div');
    formWrapper.className = 'bharat-form-wrapper';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .bharat-form-wrapper {
        max-width: 600px;
        margin: 0 auto;
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .bharat-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2.5rem;
        background: linear-gradient(to bottom, #ffffff, #fafafa);
        border-radius: 16px;
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06),
          0 20px 25px -5px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.05);
        animation: slideInUp 0.5s ease-out;
        position: relative;
        overflow: hidden;
      }

      .bharat-form::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, ${config.primaryColor}, ${config.primaryColor}dd);
        border-radius: 16px 16px 0 0;
      }

      .bharat-form-title {
        font-size: 2rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.025em;
        line-height: 1.2;
      }

      .bharat-form-description {
        font-size: 1.05rem;
        color: #6b7280;
        margin: 0 0 2rem 0;
        line-height: 1.6;
      }

      .bharat-form-group {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }

      .bharat-form-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #374151;
        letter-spacing: 0.01em;
      }

      .bharat-form-label.required::after {
        content: ' *';
        color: #ef4444;
        font-weight: 700;
      }

      .bharat-form-input,
      .bharat-form-textarea {
        padding: 0.875rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 1rem;
        font-family: inherit;
        transition: all 0.2s ease;
        background-color: #ffffff;
        color: #1f2937;
      }

      .bharat-form-input:hover,
      .bharat-form-textarea:hover {
        border-color: #d1d5db;
      }

      .bharat-form-input:focus,
      .bharat-form-textarea:focus {
        outline: none;
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 4px ${config.primaryColor}15, 0 1px 2px rgba(0, 0, 0, 0.05);
        background-color: #ffffff;
        transform: translateY(-1px);
      }

      .bharat-form-input::placeholder,
      .bharat-form-textarea::placeholder {
        color: #9ca3af;
      }

      .bharat-form-textarea {
        min-height: 120px;
        resize: vertical;
        line-height: 1.6;
      }

      .bharat-form-button {
        padding: 1rem 2rem;
        background: linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}ee);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1.05rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow:
          0 4px 6px -1px ${config.primaryColor}40,
          0 2px 4px -1px ${config.primaryColor}30;
        letter-spacing: 0.025em;
        margin-top: 0.5rem;
        position: relative;
        overflow: hidden;
      }

      .bharat-form-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }

      .bharat-form-button:hover {
        transform: translateY(-2px);
        box-shadow:
          0 10px 15px -3px ${config.primaryColor}40,
          0 4px 6px -2px ${config.primaryColor}30;
      }

      .bharat-form-button:hover::before {
        left: 100%;
      }

      .bharat-form-button:active {
        transform: translateY(0);
      }

      .bharat-form-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .bharat-form-button:disabled:hover {
        transform: none;
      }

      .bharat-form-button-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }

      .bharat-form-success {
        padding: 1.25rem;
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
        border-radius: 12px;
        text-align: center;
        font-weight: 600;
        animation: fadeIn 0.3s ease-out;
        border: 2px solid #6ee7b7;
        box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        position: relative;
        padding-left: 3rem;
      }

      .bharat-form-success::before {
        content: '✓';
        position: absolute;
        left: 1.25rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.5rem;
        font-weight: bold;
        color: #059669;
      }

      .bharat-form-error {
        padding: 1.25rem;
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        color: #991b1b;
        border-radius: 12px;
        text-align: center;
        font-weight: 600;
        animation: fadeIn 0.3s ease-out;
        border: 2px solid #fca5a5;
        box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);
        position: relative;
        padding-left: 3rem;
      }

      .bharat-form-error::before {
        content: '⚠';
        position: absolute;
        left: 1.25rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.5rem;
        font-weight: bold;
        color: #dc2626;
      }

      @media (max-width: 640px) {
        .bharat-form {
          padding: 1.75rem;
          gap: 1.25rem;
        }

        .bharat-form-title {
          font-size: 1.5rem;
        }

        .bharat-form-description {
          font-size: 0.95rem;
        }

        .bharat-form-button {
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
        }
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

    // Disable submit button and show spinner
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="bharat-form-button-spinner"></span>Submitting...';

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
      submitButton.innerHTML = config.buttonText;
    }
  }
})();
