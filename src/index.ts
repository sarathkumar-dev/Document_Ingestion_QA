import { openai } from "@ai-sdk/openai";
import { generateText, ToolSet } from "ai";
import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import {
  initCollection,
  getContent,
  upsertChunks,
  searchSimilar,
} from "./vectordb";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  authorize,
  embedTexts,
  ingestDocuments,
  listFiles,
  loadSavedCredentialsIfExist,
} from "./ingest";
import { z } from "zod";
const transport = new StdioClientTransport({
  command: "ts-node",
  args: ["./src/mcp.ts"], //
});
  (async ()=>await authorize())()

const client = new Client({
  name: "example-client",
  version: "1.0.0",
});

const ingestSchema = z.object({
  folderId: z.string().optional(),
});

// build the tool definition for the AI model
const tools = [
  {
    name: "ingest_documents",
    description: "Ingest files from a Google Drive folder into Vector DB",
    parameters: ingestSchema,
  },
];
const app = express();
(async () => await client.connect(transport))();
// await initCollection()
app.use(express.json());
app.get("/api/ingest", async (req: Request, res: Response) => {
  try {
    await initCollection();
    const authData = await authorize();
    const filesData = await listFiles(authData);
    const embeddings = await embedTexts(
      filesData.map((file: any) => file?.text)
    );
    await upsertChunks(filesData, embeddings);

    return res.status(200).send({ message: "SUCCESS" });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

app.post("/api/ask", async (req, res) => {
  const { question } = req.body;
  console.log(question);
  try {
    const embededQuestion = await embedTexts([question]);
    const simlarVectors = await searchSimilar(embededQuestion);

    const context = simlarVectors.map((h) => h.payload?.text).join(` 
      #####
      `);


    const ingestDocumentsSchema = z.object({
    });
    const tools: ToolSet = {
      ingest_documents: {
        description: "Ingest files from a Google Drive folder into Vector DB",
        parameters: ingestDocumentsSchema,
      },
    };
    const response = await generateText({
      model: openai("gpt-4o"),
      tools: tools,
      toolChoice: "auto",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Answer concisely and only based on the provided context.",
        },
        {
          role: "user",
          content: `Answer the question below using only the context provided.

Question: ${question}

Context:
${context}

If the context does not contain the answer, say "I don’t know based on the given context."`,
        },
      ],
    });

    if (response.toolCalls[0]?.toolName == "ingest_documents") {
      const result = await client.callTool({
        name: "ingest_documents",
        input: {},
      });

      return res.status(200).send({ result });
    }
    return res.status(200).send({ message: response.text });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/see", async (req: Request, res: Response) => {
  try {
    const collex = await getContent();
    // const tools = await client.listTools();
    console.log(tools);
    return res.status(200).send({ message: collex });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

app.listen(3000, async () => {
  console.log("App running in port 3000");

});
