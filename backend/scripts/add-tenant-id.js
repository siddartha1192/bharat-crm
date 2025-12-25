const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Models that need tenantId
const modelsToUpdate = [
  'Contact', 'Invoice', 'Deal', 'Task', 'PipelineStage',
  'WhatsAppConversation', 'WhatsAppMessage', 'CalendarEvent', 'EmailLog',
  'AutomationRule', 'Document', 'SalesForecast', 'VectorDataUpload',
  'RevenueGoal', 'AIConversation', 'AIMessage', 'Campaign',
  'CampaignRecipient', 'CampaignLog', 'Form', 'FormSubmission', 'LandingPage'
];

// Add tenantId field and index to each model
modelsToUpdate.forEach(modelName => {
  // Pattern to find the model and its closing brace
  const modelRegex = new RegExp(
    `(model ${modelName} \\{[\\s\\S]*?)(\\n  // User relation[\\s\\S]*?)(\\n  @@)`,
    'g'
  );

  schema = schema.replace(modelRegex, (match, before, userRelation, indexes) => {
    // Check if tenantId already exists
    if (match.includes('tenantId')) {
      return match;
    }

    // Add tenantId before user relation
    const withTenantId = before + '\n  // Multi-tenant relationship\n  tenantId' +
      '          String\n' + userRelation + indexes;

    return withTenantId;
  });

  // Add index for tenantId
  const indexRegex = new RegExp(
    `(model ${modelName} \\{[\\s\\S]*?)(\\n\\}\\n)`,
    'g'
  );

  schema = schema.replace(indexRegex, (match, body, closing) => {
    // Check if tenantId index already exists
    if (match.includes('@@index([tenantId])')) {
      return match;
    }

    // Find the last @@index line
    const lastIndexPos = body.lastIndexOf('@@index');
    if (lastIndexPos === -1) {
      // No indexes, add before closing
      return body + '\n  @@index([tenantId])' + closing;
    }

    const beforeLastIndex = body.substring(0, lastIndexPos);
    const lastIndexLine = body.substring(lastIndexPos);
    const lineEnd = lastIndexLine.indexOf('\n');
    const afterLastIndex = lastIndexLine.substring(lineEnd);

    return beforeLastIndex + lastIndexLine.substring(0, lineEnd) +
      '\n  @@index([tenantId])' + afterLastIndex + closing;
  });
});

fs.writeFileSync(schemaPath, schema);
console.log('✓ Added tenantId to all models');
