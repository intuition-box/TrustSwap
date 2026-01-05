const GRAPHQL_URL =
  import.meta.env.VITE_INDEXER_GRAPHQL_URL ?? "http://localhost:8080/v1/graphql";

type GraphQLRequestOptions<V> = {
  query: string;
  variables?: V;
};

export async function graphqlRequest<TData, TVars = Record<string, unknown>>(
  options: GraphQLRequestOptions<TVars>,
): Promise<TData> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: options.query,
      variables: options.variables ?? {},
    }),
  });
console.log("[GraphQL] Query:", options.query);
console.log("[GraphQL] Variables:", options.variables);

  if (!res.ok) {
    throw new Error(`GraphQL request failed with status ${res.status}`);
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0].message ?? "GraphQL error");
  }

  return json.data as TData;
}
