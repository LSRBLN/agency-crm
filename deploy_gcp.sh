#!/bin/bash
# One-Click Deployment to Google Cloud Run

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="agency-crm"
REGION="europe-west3"

echo "🚀 Starting Deployment to Google Cloud Run ($SERVICE_NAME)..."

# 1. Build and push image to Artifact Registry
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .

# 2. Deploy to Cloud Run
echo "🌍 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://$SERVICE_NAME-$PROJECT_ID.a.run.app"

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
