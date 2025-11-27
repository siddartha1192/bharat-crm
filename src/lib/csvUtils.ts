import { Lead } from '@/types/lead';
import { Contact } from '@/types/contact';

// Export leads to CSV
export function exportLeadsToCSV(leads: Lead[], filename: string = 'leads.csv') {
  const headers = [
    'Name',
    'Company',
    'Email',
    'Phone',
    'WhatsApp',
    'Source',
    'Status',
    'Priority',
    'Estimated Value',
    'Assigned To',
    'Notes',
    'Tags',
    'Website',
    'LinkedIn',
    'Twitter',
    'Facebook',
    'Created At',
  ];

  const rows = leads.map(lead => [
    lead.name,
    lead.company,
    lead.email,
    lead.phone,
    lead.whatsapp || '',
    lead.source,
    lead.status,
    lead.priority,
    lead.estimatedValue.toString(),
    lead.assignedTo,
    lead.notes,
    lead.tags.join('; '),
    lead.website || '',
    lead.linkedIn || '',
    lead.twitter || '',
    lead.facebook || '',
    lead.createdAt.toISOString(),
  ]);

  downloadCSV([headers, ...rows], filename);
}

// Export contacts to CSV
export function exportContactsToCSV(contacts: Contact[], filename: string = 'contacts.csv') {
  const headers = [
    'Name',
    'Company',
    'Designation',
    'Email',
    'Phone',
    'Alternate Phone',
    'WhatsApp',
    'Type',
    'Industry',
    'Company Size',
    'GST Number',
    'PAN Number',
    'Street',
    'City',
    'State',
    'Pincode',
    'Country',
    'Website',
    'LinkedIn',
    'Assigned To',
    'Lifetime Value',
    'Notes',
    'Tags',
    'Created At',
  ];

  const rows = contacts.map(contact => [
    contact.name,
    contact.company,
    contact.designation,
    contact.email,
    contact.phone,
    contact.alternatePhone || '',
    contact.whatsapp || '',
    contact.type,
    contact.industry,
    contact.companySize,
    contact.gstNumber || '',
    contact.panNumber || '',
    contact.address.street,
    contact.address.city,
    contact.address.state,
    contact.address.pincode,
    contact.address.country,
    contact.website || '',
    contact.linkedIn || '',
    contact.assignedTo,
    contact.lifetimeValue.toString(),
    contact.notes,
    contact.tags.join('; '),
    contact.createdAt.toISOString(),
  ]);

  downloadCSV([headers, ...rows], filename);
}

// Helper function to download CSV
function downloadCSV(data: string[][], filename: string) {
  const csvContent = data
    .map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse CSV file
export function parseCSV(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      const data: string[][] = [];

      for (const line of lines) {
        const row: string[] = [];
        let currentCell = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              currentCell += '"';
              i++; // Skip next quote
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            row.push(currentCell);
            currentCell = '';
          } else {
            currentCell += char;
          }
        }

        row.push(currentCell);
        data.push(row);
      }

      resolve(data);
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Import leads from CSV
export async function importLeadsFromCSV(file: File): Promise<Lead[]> {
  const data = await parseCSV(file);
  const [headers, ...rows] = data;

  // Map headers to indices
  const headerMap = new Map(headers.map((h, i) => [h.toLowerCase().trim(), i]));

  const leads: Lead[] = rows.map((row, index) => {
    const getValue = (key: string) => {
      const idx = headerMap.get(key.toLowerCase());
      return idx !== undefined ? row[idx]?.trim() : '';
    };

    return {
      id: `L${Date.now()}-${index}`,
      name: getValue('name') || 'Unknown',
      company: getValue('company') || 'Unknown',
      email: getValue('email') || '',
      phone: getValue('phone') || '',
      whatsapp: getValue('whatsapp') || undefined,
      source: (getValue('source') || 'web-form') as any,
      status: (getValue('status') || 'new') as any,
      priority: (getValue('priority') || 'medium') as any,
      estimatedValue: parseInt(getValue('estimated value')) || 0,
      assignedTo: getValue('assigned to') || '',
      notes: getValue('notes') || '',
      tags: getValue('tags').split(';').map(t => t.trim()).filter(t => t),
      website: getValue('website') || undefined,
      linkedIn: getValue('linkedin') || undefined,
      twitter: getValue('twitter') || undefined,
      facebook: getValue('facebook') || undefined,
      createdAt: getValue('created at') ? new Date(getValue('created at')) : new Date(),
    };
  });

  return leads;
}

// Import contacts from CSV
export async function importContactsFromCSV(file: File): Promise<Contact[]> {
  const data = await parseCSV(file);
  const [headers, ...rows] = data;

  // Map headers to indices
  const headerMap = new Map(headers.map((h, i) => [h.toLowerCase().trim(), i]));

  const contacts: Contact[] = rows.map((row, index) => {
    const getValue = (key: string) => {
      const idx = headerMap.get(key.toLowerCase());
      return idx !== undefined ? row[idx]?.trim() : '';
    };

    return {
      id: `C${Date.now()}-${index}`,
      name: getValue('name') || 'Unknown',
      company: getValue('company') || 'Unknown',
      designation: getValue('designation') || '',
      email: getValue('email') || '',
      phone: getValue('phone') || '',
      alternatePhone: getValue('alternate phone') || undefined,
      whatsapp: getValue('whatsapp') || undefined,
      type: (getValue('type') || 'prospect') as any,
      industry: (getValue('industry') || 'other') as any,
      companySize: getValue('company size') || '',
      gstNumber: getValue('gst number') || undefined,
      panNumber: getValue('pan number') || undefined,
      address: {
        street: getValue('street') || '',
        city: getValue('city') || '',
        state: getValue('state') || '',
        pincode: getValue('pincode') || '',
        country: getValue('country') || 'India',
      },
      website: getValue('website') || undefined,
      linkedIn: getValue('linkedin') || undefined,
      notes: getValue('notes') || '',
      assignedTo: getValue('assigned to') || '',
      lifetimeValue: parseInt(getValue('lifetime value')) || 0,
      tags: getValue('tags').split(';').map(t => t.trim()).filter(t => t),
      createdAt: getValue('created at') ? new Date(getValue('created at')) : new Date(),
      updatedAt: new Date(),
    };
  });

  return contacts;
}
