import { readFileSync } from "fs";
import { AutoApi } from "../src/auto-api.ts";
import { EmailAddressResponse } from "../src/dto.ts";

import { EmailHelper } from "../src/email-helper.ts";
import { AddressObject } from "mailparser";

jest.mock('../src/auto-api.ts', () => {
    return {
      AutoApi: jest.fn().mockImplementation(() => {
        return {
            getEmailAddress: function(addr: string): Promise<{data: EmailAddressResponse }> {
                return Promise.resolve({
                    data: { emailAddress: addr },
                    status: 200,
                    statusText: 'Ok',
                  });
            },
            getEmailContent: function (): Promise<{ data: Buffer }> {
            return Promise.resolve({
              data: readFileSync('./test/resources/example.eml'),
              status: 200,
              statusText: 'Ok',
            });
          },
        };
      }),
    };
  });

describe('email tests', () => {

    it('should parse the email correctly', async () => {
        var emailHelper = new EmailHelper(new AutoApi({      
            baseUrl: 'http://example.com',
            apiKey: 'apiKey',
            productId: -1,
        }));
        var inbox = await emailHelper.getInbox("email-address-prefix");
        var email = await inbox.getEmail();
        expect(email.from?.text).toBe("from@example.com");
        expect((<AddressObject> email.to)?.text).toBe("to@example.com");

        // One Attachment
        expect(email.attachments.length).toBe(1);
        expect(email.attachments[0].filename).toBe("cat.jpg");
    }) 
})