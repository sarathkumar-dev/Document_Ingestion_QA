import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {  ingestDocuments} from "./ingest"; // implement your ingest logic
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

const server = new Server(
  { name: "doc-rag", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
const ingestSchema = z.object({
  // folderId: z.string().optional()
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "ingest_documents",
    description: "Ingest files from a Google Drive folder into Vector DB",
    inputSchema: zodToJsonSchema(ingestSchema)
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "ingest_documents") {
    throw new Error("Unknown tool");
  }
  const result = await ingestDocuments();
  return { content: [{ type: "text", text: `Files Count:${result.filesCount}` }] };
});

 (async ()=>await server.connect(new StdioServerTransport()))();
console.error("MCP server running (stdio ready)");