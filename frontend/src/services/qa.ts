
import api from "../api/client";

export interface AskRequest {
  question: string;
  document_id?: number | null;
  top_k: number;
}

export interface QASource {
  source_label: string;
  document_id: number;
  filename: string;
  page_number: number;
  chunk_index: number;
  similarity: number;
  content: string;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: QASource[];
  model: string;
}

export async function askDocuments(
  payload: AskRequest
): Promise<AskResponse> {
  try {
    const response = await api.post<AskResponse>(
      "/qa/ask",
      payload
    );

    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.detail ||
      error.message ||
      "Unable to generate an answer. Please try again.";

    throw new Error(message);
  }
}
