#!/bin/bash

# Default values
URL="http://localhost:3000/api/mercadopago-webhook"
USER_ID="test-user-id"
PLAN_ID="pro"

# Mock Payload matching Mercado Pago structure
PAYLOAD=$(cat <<EOF
{
  "type": "payment",
  "data": {
    "id": "123456789"
  },
  "action": "payment.created",
  "date_created": "2023-01-01T10:00:00Z",
  "user_id": 123456789,
  "live_mode": true,
  "application_id": "123123",
  "version": "v1"
}
EOF
)

echo "Sending mock webhook to $URL..."
echo "Payload: $PAYLOAD"

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo -e "\n\nDone. Check server logs for output."
