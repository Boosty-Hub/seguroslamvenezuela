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
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all",
        dragging
          ? "border-primary bg-primary/8 scale-[1.01]"
          : "border-muted-foreground/25 hover:border-primary/60 hover:bg-muted/20",
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
      <div className={cn(
        "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
        dragging ? "bg-primary/15" : "bg-muted"
      )}>
        <Upload className={cn("h-6 w-6 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-sm">Arrastra archivos aquí o haz clic para seleccionar</p>
        <p className="text-xs text-muted-foreground">Máx. 50 MB por archivo</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { icon: <FileText className="h-3 w-3" />, label: "PDF · DOCX · TXT" },
          { icon: <Table className="h-3 w-3" />, label: "XLSX · CSV" },
          { icon: <ImageIcon className="h-3 w-3" />, label: "PNG · JPG" },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {icon} {label}
          </span>
        ))}
      </div>
    </label>
  );
}
