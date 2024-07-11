/**
 * Represents an email attachment.
 */
export interface Attachment {
  /**
   * The name of the file.
   */
  fileName: string;

  /**
   * The content of the file as a Uint16Array.
   */
  context: Uint16Array;
}
