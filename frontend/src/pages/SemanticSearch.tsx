
import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import {
  Search,
  FileText,
  Layers,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import api from "../api/client";

type DocumentItem = {
  id: number;
  original_filename: string;
};

type SearchResult = {
  document_id: number;
  document_name: string;
  chunk_id: number;
  page_number: number;
  content: string;
  similarity_score: number;
};

type SemanticSearchResponse = {
  query: string;
  results: SearchResult[];
};

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Semantic search failed. Please try again.";
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export default function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [topK, setTopK] = useState(5);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await api.get("/documents");
        const data = response.data;

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.documents)
              ? data.documents
              : [];

        setDocuments(items);
      } catch {
        setError("Unable to load the document list.");
      } finally {
        setLoadingDocuments(false);
      }
    }

    void loadDocuments();
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setError("Please enter a search query.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setHasSearched(false);

    try {
      const payload = {
        query: query.trim(),
        document_id: documentId ? Number(documentId) : null,
        top_k: topK,
      };

      const response = await api.post<SemanticSearchResponse>(
        "/search/semantic",
        payload
      );

      setResults(response.data.results ?? []);
      setHasSearched(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard semantic-page">
      <div className="page-heading">
        <div>
          <h1>Semantic Search</h1>
          <p>
            Search your documents using natural language and AI embeddings.
          </p>
        </div>
      </div>

      <div className="content-card semantic-search-card">
        <div className="semantic-card-heading">
          <div className="semantic-heading-icon">
            <Sparkles size={23} />
          </div>

          <div>
            <h2>Search Your Knowledge Base</h2>
            <p>
              Find relevant passages from your uploaded PDF documents.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="semantic-form">
          <label htmlFor="semantic-query">Your question</label>

          <textarea
            id="semantic-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Example: What experience do I have with AWS and backend development?"
            rows={4}
            required
          />

          <div className="semantic-filters">
            <div className="semantic-field">
              <label htmlFor="document-filter">Search in</label>

              <select
                id="document-filter"
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value)}
                disabled={loadingDocuments}
              >
                <option value="">All documents</option>

                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.original_filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="semantic-field">
              <label htmlFor="top-k">Number of results</label>

              <select
                id="top-k"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="semantic-submit"
            disabled={loading || !query.trim()}
          >
            <Search size={18} />
            {loading ? "Searching documents..." : "Search Documents"}
          </button>
        </form>
      </div>

      {error && (
        <div className="semantic-error" role="alert">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {loading && (
        <div className="content-card semantic-status">
          <Layers size={25} />
          <h3>Searching your documents...</h3>
          <p>
            Generating a query embedding and finding similar text chunks.
          </p>
        </div>
      )}

      {!loading && hasSearched && (
        <div className="semantic-results">
          <div className="semantic-results-heading">
            <h2>Search Results</h2>
            <span>
              {results.length} matching passages
            </span>
          </div>

          {results.length === 0 ? (
            <div className="content-card semantic-status">
              <Search size={28} />
              <h3>No matching passages found</h3>
              <p>
                Try another query or index your PDF documents first.
              </p>
            </div>
          ) : (
            results.map((result, index) => (
              <div
                className="content-card semantic-result-card"
                key={`${result.document_id}-${result.chunk_id}-${index}`}
              >
                <div className="semantic-result-header">
                  <div className="semantic-source">
                    <div className="semantic-file-icon">
                      <FileText size={20} />
                    </div>

                    <div>
                      <strong>{result.document_name}</strong>
                      <p>
                        Page {result.page_number} · Chunk #{result.chunk_id}
                      </p>
                    </div>
                  </div>

                  <div className="semantic-score">
                    {formatScore(result.similarity_score)}
                    <span>Similarity</span>
                  </div>
                </div>

                <div className="semantic-result-content">
                  {result.content}
                </div>

                <div className="semantic-result-footer">
                  <span>Result #{index + 1}</span>
                  <span>Source: Page {result.page_number}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && !hasSearched && !error && (
        <div className="semantic-empty-state">
          <Search size={30} />
          <h3>Ready to search</h3>
          <p>
            Enter a question above to find relevant information
            in your indexed documents.
          </p>
        </div>
      )}
    </div>
  );
}
