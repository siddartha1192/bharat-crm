const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Normalize a phone number to E.164 format
 * @param {string} phoneNumber - The phone number to normalize
 * @param {string} countryCode - The country code (e.g., '+91', 'IN')
 * @returns {Object} { normalized: string|null, isValid: boolean, error: string|null }
 */
function normalizePhoneNumber(phoneNumber, countryCode = '+91') {
  if (!phoneNumber) {
    return { normalized: null, isValid: false, error: 'Phone number is required' };
  }

  try {
    // Remove all whitespace and special characters except + and digits
    let cleanedNumber = phoneNumber.trim();

    // Extract country code if it's in the format like '+91' or 'IN'
    let country = 'IN'; // Default to India

    if (countryCode) {
      // If countryCode is like '+91', extract 'IN' country code
      if (countryCode.startsWith('+')) {
        // Try to parse the country from the code
        const tempNumber = countryCode + '9999999999'; // Dummy number to extract country
        try {
          const parsed = parsePhoneNumber(tempNumber);
          if (parsed && parsed.country) {
            country = parsed.country;
          }
        } catch (e) {
          // If parsing fails, use default
        }
      } else if (countryCode.length === 2) {
        // Already a country code like 'IN'
        country = countryCode.toUpperCase();
      }
    }

    // If number already has +, try parsing directly
    if (cleanedNumber.startsWith('+')) {
      const parsed = parsePhoneNumber(cleanedNumber);
      if (parsed && parsed.isValid()) {
        return {
          normalized: parsed.format('E.164'),
          isValid: true,
          error: null,
          country: parsed.country
        };
      }
    }

    // Try parsing with country
    const parsed = parsePhoneNumber(cleanedNumber, country);

    if (parsed && parsed.isValid()) {
      return {
        normalized: parsed.format('E.164'),
        isValid: true,
        error: null,
        country: parsed.country
      };
    }

    return {
      normalized: null,
      isValid: false,
      error: 'Invalid phone number format'
    };
  } catch (error) {
    return {
      normalized: null,
      isValid: false,
      error: error.message || 'Failed to parse phone number'
    };
  }
}

/**
 * Validate if a phone number is valid
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} countryCode - The country code (e.g., '+91', 'IN')
 * @returns {boolean}
 */
function validatePhoneNumber(phoneNumber, countryCode = '+91') {
  const result = normalizePhoneNumber(phoneNumber, countryCode);
  return result.isValid;
}

/**
 * Extract country code from normalized phone number
 * @param {string} normalizedPhone - E.164 formatted phone number
 * @returns {string|null}
 */
function extractCountryCode(normalizedPhone) {
  if (!normalizedPhone || !normalizedPhone.startsWith('+')) {
    return null;
  }

  try {
    const parsed = parsePhoneNumber(normalizedPhone);
    if (parsed && parsed.country) {
      return `+${parsed.countryCallingCode}`;
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - The phone number
 * @param {string} countryCode - The country code
 * @returns {string}
 */
function formatPhoneNumber(phoneNumber, countryCode = '+91') {
  try {
    const result = normalizePhoneNumber(phoneNumber, countryCode);
    if (result.isValid && result.normalized) {
      const parsed = parsePhoneNumber(result.normalized);
      return parsed.formatInternational();
    }
  } catch (error) {
    // Ignore formatting errors
  }

  return phoneNumber; // Return original if formatting fails
}

/**
 * Get country calling code from country ISO code
 * @param {string} countryIso - Country ISO code (e.g., 'IN', 'US')
 * @returns {string} Country calling code with + prefix (e.g., '+91')
 */
function getCountryCallingCode(countryIso) {
  const countryCallingCodes = {
    'IN': '+91',   // India
    'US': '+1',    // United States
    'GB': '+44',   // United Kingdom
    'AU': '+61',   // Australia
    'CA': '+1',    // Canada
    'AE': '+971',  // UAE
    'SG': '+65',   // Singapore
    'MY': '+60',   // Malaysia
    'PK': '+92',   // Pakistan
    'BD': '+880',  // Bangladesh
    'LK': '+94',   // Sri Lanka
    'NP': '+977',  // Nepal
    'CN': '+86',   // China
    'JP': '+81',   // Japan
    'KR': '+82',   // South Korea
    'DE': '+49',   // Germany
    'FR': '+33',   // France
    'IT': '+39',   // Italy
    'ES': '+34',   // Spain
    'BR': '+55',   // Brazil
    'MX': '+52',   // Mexico
    'RU': '+7',    // Russia
    'ZA': '+27',   // South Africa
    'NG': '+234',  // Nigeria
    'EG': '+20',   // Egypt
  };

  return countryCallingCodes[countryIso.toUpperCase()] || '+91';
}

module.exports = {
  normalizePhoneNumber,
  validatePhoneNumber,
  extractCountryCode,
  formatPhoneNumber,
  getCountryCallingCode
};
