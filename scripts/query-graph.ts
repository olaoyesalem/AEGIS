/*
  Query Graph Script
  ------------------
  Fetch recent atoms & triples from Intuition GraphQL API for monitoring emerging threats.
*/
import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';
dotenv.config();

const ENDPOINT = process.env.INTUITION_GRAPHQL_URL || 'https://testnet.intuition.sh/v1/graphql';

const client = new GraphQLClient(ENDPOINT);

const RECENT_TRIPLES = gql`
  query RecentTriples($limit: Int!) {
    triples(limit: $limit, order_by: { created_at: desc }) {
      id
      vault_id
      created_at
      block_number
      subject_atom { label term_id }
      predicate_atom { label term_id }
      object_atom { label term_id }
    }
  }
`;

async function main() {
  const limit = Number(process.env.RECENT_TRIPLES_LIMIT || 5);
  const data = await client.request(RECENT_TRIPLES, { limit });
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error('Graph query failed:', e);
  process.exit(1);
});
