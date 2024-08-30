import { AutoApi } from './auto-api.ts';
import { Inbox } from './email/inbox.ts';

/**
 * Helper class for managing email functionality.
 */
export class EmailHelper {
  constructor(private autoApi: AutoApi) {}

  /**
   * Retrieves the inbox for the specified email prefix.
   *
   * @param emailPrefix - The prefix used to generate the email address.
   * @returns A Promise that resolves to an Inbox object.
   */
  async getInbox(emailPrefix: string): Promise<Inbox> {
    const generatedAddress: string = (
      await this.autoApi.getEmailAddress(emailPrefix)
    ).data.emailAddress;
    return new Inbox(generatedAddress, this.autoApi);
  }
}

export * from './email/attachment.ts';
export * from './email/inbox.ts';
