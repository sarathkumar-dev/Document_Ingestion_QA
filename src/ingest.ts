import fs from "fs/promises";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { openai } from "@ai-sdk/openai";
import {
  initCollection,
  getContent,
  upsertChunks,
  searchSimilar,
} from "./vectordb";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();
export async function ingestDocuments(folderId: string="14Hz-0mXukt5P5XWeqRr7xVpuWE962kNI") {
    if(!folderId){
        folderId="14Hz-0mXukt5P5XWeqRr7xVpuWE962kNI"
    }
  await initCollection();
  const authData = await authorize();
  const filesData = await listFiles(authData, folderId);
  const embeddings = await embedTexts(
    filesData.map((file: any) => file?.text)
  );
  await upsertChunks(filesData, embeddings);
  return { success: true, filesCount: filesData.length };
}

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
export async function loadSavedCredentialsIfExist() {
  try {
    const content: any = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
export async function saveCredentials(client: any) {
  const content: any = await fs.readFile(CREDENTIALS_PATH); //This may causes error so please notice it
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export async function authorize() {
  let client: any = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client?.credentials) {
    await saveCredentials(client);
  }
  return client;
}
export async function embedTexts(texts: string[]): Promise<any[]> {
  const embeddings: number[][] = [];
  //   for (const text of texts) {
  //     embeddings.push(vector);
  //   }
  console.log(texts, "Here is yexy");

  const vector = await openai
    .embedding("text-embedding-3-large")
    .doEmbed({ values: texts });
  return vector.embeddings;
}
/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
export async function listFiles(
  authClient: any,
  folderId = "14Hz-0mXukt5P5XWeqRr7xVpuWE962kNI"
) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='text/plain'`,
    fields: "files(id,name)",
  });

  const files = res.data.files;
  if (files?.length === 0 || !files) {
    console.log("No files found.");
    return;
  }

  files?.map((file: any) => {
    console.log(`${file.name} (${file.id})`);
  });

  const results: any = [];
  for (const f of files) {
    const resp = await drive.files.get(
      { fileId: f.id!, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const text = Buffer.from(resp.data as ArrayBuffer).toString("utf-8");
    results.push({ id: uuidv4(), name: f.name!, text });
  }
  return results;
}
