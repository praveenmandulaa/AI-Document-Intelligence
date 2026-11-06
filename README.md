# AI Document Intelligence System

A full-stack application that lets authenticated users upload PDF
documents, search their contents by meaning, and ask natural-language
questions. The question-answering feature uses Retrieval-Augmented
Generation (RAG): the backend retrieves relevant passages from the
user's indexed documents and sends those passages to Google Gemini to
generate a grounded answer with source references.

> **Project status:** PDF upload, document management, chunking,
> embeddings, pgvector semantic search, authentication, and the Phase 6
> Gemini question-answering integration have been implemented. The
> Gemini model must be available to the API key/project being used. The
> model name previously returned by the provider in this project was
> `gemini-3.8-flash`; verify current model availability in Google AI
> Studio before using it.

------------------------------------------------------------------------

## 1. What the application does

The application is designed to reduce the time spent manually searching
through long PDF files.

A user can:

1.  Register and sign in.
2.  Upload PDF documents.
3.  Extract and store text from each PDF.
4.  Index a document to split its text into overlapping chunks and
    generate vector embeddings.
5.  Search indexed documents using natural-language queries.
6.  Ask questions about the uploaded documents.
7.  Review the passages and page references used to generate an answer.
8.  View or delete uploaded documents.

### Example

A user uploads an employee handbook and asks:

> How many days of annual leave are employees entitled to?

The application converts the question into an embedding, retrieves
relevant passages from the indexed handbook, and gives those passages to
Gemini. Gemini generates an answer using the retrieved context. The
response includes source details such as the filename, page number, and
source label.

The application is a general PDF knowledge assistant. It does not
automatically guarantee that every answer is correct; users should
verify important answers against the cited source passages.

------------------------------------------------------------------------

## 2. Technology stack

  ------------------------------------------------------------------------------------------
  Layer                   Technology                                 Purpose
  ----------------------- ------------------------------------------ -----------------------
  Frontend                React                                      User interface

  Frontend language       TypeScript                                 Type safety

  Frontend tooling        Vite                                       Development server and
                                                                     build tooling

  Routing                 React Router                               Frontend navigation

  HTTP client             Axios                                      Calls FastAPI endpoints

  Icons                   Lucide React                               Interface icons

  Backend                 Python                                     Application logic

  API framework           FastAPI                                    REST API

  ASGI server             Uvicorn                                    Runs the FastAPI
                                                                     application

  ORM                     SQLAlchemy                                 Database access and
                                                                     models

  Migrations              Alembic                                    Database schema
                                                                     versioning

  Database                PostgreSQL 18                              Users, documents,
                                                                     pages, and chunks

  Vector extension        pgvector                                   Stores and searches
                                                                     embeddings

  PDF processing          PyMuPDF                                    Extracts text from PDF
                                                                     pages

  Embeddings              Sentence Transformers                      Converts text into
                                                                     vectors

  Embedding model         `sentence-transformers/all-MiniLM-L6-v2`   Generates
                                                                     384-dimensional
                                                                     embeddings

  LLM                     Google Gemini API                          Generates answers from
                                                                     retrieved context

  Gemini SDK              `google-genai`                             Python integration with
                                                                     Gemini

  Authentication          JWT                                        Secures protected API
                                                                     endpoints

  Password hashing        Argon2                                     Stores password hashes
                                                                     safely
  ------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 3. Architecture

### Document indexing pipeline

``` text
React frontend
    |
    | Upload PDF
    v
FastAPI document endpoint
    |
    v
PyMuPDF text extraction
    |
    v
Store document metadata and page text
    |
    v
Split page text into overlapping chunks
    |
    v
Sentence Transformers
    |
    v
Generate 384-dimensional embeddings
    |
    v
PostgreSQL + pgvector
    |
    v
Indexed document chunks
```

### Question-answering (RAG) pipeline

``` text
User asks a question
    |
    v
FastAPI /qa/ask endpoint
    |
    v
Generate question embedding
    |
    v
pgvector cosine-distance search
    |
    v
Retrieve the most relevant document chunks
    |
    v
Build context with source labels
    |
    v
Google Gemini API
    |
    v
Generate context-grounded answer
    |
    v
Return answer + source metadata
    |
    v
React displays answer and sources
```

### What is RAG?

RAG means **Retrieval-Augmented Generation**.

It combines two operations:

-   **Retrieval:** Find relevant information from the documents using
    vector similarity search.
-   **Generation:** Give the retrieved information and the user's
    question to an LLM so it can compose an answer.

The LLM is not expected to search the user's PostgreSQL database itself.
FastAPI retrieves the relevant passages first and includes them in the
prompt sent to Gemini.

------------------------------------------------------------------------

## 4. Project structure

The main project folders are:

``` text
AI-Document-Intelligence/
|
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   |-- routes/
|   |   |   |   |-- auth.py
|   |   |   |   |-- documents.py
|   |   |   |   |-- search.py
|   |   |   |   |-- qa.py
|   |   |   |
|   |   |   |-- deps.py
|   |   |
|   |   |-- core/
|   |   |-- db/
|   |   |-- models/
|   |   |   |-- user.py
|   |   |   |-- document.py
|   |   |   |-- document_chunk.py
|   |   |
|   |   |-- schemas/
|   |   |-- services/
|   |   |   |-- pdf_service.py
|   |   |   |-- chunking_service.py
|   |   |   |-- embedding_service.py
|   |   |   |-- gemini_service.py
|   |   |
|   |   |-- main.py
|   |
|   |-- alembic/
|   |-- storage/
|   |   |-- uploads/
|   |
|   |-- .venv/
|   |-- .env
|   |-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- App.tsx
|   |   |-- App.css
|   |
|   |-- .env
|   |-- package.json
|
|-- README.md
```

The exact folder and file names may differ slightly as the project
evolves. Keep secrets and local environment files out of source control.

------------------------------------------------------------------------

## 5. Prerequisites

Install the following before running the application:

-   Windows 10 or Windows 11
-   Python 3.13 (the project was developed with Python 3.13.14)
-   Node.js and npm (the project was developed with Node.js 24)
-   PostgreSQL 18
-   pgvector extension compatible with the installed PostgreSQL version
-   Git (optional, but recommended)
-   A Google AI Studio API key with access to a supported Gemini model

The project was developed on Windows with PostgreSQL installed under:

``` text
E:\Program Files\PostgreSQL\18
```

Your installation path may be different.

------------------------------------------------------------------------

## 6. Database setup

### 6.1 Create the database

Open pgAdmin or connect using `psql`, then execute:

``` sql
CREATE DATABASE ai_document_db;
```

Connect to `ai_document_db` and enable pgvector:

``` sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify that the extension is installed:

``` sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

The document chunk embedding column is configured for 384 dimensions to
match `all-MiniLM-L6-v2`.

Example verification query:

``` sql
SELECT
    column_name,
    udt_name
FROM information_schema.columns
WHERE table_name = 'document_chunks'
  AND column_name = 'embedding';
```

### 6.2 Configure the database connection

The backend `.env` must contain the database URL expected by the
project's SQLAlchemy settings. For example:

``` env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/ai_document_db
```

Use the database username and password configured on your machine. Do
not commit real credentials.

If your project uses a different environment variable name or PostgreSQL
driver, retain the name and driver expected by `app/db` and
`alembic/env.py`.

------------------------------------------------------------------------

## 7. Backend setup

Open PowerShell:

``` powershell
cd E:\Projects\AI-Document-Intelligence\backend
```

### 7.1 Create a virtual environment

If `.venv` does not already exist:

``` powershell
python -m venv .venv
```

### 7.2 Activate the virtual environment

``` powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

The prompt should show `(.venv)`.

### 7.3 Install Python dependencies

``` powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The main libraries include FastAPI, Uvicorn, SQLAlchemy, Alembic,
psycopg, pgvector, PyMuPDF, Sentence Transformers, python-dotenv,
JWT/password-hashing dependencies, and `google-genai`.

If `requirements.txt` does not yet include a required package, install
it in the active virtual environment and add it to the requirements
file. For example:

``` powershell
pip install google-genai
```

### 7.4 Configure backend environment variables

Create or edit:

``` text
backend/.env
```

Example template:

``` env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/ai_document_db

GEMINI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
GEMINI_MODEL=YOUR_AVAILABLE_GEMINI_MODEL
```

For this project, the provider error previously recommended
`gemini-3.8-flash`. Confirm that the model is currently available to
your Google AI Studio project and API key. Do not assume a model name is
available merely because it appears in an older code sample.

**Security:** - Never paste API keys into source code. - Never commit
`.env` to Git. - If an API key has been exposed, revoke it and create a
replacement. - Do not print the full key in terminal logs or share it in
screenshots.

### 7.5 Run database migrations

From the backend directory, with `.venv` activated:

``` powershell
alembic upgrade head
```

This applies the project's existing Alembic migrations. If the database
is already migrated, Alembic should report that it is up to date.

### 7.6 Start the backend

``` powershell
python -m uvicorn app.main:app --reload --port 8000
```

Backend:

``` text
http://127.0.0.1:8000
```

Swagger API documentation:

``` text
http://127.0.0.1:8000/docs
```

Health endpoint:

``` text
http://127.0.0.1:8000/api/v1/health
```

Keep this PowerShell terminal open while using the application.

------------------------------------------------------------------------

## 8. Frontend setup

Open a **second PowerShell terminal**.

``` powershell
cd E:\Projects\AI-Document-Intelligence\frontend
```

Install dependencies:

``` powershell
npm install
```

Create or edit:

``` text
frontend/.env
```

Add:

``` env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Start the Vite development server:

``` powershell
npm run dev
```

Open the URL printed by Vite. The configured local frontend URL is:

``` text
http://localhost:5173
```

Keep the frontend terminal open as well.

If you change a Vite environment variable, restart the frontend
development server so the new value is loaded.

------------------------------------------------------------------------

## 9. Running the application every day

Start two PowerShell terminals.

### Terminal 1 --- Backend

``` powershell
cd E:\Projects\AI-Document-Intelligence\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2 --- Frontend

``` powershell
cd E:\Projects\AI-Document-Intelligence\frontend
npm run dev
```

Then open:

``` text
http://localhost:5173
```

Make sure PostgreSQL is running before starting the backend.

------------------------------------------------------------------------

## 10. How to use the application

### Step 1 --- Register and log in

-   Open the frontend.
-   Create an account using the registration page.
-   Sign in.
-   The frontend stores the JWT access token in `sessionStorage`.
-   The shared Axios client adds the token as a Bearer token to
    protected API requests.

### Step 2 --- Upload a PDF

-   Open the Documents page.
-   Choose a PDF file and upload it.
-   The backend validates the file, extracts page text using PyMuPDF,
    and stores document metadata and page content.
-   The current upload implementation has a 10 MB PDF size limit and a
    200-page limit.

### Step 3 --- Index the PDF

-   Select the uploaded document's Index action.
-   The backend splits page text into overlapping chunks.
-   The current chunking configuration uses approximately 900 characters
    per chunk with 150 characters of overlap.
-   Sentence Transformers creates a 384-dimensional embedding for each
    chunk.
-   The chunks and embeddings are stored in PostgreSQL using pgvector.

Uploading a PDF and indexing it are separate operations. A document must
be indexed before it can be used for semantic search or question
answering.

### Step 4 --- Use Semantic Search

-   Open Semantic Search.
-   Enter a natural-language query.
-   Optionally select a particular document.
-   Choose the number of results (Top K).
-   Review matching passages, document names, page numbers, and
    similarity scores.

Semantic search compares the meaning of the query with the stored chunk
embeddings. It is not simply a keyword search.

### Step 5 --- Ask questions about documents

-   Open the Document Q&A / Question Answering page, when that frontend
    page is present and connected to `/api/v1/qa/ask`.
-   Enter a question about the indexed documents.
-   Optionally select a document if the UI supports document filtering.
-   Submit the question.
-   Review the generated answer and its source passages.

The backend retrieves the most relevant chunks belonging to the
authenticated user and supplies them to Gemini as context. The prompt
instructs Gemini to answer only from the supplied context and refer to
source labels such as `[S1]` and `[S2]`.

### Step 6 --- Review and verify sources

Check the returned filename, page number, chunk index, and passage.
Verify important information against the original PDF. Similarity scores
are retrieval scores, not a guarantee that an answer is correct.

------------------------------------------------------------------------

## 11. API endpoints

All API routes use the `/api/v1` prefix.

### Health

  Method   Endpoint           Purpose
  -------- ------------------ ----------------------
  GET      `/api/v1/health`   Check backend health

### Authentication

  Method   Endpoint                  Purpose
  -------- ------------------------- --------------------------------------
  POST     `/api/v1/auth/register`   Register a user
  POST     `/api/v1/auth/login`      Authenticate and obtain a token
  GET      `/api/v1/auth/me`         Get the authenticated user's profile

### Documents

  ------------------------------------------------------------------------------------------
  Method                  Endpoint                                   Purpose
  ----------------------- ------------------------------------------ -----------------------
  POST                    `/api/v1/documents/upload`                 Upload and process a
                                                                     PDF

  GET                     `/api/v1/documents`                        List the authenticated
                                                                     user's documents

  GET                     `/api/v1/documents/{document_id}`          Get document details

  GET                     `/api/v1/documents/{document_id}/pages`    Get extracted page text

  POST                    `/api/v1/documents/{document_id}/index`    Create chunks and
                                                                     embeddings

  GET                     `/api/v1/documents/{document_id}/chunks`   List indexed chunks

  DELETE                  `/api/v1/documents/{document_id}`          Delete a document and
                                                                     its associated data
  ------------------------------------------------------------------------------------------

### Semantic search

  ---------------------------------------------------------------------------
  Method                  Endpoint                    Purpose
  ----------------------- --------------------------- -----------------------
  POST                    `/api/v1/search/semantic`   Search indexed document
                                                      chunks by meaning

  ---------------------------------------------------------------------------

Example request body:

``` json
{
  "query": "What are the employee leave rules?",
  "document_id": null,
  "top_k": 5
}
```

Use the exact request schema shown in `/docs` if the backend schema
differs.

### Question answering

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  POST                    `/api/v1/qa/ask`        Retrieve relevant
                                                  chunks and generate an
                                                  answer with Gemini

  -----------------------------------------------------------------------

Example request body:

``` json
{
  "question": "What are the employee leave rules?",
  "document_id": null,
  "top_k": 5
}
```

The endpoint requires a valid authentication token.

------------------------------------------------------------------------

## 12. Authentication and user data isolation

Protected endpoints use JWT authentication. The frontend stores the
access token in browser `sessionStorage` under:

``` text
access_token
```

The Axios client sends it as:

``` text
Authorization: Bearer <access_token>
```

Document listing, retrieval, indexing, semantic search, and question
answering should operate only on data belonging to the authenticated
user. The QA retrieval query filters chunks using the current user's ID.

Opening a protected API URL directly in the browser address bar may
return:

``` json
{
  "detail": "Invalid or missing authentication token"
}
```

This is expected when the browser request does not include the required
Bearer token.

------------------------------------------------------------------------

## 13. Important configuration and implementation details

### Embedding dimensions

The selected Sentence Transformers model:

``` text
sentence-transformers/all-MiniLM-L6-v2
```

produces 384-dimensional embeddings. The pgvector database column is
configured as:

``` python
Vector(384)
```

Do not change the embedding model to one with a different vector size
without updating the database column and rebuilding the stored
embeddings.

### Chunking

The current chunking configuration is approximately:

-   Chunk size: 900 characters
-   Overlap: 150 characters
-   Page-aware chunking: enabled

Overlap helps preserve context across chunk boundaries.

### Similarity

The semantic retrieval implementation uses cosine distance. A smaller
cosine distance means a closer vector match. The UI's similarity
percentage is a display score derived from:

``` python
similarity = 1.0 - cosine_distance
```

It should be treated as an approximate retrieval score, not a
probability or factual confidence score.

### Gemini

The Gemini service uses the `google-genai` Python SDK. The model is
configured through `GEMINI_MODEL` in the backend `.env`.

If a model becomes unavailable to the API key or project, select a model
currently supported by that project and update the environment variable.
Restart the backend after changing `.env`.

------------------------------------------------------------------------

## 14. Troubleshooting

### Backend does not start

Check that the virtual environment is activated and dependencies are
installed:

``` powershell
cd E:\Projects\AI-Document-Intelligence\backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Check the Python import or configuration error printed by Uvicorn.

### Database connection error

-   Confirm PostgreSQL is running.
-   Verify the database exists.
-   Verify the username, password, host, port, and database name in
    `DATABASE_URL`.
-   Confirm migrations have been applied:

``` powershell
alembic upgrade head
```

### `vector` extension or vector type error

Connect to the correct database and run:

``` sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify that the pgvector extension is installed for the PostgreSQL
server instance used by the application.

### CORS error

The FastAPI CORS configuration must allow the frontend origins:

``` text
http://localhost:5173
http://127.0.0.1:5173
```

If the frontend runs on a different port or host, update the backend
CORS configuration accordingly. Restart FastAPI after changing it.

### 401 Unauthorized

-   Sign in again.
-   Check that `sessionStorage` contains `access_token`.
-   Confirm `src/api/client.ts` reads the same key.
-   Confirm protected requests include the Bearer token.

### Semantic search returns no results

-   Confirm the PDF uploaded successfully.
-   Confirm the document was indexed.
-   Confirm chunks exist for that document.
-   Confirm the signed-in user owns the document.
-   Check the backend database and embedding errors.

### Gemini returns 404 / model not found

A model name may not be available to the API key or project. Check the
provider's current model availability and set a supported value in:

``` env
GEMINI_MODEL=YOUR_AVAILABLE_GEMINI_MODEL
```

Restart FastAPI after changing `.env`.

### Gemini returns 429

This commonly indicates a quota or rate-limit issue. Check the API
project's usage and quota, then retry according to the provider's
limits.

### Question Answering stays on "Gemini is analyzing your documents"

Open browser Developer Tools:

1.  Select **Network**.
2.  Select **Fetch/XHR**.
3.  Submit a question.
4.  Inspect `POST /api/v1/qa/ask`.
5.  Check whether it is Pending, successful, or failed.

Also inspect the backend terminal. Useful diagnostic log stages are:

``` text
[QA] Request started
[QA] Generating question embedding...
[QA] Embedding completed ...
[QA] Retrieving document chunks from PostgreSQL...
[QA] Retrieved ... chunks ...
[QA] Sending request to Gemini...
[QA] Gemini completed ...
```

Interpretation:

-   Stops during embedding: investigate model loading or embedding
    generation.
-   Stops during retrieval: investigate the database query or database
    connection.
-   Stops after sending to Gemini: investigate Gemini connectivity,
    model availability, provider response time, or quota.
-   Backend returns 200 but UI remains loading: inspect the React
    loading-state handling. Use `finally` to reset loading state.

Example frontend pattern:

``` tsx
setIsLoading(true);

try {
  const result = await askDocuments(payload);
  setAnswer(result);
} catch (error) {
  console.error(error);
  setError("Unable to generate an answer.");
} finally {
  setIsLoading(false);
}
```

### Hugging Face unauthenticated warning

A message warning that requests to the Hugging Face Hub are
unauthenticated is not automatically a failure. It indicates that no
Hugging Face token is configured for Hub requests. The model may still
load and run. Configure a token only if needed for higher Hub rate
limits or access to gated resources. Never put a token in frontend code.

------------------------------------------------------------------------

## 15. Security and operational notes

Before using the application with real company or customer documents:

-   Keep API keys, database passwords, and JWT secrets out of source
    control.
-   Use HTTPS in production.
-   Configure production CORS origins explicitly.
-   Add request-size limits and appropriate file validation.
-   Consider malware scanning and PDF parsing safeguards.
-   Add rate limits to expensive AI endpoints.
-   Configure provider timeouts and controlled retries.
-   Avoid logging document contents, passwords, tokens, or API keys.
-   Review data retention and deletion requirements.
-   Ensure document and chunk access is restricted to the document
    owner.
-   Review Gemini provider data-handling and privacy terms before
    sending confidential documents to the API.

This project currently focuses on PDF text extraction.
Scanned/image-only PDFs may require OCR before their content can be
searched.

------------------------------------------------------------------------

## 16. Potential future improvements

Possible extensions include:

-   OCR support for scanned PDFs.
-   Support for DOCX, TXT, and other document formats.
-   Streaming answers so the UI can display generated text
    progressively.
-   Conversation history and follow-up questions.
-   Better document-level filtering and metadata filters.
-   Hybrid search combining keyword and vector search.
-   Reranking retrieved passages for improved relevance.
-   Background indexing jobs for large PDFs.
-   Document preview with highlighted source passages.
-   Admin dashboard, usage analytics, and audit logs.
-   Docker Compose deployment.
-   Automated backend and frontend tests.
-   Production deployment with monitoring and structured logging.

------------------------------------------------------------------------

## 17. Interview explanation

**Short project description:**

> I developed an AI Document Intelligence System using Python, FastAPI,
> React, PostgreSQL, pgvector, Sentence Transformers, and Google's
> Gemini API. It allows authenticated users to upload PDF documents,
> index their contents, perform semantic searches, and ask
> natural-language questions. I implemented a RAG pipeline that extracts
> PDF text, splits it into overlapping chunks, generates vector
> embeddings, retrieves relevant passages using cosine similarity, and
> sends the retrieved context to Gemini to generate answers with source
> references.

**How to explain the RAG workflow:**

> When a user uploads a PDF, the backend extracts its text and stores
> the page content. During indexing, the text is split into chunks and
> converted into 384-dimensional embeddings using Sentence Transformers.
> These vectors are stored in PostgreSQL using pgvector. When a user
> asks a question, the application embeds the question, retrieves the
> most relevant chunks using cosine similarity, and passes those chunks
> as context to Gemini. Gemini generates an answer based on that
> context, and the API returns the answer along with source metadata.

**Important distinction:** Semantic search retrieves relevant passages.
RAG combines retrieval with LLM-based answer generation. They are
related but separate capabilities in this application.

------------------------------------------------------------------------

## 18. Useful commands quick reference

### Backend

``` powershell
cd E:\Projects\AI-Document-Intelligence\backend

# Activate environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Start FastAPI
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

``` powershell
cd E:\Projects\AI-Document-Intelligence\frontend

# Install dependencies
npm install

# Start React/Vite
npm run dev

# Create production build
npm run build
```

### PostgreSQL

``` sql
CREATE DATABASE ai_document_db;

-- Run after connecting to ai_document_db:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Local URLs

  Service           URL
  ----------------- -------------------------------------
  React frontend    http://localhost:5173
  FastAPI backend   http://127.0.0.1:8000
  Swagger docs      http://127.0.0.1:8000/docs
  Health check      http://127.0.0.1:8000/api/v1/health

------------------------------------------------------------------------

## 19. License and project usage

Add a license file before distributing the project publicly. Confirm the
licenses and terms for the Python packages, embedding model, Gemini API,
and any other third-party services used.

**End of README**
