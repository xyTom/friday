export interface ExtendedFileInfo extends FileInfo {
  size?: number;
  modificationTime?: number;
}

interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
} 