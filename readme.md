DOCUMENT INGESTION QA:
    This sample project is capable of ingesting the .txt files data from google drive stored in specific folder and make vector embeddings and store it in qdrant vector store,after this storing embedding user can use the api/ask endpoint which is able to answer questions based on the files we have ingested through google drive this is possible because we have created a MCP server which host the ingestDocuments tool which gets called by MCP client that will trigger ingestion process.

SETUP:
1.Download and install node,docker.
2.In the docker terminal run the below command to pull qdrant vectordb image.
    docker pull qdrant/qdrant
3.After completion run this below command:
    docker run -p 6333:6333 -p 6334:63342 qdrant/qdrant
4.Paste the credetials.json file into the root of the directory ( recieved from the email)
5.In .env file paste your openai api key.
6.Run "npm install" to install depedencies

USAGE:
1.Login test account gmail using the credentials recieved from the email.
2.Run "npm start" command in the terminal root of directory,this will start express and mcp server,mcp client.
3.After starting application for first time google oauth pop up will appear asking to sign in then select the test account.
4.Go to drive of the test account there you can see a test folder open that folder and upload files to test to ingest.
5.Open postman and paste this URL "http://localhost:3000/api/ask", and make it a POST request with body data as mentioned below:
{"question":"Ingest documents from Google Drive "} 
6.You will get response mentioning the number of files ingested,after you use the same api ("/api/ask") to ask questions against the files you have uploaded