import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function DropZone({ onFiles, multiple = true }: DropZoneProps) {
  const onDrop = useCallback((accepted: File[]) => {
    onFiles(accepted);
  }, [onFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/pdf": [".pdf"],
    },
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        ...styles.zone,
        ...(isDragActive ? styles.active : {}),
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p style={styles.text}>Drop the images here...</p>
      ) : (
        <p style={styles.text}>
          Drag & drop OMR sheet images here, or <strong>click to browse</strong>
          <br />
          <span style={styles.hint}>JPEG, PNG, or PDF • Max 20MB per file</span>
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    border: "2px dashed #bee3f8",
    borderRadius: 8,
    padding: "40px 24px",
    textAlign: "center",
    cursor: "pointer",
    background: "#ebf8ff",
    transition: "border-color 0.2s",
  },
  active: { borderColor: "#2b6cb0", background: "#bee3f8" },
  text: { fontSize: 14, color: "#2b6cb0", margin: 0 },
  hint: { fontSize: 12, color: "#718096" },
};
