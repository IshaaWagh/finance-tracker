import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";
import { parseReceiptText } from "@/lib/receipt-parser";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/lib/finance-types";

interface ReceiptScannerProps {
  onConfirm: (data: { description: string; amount: number; category: ExpenseCategory }) => void;
}

export function ReceiptScanner({ onConfirm }: ReceiptScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [rawText, setRawText] = useState("");

  async function handleFile(file: File) {
    setError(null);
    setScanning(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // Loaded dynamically so the ~2MB OCR engine only downloads when used.
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "eng");
      const parsed = parseReceiptText(data.text);

      setRawText(data.text);
      setMerchant(parsed.merchant ?? "");
      setAmount(parsed.amount !== null ? String(parsed.amount) : "");
      setCategory("Other");
      setReviewOpen(true);
    } catch (err) {
      setError("Couldn't read that receipt. Try a clearer photo, or enter the expense manually.");
    } finally {
      setScanning(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleConfirm() {
    const parsedAmount = parseFloat(amount);
    if (!merchant.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    onConfirm({ description: merchant.trim(), amount: parsedAmount, category });
    setReviewOpen(false);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading receipt…
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Scan a receipt
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Scanned Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-40 w-full rounded-lg border border-border object-contain"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Could not detect — enter manually"
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Could not detect — enter manually"
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {rawText && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">Raw OCR text</summary>
                <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-2">
                  {rawText}
                </pre>
              </details>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add Expense
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
