export interface UploadedMedicalFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
