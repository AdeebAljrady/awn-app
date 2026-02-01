import { useEffect, useState } from "react";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { createClient } from "@/lib/supabase/client";

/**
 * Custom hook for configuring Uppy with Supabase authentication and TUS resumable uploads
 * @param {Object} options - Configuration options for the Uppy instance.
 * @param {string} options.bucketName - The bucket name in Supabase where files are stored.
 * @returns {Object} uppy - Uppy instance with configured upload settings.
 */
export const useUppy = ({ bucketName }: { bucketName: string }) => {
  const [uppy] = useState(() => new Uppy({
    autoProceed: false, // Disable autoProceed to ensure metadata is set before upload
    restrictions: {
      maxNumberOfFiles: 1,
//      allowedFileTypes: ['.pdf', 'application/pdf'],
allowedFileTypes: [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]
    }
  }));

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Function to configure Uppy once we have a session
    const configureUppy = (session: any) => {
      if (!session || !session.user || !mounted) return;
      const userId = session.user.id;

      const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0]?.split("//")[1];

      if (!projectId) {
        console.error("Could not determine Supabase Project ID");
        return;
      }

      // Check if Tus is already added to avoid duplicates on re-renders
      if (!uppy.getPlugin("Tus")) {
        uppy.use(Tus, {
          endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024, // 6MB
          // Custom fingerprint to ensure uniqueness per upload attempt
          fingerprint: (fileObject, options) => {
             const file = fileObject as any;
             const uniquePath = file.meta?.objectName || file.id;
             return Promise.resolve(`tus-${uniquePath}-${file.size}`);
          },
          allowedMetaFields: [
            "bucketName",
            "objectName",
            "contentType",
            "cacheControl",
          ],
        });
      }

      // Configure behaviors via setOptions to capture the current userId closure
      uppy.setOptions({
        autoProceed: true,
        onBeforeFileAdded: (currentFile) => {
          const uniqueName = `${Date.now()}-${currentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const objectName = `${userId}/${uniqueName}`;

          const modifiedFile = {
            ...currentFile,
            meta: {
              ...currentFile.meta,
              bucketName,
              objectName: objectName,
              contentType: currentFile.type,
            },
          };
          
          return modifiedFile;
        },
      });

      // Remove any existing file-added listeners since we handle it in onBeforeFileAdded now
      // uppy.off("file-added") is technically not needed if we don't attach one, 
      // but good to clear if swapping strategies.
      
      setIsReady(true);
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        configureUppy(session);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        configureUppy(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [uppy, bucketName]);

  return { uppy, isReady };
};
