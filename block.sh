#!/bin/bash
# Simple wrapper to block an address
# Usage: ./block.sh 0xAddress 0.0001

if [ -z "$1" ]; then
  echo "Usage: ./block.sh <address> [stake_amount]"
  echo "Example: ./block.sh 0xD3DfB1f144F548dE4e32166B9E5214691343D4F1 0.0001"
  exit 1
fi

ADDRESS=$1
STAKE=${2:-0.0001}

echo "Blocking $ADDRESS with $STAKE TRUST..."

SUSPECT_ADDRESS=$ADDRESS STAKE_AMOUNT=$STAKE npm run quick:block
