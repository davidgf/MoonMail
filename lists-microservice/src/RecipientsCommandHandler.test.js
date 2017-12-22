import './lib/specHelper';

import { importRecipientsCsvFromS3 } from './RecipientsCommandHandler';
import * as s3Event from './fixtures/importRecipientsEvent.json';

describe('Recipients', () => {
  describe('importRecipientsCsvFromS3', () => {
    it('', () => {
      importRecipientsCsvFromS3(s3Event, {}, (err, data) => {
        expect(data).to.exist;
      });
    });
  });
});
