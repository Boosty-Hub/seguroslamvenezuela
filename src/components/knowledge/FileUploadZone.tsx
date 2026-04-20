import { useCallback, useState } from "react";
import { Upload, FileText, ImageIcon, Table } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = [".pdf", ".docx", ".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg", ".txt", ".md"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED_MIME.includes(f.type)
      );
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = "";
  };

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <Upload className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="font-medium">Arrastra archivos aqui o haz clic para seleccionar</p>
        <p className="text-sm text-muted-foreground mt-1">
          Soportado: PDF, DOCX, XLSX, CSV, PNG, JPG
        </p>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PDF · DOCX · TXT</span>
        <span className="flex items-center gap-1"><Table className="h-3 w-3" /> XLSX · CSV</span>
        <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> PNG · JPG</span>
      </div>
    </label>
  );
}
