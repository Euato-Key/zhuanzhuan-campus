import { FileService } from '../../services/file.service';

export const UploadService = {
  async getSTSToken(type: string, userId: number) {
    return FileService.getSTSCredentials(type, userId);
  },

  async getSignedUploadUrl(type: string, userId: number, filename: string) {
    return FileService.getSignedUrl(type, userId, filename);
  },
};