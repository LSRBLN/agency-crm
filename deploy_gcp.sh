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
# NOTE: The following secrets must be created in Google Secret Manager before deploying:
#   gcloud secrets create MONGODB_URI --data-file=-
#   gcloud secrets create GEMINI_API_KEY --data-file=-
#   gcloud secrets create JWT_SECRET --data-file=-
#   gcloud secrets create STRIPE_SECRET_KEY --data-file=-
#   gcloud secrets create SIMILARWEB_API_KEY --data-file=-
echo "🌍 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://$SERVICE_NAME-$PROJECT_ID.a.run.app" \
  --set-secrets=MONGODB_URI=MONGODB_URI:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,JWT_SECRET=JWT_SECRET:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,SIMILARWEB_API_KEY=SIMILARWEB_API_KEY:latest

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
