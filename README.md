# 📊 FinExtract AI

### Stop copying data from PDFs. Start analyzing it.

FinExtract AI is a tool designed to extract structured financial data from corporate PDF reports.

It identifies the Income Statement from documents such as annual reports, quarterly earnings releases, and statutory filings, standardizes financial accounts, and prepares the data for financial modeling.

---

## 🌟 Features

* **Context-Based Extraction**
  Uses Gemini Flash to understand financial document structure and extract relevant tables accurately.

* **Account Standardization**
  Maps variations like “Revenue from Operations”, “Net Sales”, or “Total Turnover” into standardized categories.

* **Multi-Year Detection**
  Automatically separates current and prior period columns.

* **Batch Processing**
  Supports processing multiple PDF files in parallel.

* **Export Options**
  * Wide-format CSV for Excel
  * Long-format Master CSV for database or Python workflows

* **Missing Data Alerts**
  Flags missing financial components for verification.

---

## 🚀 How to Run the Project

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Setup Environment Variables

The application expects an API key to be available in the environment. Create a `.env` file in the root directory and add your Google Gemini API key:

```
API_KEY=your_api_key_here
```

### 3️⃣ Start the Development Server

```bash
npm run dev
```

The application will be accessible via the local development server URL provided in your terminal (typically `http://localhost:5173`).

---

## 🔑 API Key Setup

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Generate a Gemini API key.
3. Copy the key.
4. Paste it inside the `.env` file as shown above.
5. Restart the development server after adding the key.

⚠️ **Security Note:** Do not commit your `.env` file to version control (GitHub/GitLab).

---

## 🧠 Design Choices & Engineering Rationale

While building FinExtract AI, I had to make several practical decisions about how financial data should be extracted and validated. Below is a clear explanation of those choices.

### How are line items extracted from unstructured text?
Financial reports are rarely clean or consistent. Instead of relying only on pattern matching, I used a hybrid approach. The LLM (Gemini Flash) is responsible for understanding the structure of the document and identifying the Income Statement contextually. After extraction, the output is validated against a strict JSON schema. If the structure does not match expectations, it is rejected instead of being accepted blindly. This balance allows flexibility while preventing fabricated structure.

### What if different documents use different line item names?
Companies rarely use identical terminology. For example, one report may say “Operating Costs” while another says “Operating Expenses”. Instead of matching exact words, the system relies on semantic understanding. The model interprets the meaning of each line item within the context of an Income Statement and maps similar concepts to standardized categories. This ensures consistency across companies without hardcoding rules for every variation.

### What happens if a document does not contain all expected line items?
Some reports may omit certain breakdowns. When this happens, the system does not invent values. Missing items are clearly flagged, and empty fields are preserved in the export. The goal is transparency. If the data is not present in the source document, it will not appear in the output.

### How are numeric values extracted reliably without hallucination?
To prevent hallucination:
- The model is instructed to extract only numbers directly visible in tables.
- No calculated or derived values are generated.
- Strict schema validation ensures structured output.
- If a value is unclear or ambiguous, it is left blank instead of guessed.
Accuracy is prioritized over completeness.

### How does the system detect currency and units?
Financial reports often specify units such as “in Millions” or “in Thousands” near the header. The system scans surrounding context for currency indicators (USD, INR, etc.) and unit scale. This metadata is stored alongside the extracted data so analysts understand the magnitude correctly.

### What if the document contains multiple years of data?
If multiple years or periods are present, all detected columns are extracted. Each year is preserved separately, allowing for multi-year comparison, trend analysis, and flexible export formats. No columns are discarded.

### How is missing or ambiguous data shown in Excel exports?
In the exported CSV, missing values remain blank or marked as NULL. Ambiguous fields are not silently filled. Any structural gaps are visible to the analyst. The intention is to make potential data issues obvious rather than hidden.

---

## 🛠 Technology Stack

* **Frontend:** React 19
* **Styling:** Tailwind CSS
* **AI Engine:** Google Gemini 3 Flash
* **Safety:** JSON Schema enforcement for structured output
* **Concurrency:** Parallel promise-based processing queue

---

## 🔒 Privacy

* Files are processed locally and streamed to the API; they are not stored permanently on any server.
* Data exists only within the active browser session.
* Per Google's enterprise terms, API data is typically not used for training global models.

---

*Built using React and Google Gemini.*