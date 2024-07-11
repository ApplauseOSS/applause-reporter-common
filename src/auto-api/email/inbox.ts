import { AutoApi } from '../auto-api.ts';
import { ParsedMail, simpleParser } from 'mailparser';

/**
 * Represents an email inbox.
 */
export class Inbox {
  /**
   * Creates an instance of Inbox.
   * @param emailAddress - The email address associated with the inbox.
   * @param autoApi - An instance of the AutoApi class.
   */
  constructor(
    public readonly emailAddress: string,
    private autoApi: AutoApi
  ) {}

  /**
   * Retrieves the content of an email from the inbox.
   * @returns A Promise that resolves to the parsed email content.
   */
  async getEmail(): Promise<ParsedMail> {
    const res = await this.autoApi.getEmailContent({
      emailAddress: this.emailAddress,
    });
    return await simpleParser(res.data);
  }
}
