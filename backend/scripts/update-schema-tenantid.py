#!/usr/bin/env python3
import re

# Read the schema file
schema_path = '/home/user/bharat-crm/backend/prisma/schema.prisma'
with open(schema_path, 'r') as f:
    content = f.read()

# Models that need tenantId (excluding ones already updated)
models_to_update = [
    'Invoice', 'Deal', 'Task', 'PipelineStage',
    'WhatsAppConversation', 'WhatsAppMessage', 'CalendarEvent', 'EmailLog',
    'AutomationRule', 'Document', 'SalesForecast', 'VectorDataUpload',
    'RevenueGoal', 'AIConversation', 'AIMessage', 'Campaign',
    'CampaignRecipient', 'CampaignLog', 'Form', 'FormSubmission', 'LandingPage'
]

for model in models_to_update:
    # Find the model block
    model_pattern = rf'(model {model} {{.*?)(  // User relation.*?)(  @@)'

    def replace_model(match):
        before = match.group(1)
        user_relation = match.group(2)
        indexes = match.group(3)

        # Check if tenantId already exists
        if 'tenantId' in before or 'tenantId' in user_relation:
            return match.group(0)

        # Add tenantId before user relation
        tenant_field = '\n  // Multi-tenant relationship\n  tenantId        String\n\n'
        return before + tenant_field + user_relation + indexes

    content = re.sub(model_pattern, replace_model, content, flags=re.DOTALL)

    # Add index for tenantId
    index_pattern = rf'(model {model} {{.*?)(  @@index\([^\)]+\)\n)(}})'

    def add_index(match):
        before = match.group(1)
        last_index = match.group(2)
        closing = match.group(3)

        # Check if tenantId index already exists
        if '@@index([tenantId])' in before + last_index:
            return match.group(0)

        # Add tenantId index after last index
        return before + last_index + '  @@index([tenantId])\n' + closing

    content = re.sub(index_pattern, add_index, content, flags=re.DOTALL)

# Write back
with open(schema_path, 'w') as f:
    f.write(content)

print('✓ Added tenantId to all models')
