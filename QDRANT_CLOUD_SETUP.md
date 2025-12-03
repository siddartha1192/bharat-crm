# Qdrant Cloud Setup Guide (Free Tier)

## Step 1: Create Qdrant Cloud Account

1. Go to: https://cloud.qdrant.io/
2. Click "Sign Up" or "Get Started"
3. Create account (you can use Google/GitHub sign-in)
4. Verify your email

## Step 2: Create a Free Cluster

1. After logging in, click "Create Cluster"
2. Choose:
   - **Cluster Name:** bharat-crm (or any name)
   - **Cloud Provider:** Any (AWS/GCP/Azure)
   - **Region:** Choose closest to your location (e.g., us-east for USA, eu-west for Europe, ap-south for India)
   - **Configuration:** Select **FREE tier** (1GB RAM, 1 vCPU)
3. Click "Create"
4. Wait 1-2 minutes for cluster to be ready

## Step 3: Get Your Cluster URL and API Key

1. Once cluster is ready, click on it
2. You'll see:
   - **Cluster URL:** Something like `https://xyz-abc.eu-central.aws.cloud.qdrant.io:6333`
   - **API Key:** Click "Show" to reveal it (looks like: `qdrant_abc123xyz...`)

## Step 4: Update Your .env File

Copy your Cluster URL and API Key, then add to `.env`:

```env
# Qdrant Cloud Configuration
QDRANT_URL=https://your-cluster.region.cloud.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here
```

**Example:**
```env
QDRANT_URL=https://xyz-abc.eu-central.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=qdrant_abc123xyz...
```

## Step 5: Also Add Your OpenAI API Key

```env
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

## Step 6: Test the Setup

Run the ingestion script:

```bash
node scripts/ingestDocuments.js --clear
```

You should see:
- ✅ Connection to Qdrant Cloud
- ✅ Collection created
- ✅ Documents ingested
- ✅ Stats displayed

## Qdrant Cloud Free Tier Limits

- **Storage:** 1GB
- **RAM:** 1GB
- **Vectors:** ~100,000 vectors (1536 dimensions)
- **Requests:** Unlimited
- **Cost:** FREE forever

This is more than enough for your CRM knowledge base!

## Troubleshooting

### Connection Timeout
- Check your QDRANT_URL includes the port `:6333`
- Verify your firewall allows outbound HTTPS connections

### 401 Unauthorized
- Double-check your QDRANT_API_KEY is correct
- Make sure there are no extra spaces in the .env file

### Collection Already Exists
- This is fine! The system will use the existing collection
- Use `--clear` flag to recreate: `node scripts/ingestDocuments.js --clear`
