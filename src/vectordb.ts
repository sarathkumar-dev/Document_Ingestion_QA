import { QdrantClient } from "@qdrant/qdrant-js";
const client = new QdrantClient({ url: "http://localhost:6333" });
const COLLECTION = "documents";
export async function initCollection() {
  const iscollectionExists = await client.collectionExists(COLLECTION);
  if (!iscollectionExists.exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: 3072, distance: "Cosine" },
    });
    await client.createPayloadIndex(COLLECTION, {
      field_name: "text",
      field_schema: "keyword",
      wait: true,
    });
  }
}
export async function upsertChunks(
  chunks: { id: string; text: string }[],
  embeddings: number[][]
) {
  const points = chunks.map((c, i) => ({
    id: c.id,
    vector: embeddings[i],
    payload: { text: c.text },
  }));
  const inserted=await client.upsert(COLLECTION, {
    wait: true,
    points,
  });
console.log("Document inserted into vector db:",inserted.status)
}
export async function searchSimilar(queryEmbedding: number[], topK = 5) {
  const result = await client.search(COLLECTION, {
    vector: queryEmbedding.flat(),
    limit: topK
  });
  return result;
}
export async function getContent(
) {

const res = await client.scroll(COLLECTION, {
      limit: 100, // max per call is 1000
      offset:0,
      with_payload: true,
      with_vector: true,
    });  console.log(res)
  return res
}



