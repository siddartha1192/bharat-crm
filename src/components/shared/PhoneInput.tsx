import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhoneInputProps {
  label: string;
  id: string;
  phoneValue: string;
  countryCodeValue: string;
  onPhoneChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', iso: 'IN' },
  { code: '+1', country: 'United States', flag: '🇺🇸', iso: 'US' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', iso: 'GB' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', iso: 'AU' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', iso: 'AE' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', iso: 'SG' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', iso: 'MY' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', iso: 'PK' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', iso: 'BD' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', iso: 'LK' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', iso: 'NP' },
  { code: '+86', country: 'China', flag: '🇨🇳', iso: 'CN' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', iso: 'JP' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷', iso: 'KR' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', iso: 'DE' },
  { code: '+33', country: 'France', flag: '🇫🇷', iso: 'FR' },
  { code: '+39', country: 'Italy', flag: '🇮🇹', iso: 'IT' },
  { code: '+34', country: 'Spain', flag: '🇪🇸', iso: 'ES' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', iso: 'BR' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽', iso: 'MX' },
  { code: '+7', country: 'Russia', flag: '🇷🇺', iso: 'RU' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', iso: 'ZA' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', iso: 'NG' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', iso: 'EG' },
];

export function PhoneInput({
  label,
  id,
  phoneValue,
  countryCodeValue,
  onPhoneChange,
  onCountryCodeChange,
  required = false,
  placeholder = '',
  disabled = false,
  error
}: PhoneInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2">
        <Select
          value={countryCodeValue}
          onValueChange={onCountryCodeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px] border-2 focus:border-blue-500 rounded-lg">
            <SelectValue placeholder="Code" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.iso} value={country.code}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          value={phoneValue}
          onChange={(e) => onPhoneChange(e.target.value)}
          required={required}
          placeholder={placeholder || '9876543210'}
          disabled={disabled}
          className={`flex-1 border-2 focus:border-blue-500 rounded-lg ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-gray-500">
        Enter phone number without country code
      </p>
    </div>
  );
}

export { COUNTRY_CODES };
