import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface Job {
  id?: string;
  jobId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  filePath?: string;
  createdAt: any;
  updatedAt: any;
}

const COLLECTION_PATH = 'jobs';

export const subscribeToJobs = (userId: string, callback: (jobs: Job[]) => void) => {
  const q = query(
    collection(db, COLLECTION_PATH),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Job));
    callback(jobs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
  });
};

export const uploadGeneticDataAndCreateJob = async (
  file: File, 
  description: string, 
  userId: string,
  onStageChange?: (stage: 'validating' | 'sending' | 'processing' | 'completed' | 'error') => void
) => {
  try {
    // 1. Validando arquivo
    if (onStageChange) onStageChange('validating');
    
    if (!file) {
      throw new Error("Please select a file to upload.");
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv' && ext !== 'xls') {
      throw new Error("Invalid file format. Only Excel (.xlsx) and CSV (.csv) datasets are supported.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File exceeds 20MB limit. Split your data into smaller segments.");
    }

    // 2. Enviando arquivo
    if (onStageChange) onStageChange('sending');
    
    const formData = new FormData();
    formData.append('projectName', description);
    formData.append('userId', userId);
    formData.append('file', file);

    // 3. Processando análise
    // Trigger the processing indicator after a brief fraction to emulate step progress
    const processTimeout = setTimeout(() => {
      if (onStageChange) onStageChange('processing');
    }, 1500);

    console.log("Sending file to express backend api /api/upload-analysis ...");
    const response = await fetch('/api/upload-analysis', {
      method: 'POST',
      body: formData,
    });

    clearTimeout(processTimeout);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      if (onStageChange) onStageChange('error');
      throw new Error(`Expected JSON but received response: ${text.slice(0, 150)}`);
    }

    const resData = await response.json();
    if (!response.ok || !resData.success) {
      if (onStageChange) onStageChange('error');
      throw new Error(resData.message || "Failed to process the analysis run on core cloud services.");
    }

    // 4. Concluído
    if (onStageChange) onStageChange('completed');

    const jobId = resData.jobId;

    // Cache the full analytical evaluation results locally to preserve keys without breaking firestore scheme limits
    try {
      localStorage.setItem(`job_res_${jobId}`, JSON.stringify({
        fileName: file.name,
        projectName: resData.projectName,
        summary: resData.summary,
        metrics: resData.metrics,
        warnings: resData.warnings,
        kpis: resData.kpis,
        histogram: resData.histogram,
        topAnimals: resData.topAnimals,
        bottomAnimals: resData.bottomAnimals
      }));
    } catch (e) {
      console.warn("localStorage quota or write error while caching job results:", e);
    }

    console.log(`Backend generated job ${jobId} registered successfully in database and local cache.`);
    
    return {
      id: jobId,
      jobId,
      analysis: resData
    };
  } catch (error) {
    if (onStageChange) onStageChange('error');
    console.error("Pipeline discovery submission triggered an exception:", error);
    throw error;
  }
};

export const createJobWithId = async (jobId: string, userId: string, description: string) => {
  const jobData = {
    jobId,
    userId,
    status: 'pending',
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_PATH), jobData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_PATH);
  }
};

export const createJob = async (userId: string, description: string) => {
  const jobId = `ST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const jobData = {
    jobId,
    userId,
    status: 'pending',
    description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_PATH), jobData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_PATH);
  }
};
