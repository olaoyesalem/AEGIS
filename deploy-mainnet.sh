#!/bin/bash
# Deploy Aegis Firewall to Intuition Mainnet
# Run from: /Users/nyxaris/Desktop/Projects/Aegis/AEGIS

set -e  # Exit on error

echo "🚀 Deploying AdaptiveImmuneFirewall to Intuition Mainnet..."
echo ""

# Check if we're in the right directory
if [ ! -f "hardhat.config.ts" ]; then
    echo "❌ Error: Must run from AEGIS directory"
    echo "   cd /Users/nyxaris/Desktop/Projects/Aegis/AEGIS"
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Create .env with:"
    echo "   PRIVATE_KEY=your_private_key_here"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Deploy using new unified script
echo "📝 Deploying contract to mainnet (Chain ID: 1155)..."
npx hardhat run scripts/deploy-intuition.ts --network intuitionMainnet

echo ""
echo "✅ Deployment complete!"
echo ""
echo "The deployed address is shown above and saved to:"
echo "   deployments/intuitionMainnet-AdaptiveImmuneFirewall.json"
echo ""
echo "🎉 Done!"
