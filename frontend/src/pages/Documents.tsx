
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import {
  FileText,
  Upload,
  RefreshCw,
  Layers,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

import api from "../api/client";

type DocumentItem = {
  id: number;
  original_filename: string;
  page_count: number;
  file_size?: number;
  created_at?: string;
};

type DocumentChunk = {
  id: number;
  document_id: number;
  chunk_index: number;
  page_number: number;
  content: string;
};

type IndexResponse = {
  document_id: number;
  chunks_created: number;
  message: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes?: number) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") return detail;

    if (error.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (error.response?.status === 413) {
      return "The PDF exceeds the upload size limit.";
    }

    if (error.response?.status === 422) {
      return "The PDF could not be processed. Check the file.";
    }
  }

  return fallback;
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<number | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await api.get("/documents");
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.documents)
            ? data.documents
            : null;

      if (!items) {
        throw new Error("Unexpected documents response");
      }

      setDocuments(items);
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to load documents from the backend."
        ),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setNotice(null);

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setNotice({
        type: "error",
        message: "Only PDF files are supported.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setNotice({
        type: "error",
        message: "The maximum PDF file size is 10 MB.",
      });
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      await api.post("/documents/upload", formData);

      setNotice({
        type: "success",
        message: `${file.name} uploaded successfully.`,
      });

      await loadDocuments();
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "PDF upload failed."),
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleIndex(document: DocumentItem) {
    setBusyDocumentId(document.id);
    setNotice(null);

    try {
      const response = await api.post<IndexResponse>(
        `/documents/${document.id}/index`
      );

      setNotice({
        type: "success",
        message:
          `${document.original_filename} indexed successfully. ` +
          `${response.data.chunks_created} chunks created.`,
      });

      if (selectedDocument?.id === document.id) {
        await loadChunks(document);
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Document indexing failed."
        ),
      });
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function loadChunks(document: DocumentItem) {
    setSelectedDocument(document);
    setChunks([]);
    setLoadingChunks(true);

    try {
      const response = await api.get<DocumentChunk[]>(
        `/documents/${document.id}/chunks`
      );

      setChunks(response.data);
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to load document chunks."
        ),
      });
    } finally {
      setLoadingChunks(false);
    }
  }

  async function handleDelete(document: DocumentItem) {
    const confirmed = window.confirm(
      `Permanently delete "${document.original_filename}"?`
    );

    if (!confirmed) return;

    setBusyDocumentId(document.id);
    setNotice(null);

    try {
      await api.delete(`/documents/${document.id}`);

      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
        setChunks([]);
      }

      setNotice({
        type: "success",
        message: "Document deleted successfully.",
      });

      await loadDocuments();
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to delete the document."
        ),
      });
    } finally {
      setBusyDocumentId(null);
    }
  }

  return (
    <div className="dashboard documents-page">
      <div className="page-heading">
        <div>
          <h1>Documents</h1>
          <p>
            Upload, manage and index your PDFs for AI-powered search.
          </p>
        </div>

        <button
          className="primary-link"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={18} />
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={handleUpload}
        />
      </div>

      {notice && (
        <div className={`notice notice-${notice.type}`}>
          {notice.type === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <AlertCircle size={19} />
          )}
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="content-card">
        <div className="documents-header">
          <div>
            <h2>Document Library</h2>
            <p>{documents.length} uploaded documents</p>
          </div>

          <button
            className="secondary-button"
            onClick={() => void loadDocuments()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="muted-text">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="empty-documents">
            <FileText size={42} />
            <h3>No documents yet</h3>
            <p>Upload a PDF to start building your document library.</p>
          </div>
        ) : (
          <div className="document-list">
            {documents.map((document) => (
              <div className="document-item" key={document.id}>
                <div className="document-icon">
                  <FileText size={23} />
                </div>

                <div className="document-details">
                  <strong>{document.original_filename}</strong>

                  <div className="document-meta">
                    <span>{document.page_count ?? 0} pages</span>
                    <span>{formatFileSize(document.file_size)}</span>
                    <span>Document #{document.id}</span>
                  </div>
                </div>

                <div className="document-actions">
                  <button
                    className="action-button action-primary"
                    disabled={busyDocumentId !== null}
                    onClick={() => void handleIndex(document)}
                  >
                    <RefreshCw size={15} />
                    {busyDocumentId === document.id
                      ? "Processing..."
                      : "Index / Reindex"}
                  </button>

                  <button
                    className="action-button"
                    onClick={() => void loadChunks(document)}
                    disabled={busyDocumentId !== null}
                  >
                    <Layers size={15} />
                    View Chunks
                  </button>

                  <button
                    className="action-button action-danger"
                    onClick={() => void handleDelete(document)}
                    disabled={busyDocumentId !== null}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDocument && (
        <div className="content-card chunks-card">
          <div className="documents-header">
            <div>
              <h2>Indexed Chunks</h2>
              <p>{selectedDocument.original_filename}</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => {
                setSelectedDocument(null);
                setChunks([]);
              }}
            >
              <X size={16} />
              Close
            </button>
          </div>

          {loadingChunks ? (
            <p className="muted-text">Loading chunks...</p>
          ) : chunks.length === 0 ? (
            <p className="muted-text">
              No indexed chunks found. Click Index / Reindex first.
            </p>
          ) : (
            <div className="chunks-list">
              <p className="muted-text">
                {chunks.length} indexed chunks
              </p>

              {chunks.map((chunk) => (
                <div className="chunk-item" key={chunk.id}>
                  <div className="chunk-heading">
                    <strong>Chunk #{chunk.chunk_index + 1}</strong>
                    <span>Page {chunk.page_number}</span>
                  </div>

                  <p>{chunk.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
