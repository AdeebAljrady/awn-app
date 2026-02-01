import { createClient } from "@/lib/supabase/client";
import { useCallback, useMemo, useState } from "react";
import {
  type FileError,
  type FileRejection,
  useDropzone,
} from "react-dropzone";

const supabase = createClient();

/**
 * Sanitize file name for Supabase Storage
 * Replaces non-ASCII characters with a timestamp-based unique identifier
 * but keeps the original extension
 */
const sanitizeFileName = (fileName: string): string => {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';
  const nameWithoutExtension = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  
  // Check if the file name contains non-ASCII characters
  const hasNonASCII = /[^\x00-\x7F]/.test(nameWithoutExtension);
  
  if (hasNonASCII) {
    // Generate a unique identifier using timestamp + random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `file_${timestamp}_${randomStr}${extension}`;
  }
  
  // Replace spaces with underscores and remove problematic characters
  return fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
};

interface FileWithPreview extends File {
  preview?: string;
  errors: readonly FileError[];
}

type UseSupabaseUploadOptions = {
  /**
   * Name of bucket to upload files to in your Supabase project
   */
  bucketName: string;
  /**
   * Folder to upload files to in the specified bucket within your Supabase project.
   *
   * Defaults to uploading files to the root of the bucket
   *
   * e.g If specified path is `test`, your file will be uploaded as `test/file_name`
   */
  path?: string;
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   *
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[];
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number;
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number;
  /**
   * The number of seconds the asset is cached in the browser and in the Supabase CDN.
   *
   * This is set in the Cache-Control: max-age=<seconds> header. Defaults to 3600 seconds.
   */
  cacheControl?: number;
  /**
   * When set to true, the file is overwritten if it exists.
   *
   * When set to false, an error is thrown if the object already exists. Defaults to `false`
   */
  upsert?: boolean;
  /**
   * Callback function called after successful upload with the public URL
   */
  onUploadSuccess?: (url: string, fileName: string, storagePath: string) => void;
};

type UseSupabaseUploadReturn = ReturnType<typeof useSupabaseUpload>;

const useSupabaseUpload = (options: UseSupabaseUploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    cacheControl = 3600,
    upsert = false,
    onUploadSuccess,
  } = options;

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false;
    }
    if (errors.length === 0 && successes.length === files.length) {
      return true;
    }
    return false;
  }, [errors.length, successes.length, files.length]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          (file as FileWithPreview).preview = URL.createObjectURL(file);
          (file as FileWithPreview).errors = [];
          return file as FileWithPreview;
        });

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        (file as FileWithPreview).preview = URL.createObjectURL(file);
        (file as FileWithPreview).errors = errors;
        return file as FileWithPreview;
      });

      const newFiles = [...files, ...validFiles, ...invalidFiles];

      // Remove 'too-many-files' error if files count is within limit
      const cleanedFiles =
        newFiles.length <= maxFiles
          ? newFiles.map((file) => {
              if (file.errors.some((e) => e.code === "too-many-files")) {
                return {
                  ...file,
                  errors: file.errors.filter(
                    (e) => e.code !== "too-many-files"
                  ),
                };
              }
              return file;
            })
          : newFiles;

      setFiles(cleanedFiles);
      // Clear errors when files array becomes empty
      if (cleanedFiles.length === 0 && errors.length > 0) {
        setErrors([]);
      }
    },
    [files, maxFiles, errors, setFiles, setErrors]
  );

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: false,
    accept: allowedMimeTypes.reduce(
      (acc, type) => {
        if (type === "application/pdf") {
          return { ...acc, [type]: [".pdf", ".PDF"] };
        }
        return { ...acc, [type]: [] };
      },
      {}
    ),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  });

  const onUpload = useCallback(async () => {
    setLoading(true);

    // [Joshen] This is to support handling partial successes
    // If any files didn't upload for any reason, hitting "Upload" again will only upload the files that had errors
    const filesWithErrors = errors.map((x) => x.name);
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files;

    // Get current user for path
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const uploadPath = path || user?.id || "";

    const responses = await Promise.all(
      filesToUpload.map(async (file) => {
        const sanitizedName = sanitizeFileName(file.name);
        const filePath = uploadPath ? `${uploadPath}/${sanitizedName}` : sanitizedName;
        
        // Create a new File object with the sanitized name to avoid issues with non-ASCII characters in headers
        const cleanFile = new File([file], sanitizedName, { type: file.type });
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, cleanFile, {
            cacheControl: cacheControl.toString(),
            upsert,
          });
        if (error) {
          return { name: file.name, storagePath: null, message: error.message, url: null };
        } else {
          // Get signed URL valid for 1 hour (3600 seconds)
          const { data: urlData, error: signedError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(data.path, 3600);
          
          if (signedError || !urlData?.signedUrl) {
            return { name: file.name, storagePath: null, message: "Failed to create signed URL", url: null };
          }
          
          return {
            name: file.name,
            storagePath: sanitizedName, // The actual path in storage (without user_id prefix)
            message: undefined,
            url: urlData.signedUrl,
          };
        }
      })
    );

    const responseErrors = responses.filter((x) => x.message !== undefined);
    // if there were errors previously, this function tried to upload the files again so we should clear/overwrite the existing errors.
    setErrors(responseErrors);

    const responseSuccesses = responses.filter((x) => x.message === undefined);
    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x) => x.name)])
    );
    setSuccesses(newSuccesses);

    // Call success callback for each uploaded file
    responseSuccesses.forEach((r) => {
      if (r.url && r.storagePath && onUploadSuccess) {
        onUploadSuccess(r.url, r.name, r.storagePath);
      }
    });

    setLoading(false);
  }, [
    files,
    path,
    bucketName,
    errors,
    successes,
    cacheControl,
    upsert,
    setLoading,
    setErrors,
    setSuccesses,
    onUploadSuccess,
  ]);

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  };
};

export {
  useSupabaseUpload,
  type UseSupabaseUploadOptions,
  type UseSupabaseUploadReturn,
};
