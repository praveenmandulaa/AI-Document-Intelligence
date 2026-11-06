
import pymupdf


class PDFProcessingError(Exception):
    pass


MAX_PAGES = 200


def extract_pdf_pages(
    pdf_bytes: bytes,
) -> list[dict]:
    try:
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as pdf:
            if pdf.needs_pass:
                raise PDFProcessingError(
                    "Password-protected PDFs are not supported"
                )

            if pdf.page_count == 0:
                raise PDFProcessingError(
                    "The PDF contains no pages"
                )

            if pdf.page_count > MAX_PAGES:
                raise PDFProcessingError(
                    f"PDF cannot exceed {MAX_PAGES} pages"
                )

            pages = []

            for index, page in enumerate(pdf):
                text = page.get_text("text", sort=True)

                pages.append(
                    {
                        "page_number": index + 1,
                        "text_content": text.strip(),
                    }
                )

            return pages

    except PDFProcessingError:
        raise

    except (pymupdf.FileDataError, ValueError) as exc:
        raise PDFProcessingError(
            "Invalid or corrupted PDF file"
        ) from exc
