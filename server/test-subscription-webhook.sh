#!/bin/bash

# Test script for Mercado Pago subscription webhooks
# This simulates webhook events sent by Mercado Pago

API_URL="http://localhost:3000"
TEST_USER_ID="test-user-123"
TEST_SUBSCRIPTION_ID="test-sub-456"
TEST_PAYMENT_ID="test-payment-789"

echo "=== Testing Mercado Pago Subscription Webhooks ==="
echo ""

# Test 1: Subscription created event
echo "1. Testing subscription created event..."
curl -X POST "${API_URL}/api/mercadopago-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "created",
    "type": "subscription_preapproval",
    "data": {
      "id": "'"${TEST_SUBSCRIPTION_ID}"'"
    }
  }'
echo -e "\n"

# Test 2: Subscription payment (recurring charge)
echo "2. Testing subscription payment event..."
curl -X POST "${API_URL}/api/mercadopago-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.created",
    "type": "payment",
    "data": {
      "id": "'"${TEST_PAYMENT_ID}"'"
    }
  }'
echo -e "\n"

# Test 3: Subscription updated event
echo "3. Testing subscription updated event..."
curl -X POST "${API_URL}/api/mercadopago-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "updated",
    "type": "subscription_preapproval",
    "data": {
      "id": "'"${TEST_SUBSCRIPTION_ID}"'"
    }
  }'
echo -e "\n"

echo "=== Webhook tests completed ==="
echo ""
echo "Note: These are test webhooks. For real testing:"
echo "1. Create a subscription using the app"
echo "2. Check Mercado Pago dashboard for webhook logs"
echo "3. Use ngrok or similar to expose localhost for webhook testing"
